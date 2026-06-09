import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import crypto from "crypto";

type SB = SupabaseClient<Database>;

export interface OutboundWebhookPayload {
  event: string;
  data: {
    conversation_id: string;
    external_conversation_id: string | null;
    agent_name: string;
    total_score: number;
    has_critical_fail: boolean;
    coaching_note: string | null;
    rubric_name: string | null;
    scored_at: string;
  };
}

export async function dispatchOutboundWebhook(
  supabase: SB,
  clientId: string,
  qaScoreId: string,
  payload: OutboundWebhookPayload
): Promise<void> {
  try {
    // 1. Fetch active webhooks for this client
    const { data: webhooks, error: hookErr } = await supabase
      .from("outbound_webhooks")
      .select("id, url, secret")
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (hookErr || !webhooks || webhooks.length === 0) {
      return; // No active webhooks to dispatch to
    }

    const payloadString = JSON.stringify(payload);

    // Process each webhook concurrently
    await Promise.all(
      webhooks.map(async (hook) => {
        let responseStatus: number | null = null;
        let responseBody: string | null = null;
        let errorMessage: string | null = null;

        // Generate HMAC signature
        const signature = crypto
          .createHmac("sha256", hook.secret)
          .update(payloadString)
          .digest("hex");

        try {
          // 10-second timeout — a hung webhook cannot block scoring pipeline
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10_000);
          let res: Response;
          try {
            res = await fetch(hook.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-QAScope-Signature": signature,
                "User-Agent": "QAScope-Outbound-Webhook/1.0",
              },
              body: payloadString,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeoutId);
          }

          responseStatus = res.status;
          // Truncate stored body to 2000 chars to prevent DB bloat
          const rawBody = await res.text();
          responseBody = rawBody.length > 2000 ? rawBody.slice(0, 2000) + "…[truncated]" : rawBody;

          if (!res.ok) {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
        } catch (err: any) {
          if (err?.name === "AbortError") {
            errorMessage = "Webhook timed out after 10 seconds";
          } else {
            errorMessage = err.message || "Network error or timeout";
          }
        }

        // 2. Log the delivery attempt
        await supabase.from("outbound_webhook_deliveries").insert({
          webhook_id: hook.id,
          client_id: clientId,
          qa_score_id: qaScoreId,
          event_type: "qa_score_ready",
          request_payload: payload as unknown as Record<string, unknown>,
          response_status: responseStatus,
          response_body: responseBody,
          error_message: errorMessage,
          is_success: !errorMessage && (!responseStatus || responseStatus < 400),
        });

        // 3. Notify managers if delivery failed
        if (errorMessage || (responseStatus && responseStatus >= 400)) {
          // Fetch admins to notify
          const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("client_id", clientId)
            .in("role", ["admin", "qa_manager"]);

          if (admins) {
            for (const admin of admins) {
              await supabase.from("agent_notifications").insert({
                client_id: clientId,
                user_id: admin.id,
                severity: "warning",
                title: "⚠️ Webhook Delivery Failed",
                body: `Failed to send data to ${hook.url}. Error: ${errorMessage}`,
                action_url: `/settings/webhooks`, // Link to settings or logs
              });
            }
          }
        }
      })
    );
  } catch (err) {
    console.error("[outbound-webhook] Failed to dispatch:", err);
  }
}
