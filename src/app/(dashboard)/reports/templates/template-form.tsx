"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createTemplate,
  updateTemplate,
  type TemplateActionState,
} from "./actions";
import {
  DEFAULT_TEMPLATE_CONFIG,
  type ReportTemplateConfig,
  type TimeWindow,
  type GroupBy,
  type Column,
  columnLabel,
} from "@/lib/reports/template-engine";
import type { ScoreStatus, ChannelType } from "@/lib/database.types";

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_week", label: "This week (Mon–Sun)" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom_days", label: "Custom (days)" },
];

const GROUP_BYS: { value: GroupBy; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "team", label: "Team" },
  { value: "channel", label: "Channel" },
  { value: "none", label: "Overall (no breakdown)" },
];

const COLUMNS: Column[] = [
  "volume",
  "avg_score",
  "fail_rate",
  "appealed_count",
  "ai_vs_final_delta",
];

const STATUSES: ScoreStatus[] = ["final", "needs_review", "critical_fail"];
const CHANNELS: ChannelType[] = ["voice_transcript", "email", "chat"];

export function TemplateForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    description: string | null;
    config: ReportTemplateConfig;
  };
}) {
  const action = mode === "create" ? createTemplate : updateTemplate;
  const [state, formAction, pending] = useActionState<
    TemplateActionState,
    FormData
  >(action, undefined);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [config, setConfig] = useState<ReportTemplateConfig>(
    initial?.config ?? DEFAULT_TEMPLATE_CONFIG,
  );

  const configJson = useMemo(() => JSON.stringify(config), [config]);

  const updateFilters = (patch: Partial<ReportTemplateConfig["filters"]>) =>
    setConfig({ ...config, filters: { ...config.filters, ...patch } });

  const toggleStatus = (s: ScoreStatus) => {
    const cur = config.filters.status ?? [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    updateFilters({ status: next.length === 0 ? undefined : next });
  };

  const toggleColumn = (col: Column) => {
    const cur = config.columns;
    const next = cur.includes(col)
      ? cur.filter((c) => c !== col)
      : [...cur, col];
    setConfig({ ...config, columns: next });
  };

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="config" value={configJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Name
          </label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Weekly compliance dig"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Description (optional)
          </label>
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <legend className="px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Time window
        </legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={config.timeWindow}
            onChange={(e) =>
              setConfig({ ...config, timeWindow: e.target.value as TimeWindow })
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {TIME_WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          {config.timeWindow === "custom_days" && (
            <input
              type="number"
              min={1}
              max={365}
              value={config.customDays ?? 30}
              onChange={(e) =>
                setConfig({
                  ...config,
                  customDays: Math.max(
                    1,
                    Math.min(365, Number(e.target.value) || 30),
                  ),
                })
              }
              className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <legend className="px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Group by
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GROUP_BYS.map((g) => (
            <label
              key={g.value}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                config.groupBy === g.value
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="radio"
                name="groupByPick"
                value={g.value}
                checked={config.groupBy === g.value}
                onChange={() => setConfig({ ...config, groupBy: g.value })}
                className="sr-only"
              />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <legend className="px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Filters
        </legend>
        <div className="mt-2 space-y-3">
          <div>
            <span className="block text-xs text-zinc-500">Status (any of)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const checked = (config.filters.status ?? []).includes(s);
                return (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      checked
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatus(s)}
                      className="sr-only"
                    />
                    {s.replace("_", " ")}
                  </label>
                );
              })}
              <span className="text-xs text-zinc-500">
                (no boxes ticked = all)
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <span className="block text-xs text-zinc-500">Min score</span>
              <input
                type="number"
                min={0}
                max={100}
                value={config.filters.minScore ?? ""}
                onChange={(e) =>
                  updateFilters({
                    minScore:
                      e.target.value === ""
                        ? undefined
                        : Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
                placeholder="—"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Max score</span>
              <input
                type="number"
                min={0}
                max={100}
                value={config.filters.maxScore ?? ""}
                onChange={(e) =>
                  updateFilters({
                    maxScore:
                      e.target.value === ""
                        ? undefined
                        : Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
                placeholder="—"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <span className="block text-xs text-zinc-500">Channel</span>
              <select
                value={config.filters.channel ?? ""}
                onChange={(e) =>
                  updateFilters({
                    channel:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as ChannelType),
                  })
                }
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Any</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs text-zinc-500">
              Team (exact match — leave blank for all)
            </span>
            <input
              value={config.filters.team ?? ""}
              onChange={(e) =>
                updateFilters({
                  team:
                    e.target.value.trim() === ""
                      ? undefined
                      : e.target.value.trim(),
                })
              }
              placeholder="e.g. Mumbai-Tier2"
              className="mt-1 w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <legend className="px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Columns
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLUMNS.map((col) => {
            const checked = config.columns.includes(col);
            return (
              <label
                key={col}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                  checked
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleColumn(col)}
                  className="sr-only"
                />
                {columnLabel(col)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <legend className="px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Sort
        </legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={config.sortBy?.column ?? "label"}
            onChange={(e) =>
              setConfig({
                ...config,
                sortBy: {
                  column: e.target.value as Column | "label",
                  direction: config.sortBy?.direction ?? "desc",
                },
              })
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="label">Label</option>
            {COLUMNS.map((c) => (
              <option key={c} value={c}>
                {columnLabel(c)}
              </option>
            ))}
          </select>
          <select
            value={config.sortBy?.direction ?? "desc"}
            onChange={(e) =>
              setConfig({
                ...config,
                sortBy: {
                  column: config.sortBy?.column ?? "label",
                  direction: e.target.value as "asc" | "desc",
                },
              })
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <span className="text-xs text-zinc-500">
            Row limit: {config.rowLimit ?? 100}
          </span>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending
            ? "Saving..."
            : mode === "create"
              ? "Save & run"
              : "Save changes"}
        </button>
        {state?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
        {state?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
