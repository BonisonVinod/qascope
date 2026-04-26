import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";
import { revokeInvite, changeMemberRole, changeMemberTeam } from "./actions";
import type { UserRole } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "qa_manager", label: "QA manager" },
  { value: "team_lead", label: "Team lead" },
  { value: "qa_reviewer", label: "Reviewer" },
  { value: "viewer", label: "Viewer" },
];

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("users")
    .select("id, role, client_id")
    .eq("id", user.id)
    .single();

  const canManage = me?.role === "admin" || me?.role === "qa_manager";
  const canChangeRoles = me?.role === "admin";

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Team members</h1>
        <p className="rounded-md bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950">
          Only admins and QA managers can manage team members. Ask your admin to
          invite or change roles.
        </p>
        <Link href="/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("users")
    .select("id, name, email, role, team_name, created_at")
    .eq("client_id", me!.client_id)
    .order("created_at", { ascending: true });

  const { data: invites } = await supabase
    .from("invitations")
    .select("id, email, role, team_name, token, expires_at, accepted_at, created_at")
    .eq("client_id", me!.client_id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const now = Date.now();

  return (
    <div className="space-y-10">
      <div>
        <Link href="/settings" className="text-xs text-zinc-500 hover:underline">
          ← Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Team members</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Invite teammates, set their role, and assign them to a team.
        </p>
      </div>

      <section className="max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Invite new member
          </h2>
          <Link
            href="/settings/team/bulk-upload"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Bulk upload CSV →
          </Link>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <InviteForm />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Members ({members?.length ?? 0})
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(members ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2">
                    {m.name ?? "—"}
                    {m.id === me!.id && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">{m.email}</td>
                  <td className="px-4 py-2">
                    {canChangeRoles ? (
                      <form action={changeMemberRole} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {m.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <form action={changeMemberTeam} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <input
                        name="teamName"
                        defaultValue={m.team_name ?? ""}
                        placeholder="(none)"
                        className="w-32 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invites && invites.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Pending invitations ({invites.length})
          </h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Team</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                  <th className="px-4 py-2 font-medium">Invite link</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {invites.map((inv) => {
                  const expired = new Date(inv.expires_at).getTime() <= now;
                  return (
                    <tr key={inv.id}>
                      <td className="px-4 py-2">{inv.email}</td>
                      <td className="px-4 py-2 text-zinc-500">
                        {inv.role.replace("_", " ")}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">
                        {inv.team_name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">
                        {expired ? (
                          <span className="text-red-500">Expired</span>
                        ) : (
                          new Date(inv.expires_at).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <code className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
                          /accept-invite?token={inv.token.slice(0, 12)}…
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        <form action={revokeInvite}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Revoke
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
