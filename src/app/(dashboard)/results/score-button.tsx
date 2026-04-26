"use client";

import { useActionState, useState } from "react";
import { scoreUnscored, rescoreAll, type ScoreBatchState } from "./actions";

export function ScoreButton({ pendingCount }: { pendingCount: number }) {
  const [state, formAction, pending] = useActionState<ScoreBatchState, FormData>(
    async (_prev, formData) => {
      const mode = formData.get("mode");
      if (mode === "rescore") return await rescoreAll();
      return await scoreUnscored();
    },
    undefined,
  );
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <button
          type="submit"
          name="mode"
          value="unscored"
          disabled={pending || pendingCount <= 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending
            ? "Scoring..."
            : pendingCount > 0
              ? `Score ${Math.min(pendingCount, 25)} pending`
              : "Nothing to score"}
        </button>
        {showConfirm ? (
          <button
            type="submit"
            name="mode"
            value="rescore"
            disabled={pending}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
          >
            Confirm rescore all
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Rescore all
          </button>
        )}
      </form>
      {state && state.ok && (
        <p className="text-xs text-zinc-500">
          Attempted {state.attempted}, scored {state.scored}, failed {state.failed}
          {state.firstError ? ` \u00b7 ${state.firstError}` : ""}
        </p>
      )}
      {state && state.ok === false && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </div>
  );
}
