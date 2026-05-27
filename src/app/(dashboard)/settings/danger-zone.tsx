"use client";

import { useActionState, useState } from "react";
import { resetWorkspace, type ResetState } from "./reset-actions";

/**
 * Settings → Danger zone → Reset workspace.
 *
 * Two-step confirmation: user must click "Reset workspace…" to open the
 * inline panel, then type RESET into a text input and click the red
 * confirm button. On success we list the row counts deleted so the user
 * can sanity-check.
 */
export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetWorkspace,
    undefined,
  );

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
        Danger zone
      </h3>
      <p className="mt-1 max-w-2xl text-xs text-red-700 dark:text-red-400">
        Reset the workspace when you want a clean slate &mdash; e.g. before
        moving from test data into production. Deletes all uploaded
        conversations, scores, review-queue items, and knowledge-base
        documents. <strong>Keeps</strong> your rubric, fatal rules, QA-engine
        credentials, team members, and billing history.
      </p>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/40"
        >
          Reset workspace&hellip;
        </button>
      )}

      {open && (
        <form action={formAction} className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-red-800 dark:text-red-300">
            Type <code className="rounded bg-red-100 px-1 font-mono text-red-900 dark:bg-red-900/40 dark:text-red-200">RESET</code> to confirm
          </label>
          <input
            name="confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            placeholder="RESET"
            className="block w-48 rounded-md border border-red-300 bg-white px-3 py-2 font-mono text-sm text-red-900 placeholder:text-red-300 dark:border-red-900 dark:bg-zinc-900 dark:text-red-100"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || confirmText !== "RESET"}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {pending ? "Resetting…" : "Yes, wipe operational data"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
              }}
              disabled={pending}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {state && state.ok === true && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <p className="font-medium">Workspace reset complete.</p>
          <ul className="mt-1 list-inside list-disc">
            {Object.entries(state.deletedCounts).map(([table, count]) => (
              <li key={table}>
                {table}: {count.toLocaleString()} row{count === 1 ? "" : "s"} removed
              </li>
            ))}
          </ul>
          <p className="mt-2">Upload a fresh CSV to start a new audit.</p>
        </div>
      )}
      {state && state.ok === false && (
        <p className="mt-4 text-xs text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
