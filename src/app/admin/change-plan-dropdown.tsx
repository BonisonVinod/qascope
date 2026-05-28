"use client";

import { useState, useTransition } from "react";
import { setClientPlan } from "./admin-actions";
import type { PlanName } from "@/lib/database.types";

const PLANS: { value: PlanName; label: string }[] = [
  { value: "pilot",   label: "Pilot (Free)" },
  { value: "starter", label: "Starter ($20/seat)" },
  { value: "team",    label: "Growth ($18/seat)" },
  { value: "pro",     label: "Scale ($16/seat)" },
];

export function ChangePlanDropdown({
  clientId,
  currentPlan,
  clientName,
}: {
  clientId: string;
  currentPlan: PlanName | null;
  clientName: string;
}) {
  const [selected, setSelected] = useState<PlanName>(currentPlan ?? "pilot");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    setMessage(null);
    startTransition(async () => {
      const result = await setClientPlan(clientId, selected);
      if ("error" in result) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage(`✓ Plan updated to ${selected}`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as PlanName)}
        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
        aria-label={`Change plan for ${clientName}`}
      >
        {PLANS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleChange}
        disabled={isPending || selected === (currentPlan ?? "pilot")}
        className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-rose-500 disabled:opacity-40"
      >
        {isPending ? "Saving…" : "Set"}
      </button>
      {message && (
        <span className="text-xs text-zinc-400">{message}</span>
      )}
    </div>
  );
}
