"use client";

import { useActionState, useState } from "react";
import { inviteMember, type InviteActionState } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteActionState, FormData>(
    inviteMember,
    undefined,
  );
  const [copied, setCopied] = useState(false);

  // The action returns a relative URL like /accept-invite?token=...
  // For copy-to-clipboard, prepend the current origin (browser-side only).
  const fullUrl =
    state && state.ok && state.inviteUrl
      ? typeof window !== "undefined"
        ? `${window.location.origin}${state.inviteUrl}`
        : state.inviteUrl
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="qa_reviewer"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="admin">Admin</option>
            <option value="qa_manager">QA manager</option>
            <option value="team_lead">Team lead</option>
            <option value="qa_reviewer">Reviewer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="teamName"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Team (optional)
        </label>
        <input
          id="teamName"
          name="teamName"
          placeholder="e.g. Mumbai-Tier2"
          className="mt-1 block w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Match the team_name your agents use in the CSV so dashboards roll up
          consistently.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating..." : "Create invitation"}
        </button>
        {state?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
      </div>

      {state?.ok === true && fullUrl && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            {state.message}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={fullUrl}
              className="flex-1 rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-xs dark:border-emerald-900 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(fullUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            Send this URL to the invitee via WhatsApp, Slack, or email. The
            link expires in 7 days.
          </p>
        </div>
      )}
    </form>
  );
}
