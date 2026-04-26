import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteForm } from "./accept-invite-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string }>;

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorWrap>This invite link is missing its token.</ErrorWrap>;
  }

  // Service-role lookup so this works for not-yet-signed-up users.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invitations")
    .select("id, email, role, team_name, client_id, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <ErrorWrap>
        This invite is invalid or has been revoked. Ask the person who invited
        you to send a new link.
      </ErrorWrap>
    );
  }
  if (invite.accepted_at) {
    return (
      <ErrorWrap>
        This invite has already been accepted. <Link href="/login" className="underline">Sign in</Link> with the email it was sent to.
      </ErrorWrap>
    );
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return (
      <ErrorWrap>
        This invite has expired. Ask for a fresh one.
      </ErrorWrap>
    );
  }

  const { data: client } = await admin
    .from("clients")
    .select("name")
    .eq("id", invite.client_id)
    .single();

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">You&rsquo;re invited</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Join <strong>{client?.name ?? "your team"}</strong> on QAScope as a{" "}
          <strong>{invite.role.replace("_", " ")}</strong>
          {invite.team_name ? <> on team <strong>{invite.team_name}</strong></> : null}.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <AcceptInviteForm
          token={token}
          email={invite.email}
        />
      </div>
    </div>
  );
}

function ErrorWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 px-4">
      <h1 className="text-xl font-semibold">Invite link</h1>
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        {children}
      </p>
      <Link href="/login" className="text-sm text-blue-600 hover:underline">
        Go to sign in →
      </Link>
    </div>
  );
}
