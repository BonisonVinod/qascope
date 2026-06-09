"use client";

import { useState, useTransition } from "react";
import {
  createOutboundWebhook,
  deleteOutboundWebhook,
  toggleOutboundWebhook,
} from "./outbound-webhook-actions";
import Link from "next/link";

type OutboundWebhook = {
  id: string;
  url: string;
  is_active: boolean;
  created_at: string;
};

export function OutboundWebhookPanel({
  webhooks,
  canEdit,
}: {
  webhooks: OutboundWebhook[];
  canEdit: boolean;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    if (!newUrl.trim()) return;
    setError(null);
    setCreatedSecret(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("url", newUrl.trim());
      const res = await createOutboundWebhook(fd);
      if (res?.error) {
        setError(res.error);
      } else if (res?.secret) {
        setCreatedSecret(res.secret);
        setNewUrl("");
      }
    });
  }

  function copySecret() {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-zinc-200 bg-white p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        When an audit is completed, QAScope will <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">POST</code> the final score, critical fails, and coaching notes to these URLs. This is perfect for syncing data back into <strong>n8n</strong>, <strong>Zapier</strong>, <strong>Make.com</strong>, or your custom CRM.
      </div>

      {createdSecret && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            ✓ Webhook created — copy your Signing Secret now.
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            Use this secret to verify the HMAC SHA-256 signature attached to our webhook payloads in the <code className="rounded bg-emerald-200 px-1 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">X-QAScope-Signature</code> header. This ensures the request genuinely came from QAScope.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {createdSecret}
            </code>
            <button
              onClick={copySecret}
              className="shrink-0 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? "Copied!" : "Copy secret"}
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Add new destination URL
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="https://hook.us1.make.com/..."
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={handleCreate}
              disabled={isPending || !newUrl.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {webhooks.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
          No outbound webhooks configured.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{w.url}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      w.is_active
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {w.is_active ? "Active" : "Paused"}
                  </span>
                  <Link
                    href={`/settings/webhooks/${w.id}/logs`}
                    className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-300"
                  >
                    View Logs
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && (
                  <>
                    <button
                      onClick={() =>
                        startTransition(() => {
                          void toggleOutboundWebhook(w.id, !w.is_active);
                        })
                      }
                      className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      {w.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() =>
                        confirm("Permanently delete this webhook?") &&
                        startTransition(() => {
                          void deleteOutboundWebhook(w.id);
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
    </div>
  );
}
