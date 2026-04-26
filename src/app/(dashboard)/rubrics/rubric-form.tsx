"use client";

import { useActionState, useMemo, useState } from "react";
import { saveRubric, type RubricActionState } from "./actions";

type Criterion = {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  critical_fail_boolean: boolean;
  sort_order: number;
};

export function RubricForm({
  rubricId,
  criteria,
}: {
  rubricId: string;
  criteria: Criterion[];
}) {
  const [state, formAction, pending] = useActionState<RubricActionState, FormData>(
    saveRubric,
    undefined,
  );

  // Local state mirrors form values so we can show a live weight total.
  const [rows, setRows] = useState<Criterion[]>(criteria);

  const totalWeight = useMemo(
    () => rows.reduce((a, b) => a + (Number.isFinite(b.weight) ? b.weight : 0), 0),
    [rows],
  );
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  function update<K extends keyof Criterion>(id: string, key: K, val: Criterion[K]) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)),
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="rubricId" value={rubricId} />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <tr>
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Criterion</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 w-24 text-right">Weight</th>
              <th className="px-3 py-2 w-20 text-center">Critical</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-3 py-3 text-zinc-500">{c.sort_order}</td>
                <td className="px-3 py-3">
                  <input
                    type="text"
                    name={`crit-${c.id}-name`}
                    value={c.name}
                    maxLength={80}
                    required
                    onChange={(e) => update(c.id, "name", e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
                <td className="px-3 py-3">
                  <textarea
                    name={`crit-${c.id}-description`}
                    value={c.description ?? ""}
                    rows={2}
                    maxLength={500}
                    onChange={(e) => update(c.id, "description", e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="Optional — short note shown next to the criterion in results."
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <input
                    type="number"
                    name={`crit-${c.id}-weight`}
                    value={c.weight}
                    min={0}
                    max={100}
                    step={1}
                    required
                    onChange={(e) =>
                      update(c.id, "weight", Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    name={`crit-${c.id}-critical`}
                    checked={c.critical_fail_boolean}
                    onChange={(e) =>
                      update(c.id, "critical_fail_boolean", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 dark:border-zinc-800">
            <tr>
              <td colSpan={3} className="px-3 py-3 text-right text-xs uppercase text-zinc-500">
                Total weight (must equal 100)
              </td>
              <td
                className={`px-3 py-3 text-right text-base font-semibold ${
                  weightOk
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {totalWeight}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !weightOk}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          title={!weightOk ? "Weights must sum to 100" : undefined}
        >
          {pending ? "Saving..." : "Save rubric"}
        </button>
        {!weightOk && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Weights total {totalWeight}, need 100.
          </span>
        )}
        {state?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {state.message}
          </span>
        )}
        {state?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Saving bumps the rubric version. Existing scored conversations keep their
        original score; new uploads will be scored against the updated rubric.
      </p>
    </form>
  );
}
