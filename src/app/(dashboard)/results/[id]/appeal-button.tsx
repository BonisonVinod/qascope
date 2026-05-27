"use client";

import { useState, useTransition } from "react";
import { submitAppeal } from "../actions";

export function AppealButton({ scoreId }: { scoreId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Please provide an appeal reason.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await submitAppeal(scoreId, notes.trim());
      if (res.ok) {
        setIsOpen(false);
        setNotes("");
      } else {
        setError(res.error ?? "Failed to submit appeal.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        title="Submit a manual appeal for this audit"
      >
        Appeal Audit
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Appeal QA Score</h2>
            <p className="mt-1.5 text-xs text-zinc-500">
              Submit this audit for review. Your team lead or supervisor will evaluate your rationale.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="appeal-notes"
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Appeal Reason / Comments
                </label>
                <textarea
                  id="appeal-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why you disagree with this score. Cite specific parts of the transcript or rubric guidelines..."
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
                    setError(null);
                  }}
                  disabled={isPending}
                  className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit Appeal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
