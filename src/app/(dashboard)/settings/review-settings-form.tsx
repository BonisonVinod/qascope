"use client";

import { useActionState } from "react";
import { saveReviewSettings, type SettingsActionState } from "./actions";

export function ReviewSettingsForm({
  currentSecondReviewer,
  currentSlaHours,
  currentPassThreshold,
  currentReviewConfidenceThreshold,
  reviewers,
}: {
  currentSecondReviewer: string | null;
  currentSlaHours: number;
  currentPassThreshold: number;
  currentReviewConfidenceThreshold: number;
  reviewers: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    saveReviewSettings,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="secondReviewer"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Second reviewer
        </label>
        <select
          id="secondReviewer"
          name="secondReviewer"
          defaultValue={currentSecondReviewer ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— Not set —</option>
          {reviewers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          The person who decides on overrides escalated from the first review tier.
        </p>
      </div>

      <div>
        <label
          htmlFor="slaHours"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          SLA per tier (hours)
        </label>
        <input
          id="slaHours"
          name="slaHours"
          type="number"
          min={1}
          max={168}
          step={1}
          defaultValue={currentSlaHours}
          className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Each tier has this many hours before the queue auto-approves the item.
          Default 24h.
        </p>
      </div>

      <div>
        <label
          htmlFor="passThreshold"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Pass threshold (%)
        </label>
        <input
          id="passThreshold"
          name="passThreshold"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={currentPassThreshold}
          className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Conversations scoring below this land in the review queue with reason
          &ldquo;low score&rdquo;, even when QA confidence is high. Default 70%.
        </p>
      </div>

      <div>
        <label
          htmlFor="reviewConfidenceThreshold"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Send to review when confidence below (%)
        </label>
        <input
          id="reviewConfidenceThreshold"
          name="reviewConfidenceThreshold"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={currentReviewConfidenceThreshold}
          className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Confidence is the QA engine&rsquo;s self-rated certainty. Conversations
          below this threshold get flagged for human review. Default 70%. Stricter
          projects use 80&ndash;90; lighter projects 50&ndash;60.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {state?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {state.message}
          </span>
        )}
        {state?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
        )}
      </div>
    </form>
  );
}
