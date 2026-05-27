"use client";

import { useState, useTransition } from "react";
import {
  createWebhookToken,
  revokeWebhookToken,
  deleteWebhookToken,
} from "./webhook-actions";

type Token = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export function WebhookPanel({
  tokens,
  canEdit,
  appUrl,
}: {
  tokens: Token[];
  canEdit: boolean;
  appUrl: string;
}) {
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ingestUrl = `${appUrl}/api/ingest/webhook`;

  function handleCreate() {
    if (!newTokenName.trim()) return;
    setError(null);
    setCreatedToken(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", newTokenName.trim());
      const res = await createWebhookToken(fd);
      if ("error" in res) {
        setError(res.error ?? null);
      } else {
        setCreatedToken(res.token!);
        setNewTokenName("");
      }
    });
  }

  function copyToken(val: string) {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyEndpoint() {
    if (!createdToken) return;
    const full = `${ingestUrl}?token=${createdToken}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Endpoint info */}
      <div className="rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Ingest endpoint
        </p>
        <code className="mt-1 block break-all text-xs text-zinc-700 dark:text-zinc-300">
          POST {ingestUrl}?token={"<your-token>"}
        </code>
        <p className="mt-2 text-xs text-zinc-400">
          Send a JSON body with <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">transcript</code> (required) plus optional{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">agent_name</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">customer_id</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">order_id</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">channel</code>.
          QAScope scores it automatically.
        </p>
      </div>

      {/* Newly created token reveal */}
      {createdToken && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            ✓ Token created — copy it now. It won&rsquo;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {createdToken}
            </code>
            <button
              onClick={() => copyToken(createdToken)}
              className="shrink-0 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? "Copied!" : "Copy token"}
            </button>
          </div>
          <button
            onClick={copyEndpoint}
            className="mt-2 text-xs text-emerald-700 underline hover:no-underline dark:text-emerald-400"
          >
            Copy full endpoint URL with token
          </button>
        </div>
      )}

      {/* Create new token */}
      {canEdit && (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Create a new token
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder='e.g. "Freshdesk Production"'
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={handleCreate}
              disabled={isPending || !newTokenName.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPending ? "Creating…" : "Create"}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
          No tokens yet. Create one above to start receiving conversations from your CRM.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Created {new Date(t.created_at).toLocaleDateString("en-IN")}{" "}
                  {t.last_used_at
                    ? `· Last used ${new Date(t.last_used_at).toLocaleDateString("en-IN")}`
                    : "· Never used"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    t.is_active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  {t.is_active ? "Active" : "Revoked"}
                </span>
                {canEdit && t.is_active && (
                  <button
                    onClick={() =>
                      startTransition(() => { void revokeWebhookToken(t.id); })
                    }
                    className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  >
                    Revoke
                  </button>
                )}
                {canEdit && !t.is_active && (
                  <button
                    onClick={() =>
                      confirm("Permanently delete this token?") &&
                      startTransition(() => { void deleteWebhookToken(t.id); })
                    }
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick example */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Show example cURL request
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">
          {`curl -X POST "${ingestUrl}?token=YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transcript": "Agent: Hello, how can I help you?\\nCustomer: ...",
    "agent_name": "Priya Sharma",
    "customer_id": "CUST-1234",
    "order_id": "ORD-9876",
    "channel": "voice_transcript"
  }'`}
        </pre>
      </details>
    </div>
  );
}
