"use client";

import { useActionState, useState } from "react";
import { scoreUnscored, rescoreAll, type ScoreBatchState } from "./actions";

/** Approx wall-clock minutes to score N conversations. */
function estimateMinutes(n: number): number {
  // ~15s per conversation at the median (parallel criterion calls,
  // sequential across conversations). Round up — better to over-promise time.
  return Math.max(1, Math.ceil((n * 15) / 60));
}

/** Show the confirm modal when batch is at or above this size. */
const CONFIRM_THRESHOLD = 100;

type PendingMode = "unscored" | "rescore";

export function ScoreButton({
  pendingCount,
  totalConversations,
}: {
  pendingCount: number;
  /** Used for "Rescore all" copy — we tell the user how many will be rescored. */
  totalConversations?: number;
}) {
  const [state, formAction, pending] = useActionState<ScoreBatchState, FormData>(
    async (_prev, formData) => {
      const mode = formData.get("mode");
      if (mode === "rescore") return await rescoreAll();
      return await scoreUnscored();
    },
    undefined,
  );

  const [confirming, setConfirming] = useState<null | {
    mode: PendingMode;
    count: number;
  }>(null);

  function tryStart(mode: PendingMode) {
    const count =
      mode === "rescore" ? (totalConversations ?? pendingCount) : pendingCount;
    if (count >= CONFIRM_THRESHOLD) {
      setConfirming({ mode, count });
    } else {
      submitNow(mode);
    }
  }

  function submitNow(mode: PendingMode) {
    setConfirming(null);
    const fd = new FormData();
    fd.set("mode", mode);
    formAction(fd);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => tryStart("unscored")}
          disabled={pending || pendingCount <= 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending
            ? "Scoring..."
            : pendingCount > 0
              ? `Score ${pendingCount} pending`
              : "Nothing to score"}
        </button>
        <button
          type="button"
          onClick={() => tryStart("rescore")}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Rescore all
        </button>
      </div>
      {state && state.ok && (
        <p className="text-xs text-zinc-500">
          Attempted {state.attempted}, scored {state.scored}, failed {state.failed}
          {state.firstError ? ` · ${state.firstError}` : ""}
        </p>
      )}
      {state && state.ok === false && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      {confirming && (
        <ConfirmDialog
          count={confirming.count}
          mode={confirming.mode}
          onYes={() => submitNow(confirming.mode)}
          onNo={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  count,
  mode,
  onYes,
  onNo,
}: {
  count: number;
  mode: PendingMode;
  onYes: () => void;
  onNo: () => void;
}) {
  const minutes = estimateMinutes(count);
  const title = mode === "rescore" ? "Rescore everything?" : "Score this many?";
  const body =
    mode === "rescore"
      ? `You're about to wipe and re-score ${count.toLocaleString()} conversations. This may take roughly ${minutes} minute${minutes === 1 ? "" : "s"}. You can hit Stop on the progress bar at any time.`
      : `You're about to score ${count.toLocaleString()} conversations. This may take roughly ${minutes} minute${minutes === 1 ? "" : "s"}. You can hit Stop on the progress bar at any time. Continue?`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onNo}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onYes}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Yes, continue
          </button>
        </div>
      </div>
    </div>
  );
}
