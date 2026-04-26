"use client";

import { useActionState, useState } from "react";
import { bulkInviteFromCsv, type BulkUploadState } from "../bulk-actions";

export function BulkUploadForm() {
  const [state, formAction, pending] = useActionState<BulkUploadState, FormData>(
    bulkInviteFromCsv,
    undefined,
  );
  const [origin, setOrigin] = useState<string>("");

  // Compute the absolute origin once on mount so we can show clickable
  // full URLs in the results table.
  if (typeof window !== "undefined" && origin === "") {
    setOrigin(window.location.origin);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="file"
            className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">Max 1 MB.</p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Processing..." : "Upload and invite"}
        </button>

        {state && state.ok === false && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {state.error}
          </p>
        )}
      </form>

      {state && state.ok === true && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Created" value={state.created} tone="emerald" />
            <Stat label="Skipped" value={state.skipped} tone="amber" />
            <Stat label="Errors" value={state.errors} tone="red" />
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {state.results.map((r) => (
                  <tr key={`${r.rowNumber}-${r.email}`}>
                    <td className="px-3 py-2 text-zinc-500">{r.rowNumber}</td>
                    <td className="px-3 py-2">{r.email || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {r.inviteUrl ? (
                        <CopyLink url={`${origin}${r.inviteUrl}`} />
                      ) : (
                        r.message ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400";
  return (
    <div className={`rounded-md border px-3 py-2 ${cls}`}>
      <div className="text-xs font-medium uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    created: {
      label: "Invited",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    },
    skipped_existing_user: {
      label: "Already member",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    },
    skipped_already_invited: {
      label: "Already invited",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    },
    error: {
      label: "Error",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    },
  };
  const item = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-700" };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <span className="max-w-[280px] truncate">{url}</span>
      <span className="text-blue-600 dark:text-blue-400">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
