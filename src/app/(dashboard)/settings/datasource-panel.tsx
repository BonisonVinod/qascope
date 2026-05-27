"use client";

import { useState, useTransition } from "react";
import {
  createDataSource,
  toggleDataSource,
  deleteDataSource,
} from "./datasource-actions";

type DataSource = {
  id: string;
  name: string;
  type: "website_url" | "api_endpoint";
  url: string | null;
  endpoint_template: string | null;
  http_method: "GET" | "POST";
  auth_header_name: string | null;
  entity_hints: string[];
  is_active: boolean;
  created_at: string;
};

const TYPE_LABELS = {
  website_url: "Website / Help Centre",
  api_endpoint: "API Endpoint",
} as const;

export function DataSourcePanel({
  sources,
  canEdit,
}: {
  sources: DataSource[];
  canEdit: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"website_url" | "api_endpoint">("website_url");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createDataSource(fd);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setShowForm(false);
        setType("website_url");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          How it works
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          When a conversation is scored, the AI extracts entities like{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">order_id</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">customer_id</code>, or{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">tracking_number</code>{" "}
          from the transcript. It then queries the sources you configure here to
          verify whether what the agent told the customer was accurate.
        </p>
      </div>

      {/* Source list */}
      {sources.length === 0 && !showForm ? (
        <p className="rounded-md border border-dashed border-zinc-300 py-8 text-center text-xs text-zinc-400 dark:border-zinc-700">
          No data sources configured yet.{" "}
          {canEdit ? "Add one below to enable live verification." : "Contact your admin to add one."}
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {sources.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {TYPE_LABELS[s.type]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {s.type === "website_url" ? s.url : s.endpoint_template}
                </p>
                {s.entity_hints.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Extracts:{" "}
                    {s.entity_hints.map((h) => (
                      <code
                        key={h}
                        className="mr-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800"
                      >
                        {h}
                      </code>
                    ))}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    s.is_active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  {s.is_active ? "Active" : "Paused"}
                </span>
                {canEdit && (
                  <>
                    <button
                      onClick={() =>
                        startTransition(() => {
                          void toggleDataSource(s.id, !s.is_active);
                        })
                      }
                      className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      {s.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() =>
                        confirm(`Delete "${s.name}"?`) &&
                        startTransition(() => {
                          void deleteDataSource(s.id);
                        })
                      }
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add source form */}
      {canEdit && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        >
          + Add data source
        </button>
      )}

      {showForm && canEdit && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <p className="text-sm font-semibold">New data source</p>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Name
            </label>
            <input
              name="name"
              required
              placeholder='e.g. "Order Tracker API"'
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Type
            </label>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="website_url">Website / Help Centre</option>
              <option value="api_endpoint">API Endpoint</option>
            </select>
          </div>

          {/* URL or endpoint */}
          {type === "website_url" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                URL
              </label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://help.yourcompany.com/policies"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-400">
                The AI will fetch this page and use its text as context when verifying claims.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Endpoint template
                </label>
                <input
                  name="endpoint_template"
                  required
                  placeholder="https://api.yourcompany.com/orders/{order_id}"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Use{" "}
                  <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                    {"{order_id}"}
                  </code>{" "}
                  placeholders — the AI fills them from the transcript.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    HTTP Method
                  </label>
                  <select
                    name="http_method"
                    defaultValue="GET"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Auth header name
                  </label>
                  <input
                    name="auth_header_name"
                    placeholder="X-Api-Key"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </>
          )}

          {/* Entity hints */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Entity hints{" "}
              <span className="font-normal text-zinc-400">(comma-separated)</span>
            </label>
            <input
              name="entity_hints"
              placeholder="order_id, customer_id, tracking_number"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Tell the AI which values to extract from the transcript to fill placeholders or query this source.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPending ? "Saving…" : "Save source"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
