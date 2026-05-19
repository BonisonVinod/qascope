"use client";

/**
 * Inline forms for the Review queue table.
 *
 * Tier 1 (first reviewer):
 *   - Agree closes the item; QA score stands as final.
 *   - Disagree requires a note (free text) and a new score; routes the item
 *     to Tier 2.
 *
 * Tier 2 (second reviewer):
 *   - Confirm override: applies the Tier 1 reviewer's adjusted score and marks
 *     the score as appealed. Deny leaves the QA score unchanged.
 */

import { useActionState, useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    firstReviewerDisagree,
    undefined,
  );

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const note = window.prompt(
      "Why do you disagree with the QA score? (required — this goes to the second reviewer)",
    );
    if (note === null) return;
    const trimmed = note.trim();
    if (trimmed.length === 0) {
      window.alert("A comment is required when disagreeing.");
      return;
    }
    if (notesRef.current) notesRef.current.value = trimmed;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input ref={notesRef} type="hidden" name="notes" />
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        title="Disagree — sends this item to the second reviewer with your note"
      >
        {pending ? "..." : "Disagree"}
      </button>
      {state && state.ok === false && (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
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
  const formRef = useRef<HTMLFormElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    secondReviewerConfirm,
    undefined,
  );

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const note = window.prompt(
      "Confirm the override. Optional note for the audit trail:",
    );
    if (note === null) return;
    if (notesRef.current) notesRef.current.value = note.trim();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input ref={notesRef} type="hidden" name="notes" />
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        title="Confirm the override — score becomes final and is marked appealed"
      >
        {pending ? "..." : "Confirm override"}
      </button>
      {state && state.ok === false && (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

function DenyOverrideForm({ reviewId }: { reviewId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    secondReviewerDeny,
    undefined,
  );

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const note = window.prompt(
      "Deny the override — original QA score will stand. Optional note:",
    );
    if (note === null) return;
    if (notesRef.current) notesRef.current.value = note.trim();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input ref={notesRef} type="hidden" name="notes" />
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Deny the override — original QA score stands"
      >
        {pending ? "..." : "Deny override"}
      </button>
      {state && state.ok === false && (
        <span className="ml-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
