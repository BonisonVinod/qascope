"use client";

import { useActionState } from "react";
import { changePlan, type BillingActionState } from "./actions";
import type { PlanName } from "@/lib/database.types";

export function ChangePlanButton({
  plan,
  label,
}: {
  plan: PlanName;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<BillingActionState, FormData>(
    changePlan,
    undefined,
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `Switch to the ${label} plan? Your monthly limit will update immediately.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit}>
      <input type="hidden" name="plan" value={plan} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Switching..." : `Switch to ${label}`}
      </button>
      {state?.ok === false && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok === true && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
