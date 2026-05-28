/**
 * Razorpay webhook handler — POST /api/billing/razorpay-webhook
 *
 * Listens for Razorpay subscription events and updates the client's
 * active_plan and subscriptions table accordingly.
 *
 * Events handled:
 *   subscription.activated  → set status=active, update active_plan
 *   subscription.charged    → renew billing_cycle_start
 *   subscription.cancelled  → set status=canceled
 *   subscription.completed  → set status=canceled
 *   payment.failed          → set status=past_due (triggers UI warning)
 *
 * Security: every request is verified against RAZORPAY_WEBHOOK_SECRET
 * using HMAC-SHA256 — reject anything that doesn't match.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanName } from "@/lib/database.types";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

// Map Razorpay plan IDs → our internal plan names
// Populate these once you create plans in the Razorpay dashboard.
const PLAN_ID_MAP: Record<string, PlanName> = {
  [process.env.RAZORPAY_PLAN_STARTER ?? ""]: "starter",
  [process.env.RAZORPAY_PLAN_GROWTH  ?? ""]: "team",     // DB enum "team" = Growth tier
  [process.env.RAZORPAY_PLAN_SCALE   ?? ""]: "pro",      // DB enum "pro"  = Scale tier
};

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.error("[razorpay-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string;
  const payload = event.payload as Record<string, unknown>;
  const subscription = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;

  if (!subscription) {
    return NextResponse.json({ ok: true, note: "No subscription entity — ignoring" });
  }

  const razorpaySubId = subscription.id as string;
  const planId = subscription.plan_id as string;
  const internalPlan = PLAN_ID_MAP[planId] ?? "starter";

  const supabase = createAdminClient();

  try {
    switch (eventType) {
      case "subscription.activated": {
        // 1. Find the subscription row by Razorpay ID
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, client_id")
          .eq("razorpay_subscription_id", razorpaySubId)
          .maybeSingle();

        if (!sub) {
          console.error(`[razorpay-webhook] No subscription found for ${razorpaySubId}`);
          break;
        }

        // 2. Activate the subscription
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            plan_name: internalPlan,
            billing_cycle_start: new Date().toISOString().slice(0, 10),
          })
          .eq("id", sub.id);

        // 3. Update the client's active plan
        await supabase
          .from("clients")
          .update({ active_plan: internalPlan })
          .eq("id", sub.client_id);

        console.log(`[razorpay-webhook] Activated ${internalPlan} for client ${sub.client_id}`);
        break;
      }

      case "subscription.charged": {
        // Renewal — reset billing cycle
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("razorpay_subscription_id", razorpaySubId)
          .maybeSingle();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              billing_cycle_start: new Date().toISOString().slice(0, 10),
            })
            .eq("id", sub.id);
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, client_id")
          .eq("razorpay_subscription_id", razorpaySubId)
          .maybeSingle();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({ status: "canceled" })
            .eq("id", sub.id);

          // Downgrade to pilot (free) plan
          await supabase
            .from("clients")
            .update({ active_plan: "pilot" })
            .eq("id", sub.client_id);
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = (payload?.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
        const failedSubId = paymentEntity?.subscription_id as string;

        if (failedSubId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("razorpay_subscription_id", failedSubId);
        }
        break;
      }

      default:
        // Unknown event — acknowledge but do nothing
        break;
    }
  } catch (err) {
    console.error("[razorpay-webhook] Handler error:", err);
    // Return 200 to stop Razorpay retrying — log the error for investigation
    return NextResponse.json({ ok: false, note: "Handler error — logged" });
  }

  return NextResponse.json({ ok: true });
}
