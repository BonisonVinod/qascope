"use client";

/**
 * Inline forms for the Review queue table.
 *
 * Tier 1 (first reviewer):
 *   - Agree closes the item; QA score stands as final.
 *   - Disagree requires a note (free text) and a new adjusted score; routes the item
 *     to Tier 2.
 *
 * Tier 2 (second reviewer):
 *   - Confirm override: applies the Tier 1 reviewer's adjusted score and marks
 *     the score as appealed. Deny leaves the QA score unchanged.
 */

import { useActionState, useState } from "react";
import {
  firstReviewerAgree,
  firstReviewerDisagree,
  secondReviewerConfirm,
  secondReviewerDeny,
  type ReviewActionState,
} from "./actions";

export function FirstReviewerActions({ reviewId }: { reviewId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AgreeForm reviewId={reviewId} />
      <DisagreeForm reviewId={reviewId} />
    </div>
  );
}

function AgreeForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    firstReviewerAgree,
    undefined,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        title="Agree with the QA score — closes this item"
      >
        {pending ? "..." : "Agree"}
      </button>
      {state && state.ok === false && (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

function DisagreeForm({ reviewId }: { reviewId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [adjustedScore, setAdjustedScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    firstReviewerDisagree,
    undefined,
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!notes.trim()) {
      e.preventDefault();
      setError("A justification comment is required when disagreeing.");
      return;
    }
    const scoreNum = Number(adjustedScore);
    if (adjustedScore === "" || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      e.preventDefault();
      setError("A valid proposed adjusted score (0-100) is required.");
      return;
    }
    setError(null);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setNotes("");
          setAdjustedScore("");
        }}
        disabled={pending}
        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        title="Disagree — sends this item to the second reviewer with your note and proposed score"
      >
        {pending ? "..." : "Disagree"}
      </button>

      {state && state.ok === false && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Disagree & Propose Override</h2>
            <p className="mt-1.5 text-xs text-zinc-500">
              Explain why you disagree with this QA score and specify your proposed corrected score. This will escalate to the QA manager for second review.
            </p>

            <form onSubmit={onSubmit} action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="reviewId" value={reviewId} />
              
              <div>
                <label
                  htmlFor={`disagree-score-${reviewId}`}
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Proposed New Score (0-100)
                </label>
                <input
                  id={`disagree-score-${reviewId}`}
                  name="adjustedScore"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={adjustedScore}
                  onChange={(e) => setAdjustedScore(e.target.value)}
                  placeholder="e.g. 85.5"
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label
                  htmlFor={`disagree-notes-${reviewId}`}
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Justification Comment
                </label>
                <textarea
                  id={`disagree-notes-${reviewId}`}
                  name="notes"
                  rows={4}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why you disagree with the AI QA score. Support your proposed score with specific evidence..."
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setNotes("");
                    setAdjustedScore("");
                    setError(null);
                  }}
                  className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Escalate to Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function SecondReviewerActions({ reviewId }: { reviewId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmOverrideForm reviewId={reviewId} />
      <DenyOverrideForm reviewId={reviewId} />
    </div>
  );
}

function ConfirmOverrideForm({ reviewId }: { reviewId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    secondReviewerConfirm,
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setNotes("");
        }}
        disabled={pending}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        title="Confirm the override — score will update to the first reviewer's proposed score"
      >
        {pending ? "..." : "Confirm override"}
      </button>

      {state && state.ok === false && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-emerald-850 dark:text-emerald-400">Confirm Override</h2>
            <p className="mt-1.5 text-xs text-zinc-500">
              Confirm the appeal. The AI score will be overridden with the first reviewer&rsquo;s proposed adjusted score, and marked as final. You can add an optional justification.
            </p>

            <form onSubmit={() => setIsOpen(false)} action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="reviewId" value={reviewId} />
              
              <div>
                <label
                  htmlFor={`confirm-notes-${reviewId}`}
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Justification Comment (Optional)
                </label>
                <textarea
                  id={`confirm-notes-${reviewId}`}
                  name="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any comments or justification for confirming this override..."
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setNotes("");
                  }}
                  className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function DenyOverrideForm({ reviewId }: { reviewId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    secondReviewerDeny,
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setNotes("");
        }}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Deny the override — original QA score stands"
      >
        {pending ? "..." : "Deny override"}
      </button>

      {state && state.ok === false && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Deny Override</h2>
            <p className="mt-1.5 text-xs text-zinc-500">
              Deny the appeal. The original AI QA score will stand. You can add an optional justification.
            </p>

            <form onSubmit={() => setIsOpen(false)} action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="reviewId" value={reviewId} />
              
              <div>
                <label
                  htmlFor={`deny-notes-${reviewId}`}
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Justification Comment (Optional)
                </label>
                <textarea
                  id={`deny-notes-${reviewId}`}
                  name="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any comments or justification for denying this override..."
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setNotes("");
                  }}
                  className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Deny Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
