import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WebhookLogsPage({
  params,
}: {
  params: Promise<{ webhookId: string }>;
}) {
  const resolvedParams = await params;
  const webhookId = resolvedParams.webhookId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!appUser || !["admin", "qa_manager"].includes(appUser.role)) {
    redirect("/settings");
  }

  const { data: webhook } = await supabase
    .from("outbound_webhooks")
    .select("url")
    .eq("id", webhookId)
    .eq("client_id", appUser.client_id)
    .single();

  if (!webhook) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("outbound_webhook_deliveries")
    .select("id, created_at, response_status, error_message, request_payload, response_body")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-xl font-semibold">Webhook Logs</h1>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Showing the latest 50 deliveries for <strong>{webhook.url}</strong>
      </p>

      {(!logs || logs.length === 0) ? (
        <div className="rounded-md border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No deliveries yet. Complete an audit to trigger this webhook.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const isSuccess = log.response_status && log.response_status >= 200 && log.response_status < 300;
            return (
              <details
                key={log.id}
                className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        isSuccess
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {log.response_status ?? "ERROR"}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {log.error_message && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {log.error_message}
                    </span>
                  )}
                </summary>
                <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Request Payload
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
                        {JSON.stringify(log.request_payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Response Body
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
                        {log.response_body || "(empty response)"}
                      </pre>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
