"use client";

import { useActionState } from "react";
import {
  addFatalRule,
  updateFatalRule,
  toggleFatalRule,
  deleteFatalRule,
  type FatalRuleActionState,
} from "./fatal-rules-actions";
import {
  bulkAddFatalRules,
  type FatalBulkUploadState,
} from "./fatal-rules-bulk-actions";

export type FatalRule = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
};

export function FatalRulesPanel({
  rubricId,
  rules,
  canEdit,
}: {
  rubricId: string;
  rules: FatalRule[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    FatalRuleActionState,
    FormData
  >(addFatalRule, undefined);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Fatal rules ({rules.filter((r) => r.active).length} active /{" "}
          {rules.length} total)
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Project-specific compliance rules. Any conversation that violates an
          active rule is flagged as a critical fail and routed to the review
          queue. Update this list whenever your client&rsquo;s compliance
          requirements change &mdash; no rubric weight changes needed.
        </p>
      </div>

      {/* Existing rules */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {rules.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">
            No fatal rules yet. Add the first one below.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Description</th>
                {canEdit && <th className="px-4 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rules.map((r) => (
                <tr key={r.id} className={r.active ? "" : "opacity-60"}>
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <form action={toggleFatalRule}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {r.active ? "Active" : "Disabled"}
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {r.active ? "Active" : "Disabled"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {canEdit ? (
                      <form action={updateFatalRule}>
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="name"
                          defaultValue={r.name}
                          maxLength={80}
                          className="w-48 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <input
                          type="hidden"
                          name="description"
                          value={r.description}
                        />
                        <button
                          type="submit"
                          className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {canEdit ? (
                      <form action={updateFatalRule}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="name" value={r.name} />
                        <textarea
                          name="description"
                          defaultValue={r.description}
                          rows={2}
                          maxLength={500}
                          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button
                          type="submit"
                          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {r.description}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2 align-top">
                      <form action={deleteFatalRule}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk CSV upload */}
      {canEdit && <BulkAddFatalRulesForm rubricId={rubricId} />}

      {/* Add new */}
      {canEdit && (
        <form
          action={formAction}
          className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <input type="hidden" name="rubricId" value={rubricId} />
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Add fatal rule
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Short name (e.g. PII disclosure)"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              name="description"
              required
              maxLength={500}
              placeholder="What triggers this rule (e.g. agent reads card number aloud)"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Adding..." : "Add rule"}
            </button>
            {state?.ok === true && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {state.message}
              </span>
            )}
            {state?.ok === false && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {state.error}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function BulkAddFatalRulesForm({ rubricId }: { rubricId: string }) {
  const [state, formAction, pending] = useActionState<
    FatalBulkUploadState,
    FormData
  >(bulkAddFatalRules, undefined);

  return (
    <details className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Bulk upload fatal rules from CSV
      </summary>
      <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">
          CSV with columns <code>name,description</code>. Each row is appended
          as an active rule. Names already on this rubric are skipped.
        </p>

        <pre className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
{`name,description
PII disclosure,Agent reads card number or full account number aloud
Identity verification,Agent shares account info before verifying customer identity
Refund authorization,Agent promises a refund without supervisor approval
Recording disclosure,Agent does not inform customer the call is recorded`}
        </pre>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="rubricId" value={rubricId} />
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Uploading..." : "Upload"}
          </button>

          {state && state.ok === false && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </p>
          )}
        </form>

        {state && state.ok === true && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950">
                <div className="font-medium text-emerald-700 dark:text-emerald-400">
                  Added
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {state.added.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950">
                <div className="font-medium text-amber-700 dark:text-amber-400">
                  Skipped
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {state.skipped.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
                <div className="font-medium text-red-700 dark:text-red-400">
                  Errors
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {state.errors.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 text-left uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {state.results.map((r) => (
                    <tr key={r.rowNumber}>
                      <td className="px-3 py-2 text-zinc-500">{r.rowNumber}</td>
                      <td className="px-3 py-2">{r.name || "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            r.status === "added"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : r.status === "skipped_duplicate"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          }`}
                        >
                          {r.status === "added"
                            ? "Added"
                            : r.status === "skipped_duplicate"
                              ? "Duplicate"
                              : "Error"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {r.message ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
