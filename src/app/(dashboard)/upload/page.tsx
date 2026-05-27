"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { uploadConversations, type UploadState } from "./actions";
import {
  autoDetectMapping,
  validateMapping,
  type ColumnMapping,
} from "@/lib/upload/column-mapping";
import type { ChannelType } from "@/lib/database.types";

type CsvSnapshot = {
  headers: string[];
  sample: Record<string, string>[];
  rowCount: number;
};

type CanonicalField = keyof Omit<ColumnMapping, "fixedChannel" | "fixedDate">;

const CANONICAL_FIELDS: { key: CanonicalField; label: string; required: boolean; hint?: string }[] = [
  { key: "agent_name", label: "Agent name", required: true },
  { key: "transcript_text", label: "Transcript text", required: true },
  { key: "channel", label: "Channel", required: true, hint: "or set a fixed value below" },
  {
    key: "conversation_date",
    label: "Conversation date",
    required: true,
    hint: "or set a fixed date below",
  },
  { key: "team_name", label: "Team name", required: false },
  { key: "customer_id", label: "Customer ID", required: false },
  { key: "conversation_id", label: "Conversation ID", required: false, hint: "auto-generated if blank" },
];

const CHANNEL_OPTIONS: ChannelType[] = ["voice_transcript", "email", "chat"];

export default function UploadPage() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadConversations,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [snapshot, setSnapshot] = useState<CsvSnapshot | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const handleFile = async (f: File | null) => {
    if (!f) {
      setFile(null);
      setSnapshot(null);
      setParseError(null);
      setMapping(null);
      return;
    }
    setFile(f);
    setParseError(null);
    const text = await f.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });
    if (parsed.errors.length > 0) {
      setSnapshot(null);
      setMapping(null);
      setParseError(
        `CSV parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row ?? "?"})`,
      );
      return;
    }
    const headers = (parsed.meta.fields ?? []).map((h) => h.toLowerCase());
    const data = parsed.data ?? [];
    const sample = data.slice(0, 3);
    setSnapshot({ headers, sample, rowCount: data.length });
    setMapping(autoDetectMapping(headers));
  };

  const validation = useMemo(
    () => (mapping ? validateMapping(mapping) : null),
    [mapping],
  );

  const updateMapping = (patch: Partial<ColumnMapping>) => {
    if (!mapping) return;
    setMapping({ ...mapping, ...patch });
  };

  const reset = () => {
    formRef.current?.reset();
    setFile(null);
    setSnapshot(null);
    setMapping(null);
    setParseError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload conversations</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Upload a CSV from any source. We&rsquo;ll detect your columns and let
          you map them to QAScope&rsquo;s fields. Different campaigns can use
          completely different headers.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Step 1: file pick */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Step 1 · CSV file
          </label>
          <label
            htmlFor="file"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <p className="text-sm font-medium">
              {file?.name ?? "Click to choose a CSV file"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Max 10 MB, 5000 rows</p>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {parseError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {parseError}
            </p>
          )}
        </div>

        {/* Step 2: column mapping (only when we have a parsed file) */}
        {snapshot && mapping && (
          <>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Step 2 · Map your columns
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                We auto-detected matches. Adjust if anything looks wrong.{" "}
                <span className="text-zinc-400">
                  ({snapshot.rowCount.toLocaleString()} rows · {snapshot.headers.length} columns)
                </span>
              </p>
              <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                    <tr>
                      <th className="px-3 py-2 font-medium">QAScope field</th>
                      <th className="px-3 py-2 font-medium">CSV column</th>
                      <th className="px-3 py-2 font-medium">Sample value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {CANONICAL_FIELDS.map((f) => {
                      const selected = mapping[f.key];
                      const sampleVal = selected
                        ? snapshot.sample[0]?.[selected] ?? ""
                        : "";
                      return (
                        <tr key={f.key}>
                          <td className="px-3 py-2 align-top">
                            <span className="font-medium">{f.label}</span>
                            {f.required && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                            {f.hint && (
                              <p className="text-xs text-zinc-500">{f.hint}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <select
                              value={selected}
                              onChange={(e) =>
                                updateMapping({ [f.key]: e.target.value } as Partial<ColumnMapping>)
                              }
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <option value="">— not mapped —</option>
                              {snapshot.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-zinc-500">
                            {sampleVal.length > 80
                              ? sampleVal.slice(0, 80) + "…"
                              : sampleVal || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fixed-value fallbacks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Fixed channel (if not mapped)
                </label>
                <select
                  value={mapping.fixedChannel ?? ""}
                  onChange={(e) =>
                    updateMapping({
                      fixedChannel:
                        e.target.value === ""
                          ? undefined
                          : (e.target.value as ChannelType),
                    })
                  }
                  disabled={!!mapping.channel}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">— pick one —</option>
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Apply to every row when the CSV doesn&rsquo;t have a channel
                  column.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Fixed date (if not mapped)
                </label>
                <input
                  type="date"
                  value={mapping.fixedDate ?? ""}
                  onChange={(e) =>
                    updateMapping({
                      fixedDate: e.target.value || undefined,
                    })
                  }
                  disabled={!!mapping.conversation_date}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Defaults to today if left blank and no column is mapped.
                </p>
              </div>
            </div>

            {validation && validation.ok === false && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                <ul className="list-inside list-disc">
                  {validation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hidden mapping payload */}
            <input
              type="hidden"
              name="mapping"
              value={JSON.stringify(mapping)}
            />
          </>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={
              pending || !file || (validation ? validation.ok === false : true)
            }
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Uploading..." : "Upload"}
          </button>
          {file && !pending && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {state && <ResultPanel state={state} />}
    </div>
  );
}

function ResultPanel({ state }: { state: NonNullable<UploadState> }) {
  if (state.ok === false) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        {state.error}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total rows" value={state.totalRows} />
        <Stat label="Imported" value={state.successCount} tone="success" />
        <Stat label="Duplicates" value={state.skippedDuplicates} tone="muted" />
        <Stat
          label="Errors"
          value={state.failCount}
          tone={state.failCount > 0 ? "error" : "muted"}
        />
      </div>
      {state.errors.length > 0 && (
        <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium dark:border-zinc-800">
            Errors ({state.errors.length}
            {state.failCount > state.errors.length ? ` of ${state.failCount}` : ""})
          </div>
          <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {state.errors.map((e, i) => (
              <li key={i} className="px-4 py-2 text-sm">
                <span className="font-mono text-xs text-zinc-500">
                  {e.row > 0 ? `Row ${e.row}` : "—"}
                  {e.conversationId ? ` · ${e.conversationId}` : ""}
                </span>
                <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                  {e.message}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.successCount > 0 && (
        <p className="text-sm text-zinc-500">
          Imported conversations are now queued for scoring. View them in{" "}
          <Link href="/results" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
            Results
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "error" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
      : tone === "error"
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950";
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
