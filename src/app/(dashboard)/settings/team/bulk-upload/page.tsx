import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BulkUploadForm } from "./bulk-upload-form";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const canManage = me?.role === "admin" || me?.role === "qa_manager";

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Bulk invite</h1>
        <p className="rounded-md bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950">
          Only admins and QA managers can bulk-invite teammates.
        </p>
        <Link
          href="/settings/team"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to team
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings/team"
          className="text-xs text-zinc-500 hover:underline"
        >
          ← Back to team
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Bulk invite teammates</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Upload a CSV with one row per teammate. Each row creates a pending
          invitation; you can copy each invite link and send it via your
          preferred channel.
        </p>
      </div>

      <section className="max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <BulkUploadForm />
      </section>

      <section className="max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          CSV format
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Required column: <code>email</code>. Optional:{" "}
          <code>role</code>, <code>team_name</code>, <code>name</code>.
          Role defaults to <code>qa_reviewer</code> if blank or unknown.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-950">
{`email,role,team_name,name
priya@example.com,team_lead,Mumbai-Tier2,Priya Iyer
karan@example.com,qa_reviewer,Bangalore-Voice,Karan Patel
meera@example.com,qa_manager,,Meera Gupta
arjun@example.com,viewer,Chennai-Chat,Arjun Nair`}
        </pre>
        <p className="mt-3 text-xs text-zinc-500">
          Allowed roles: <code>admin</code>, <code>qa_manager</code>,{" "}
          <code>team_lead</code>, <code>qa_reviewer</code>, <code>viewer</code>.
        </p>
      </section>
    </div>
  );
}
