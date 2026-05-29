"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanName } from "@/lib/database.types";
import { getPlan } from "@/lib/billing/plans";

// Razorpay plan IDs from dashboard — set via env vars
const RAZORPAY_PLAN_IDS: Partial<Record<PlanName, string>> = {
  starter: process.env.RAZORPAY_PLAN_STARTER ?? "",
  team:    process.env.RAZORPAY_PLAN_GROWTH  ?? "",  // "team" DB name = Growth tier
  pro:     process.env.RAZORPAY_PLAN_SCALE   ?? "",  // "pro"  DB name = Scale tier
};

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type CheckoutResult =
  | { ok: true;  subscriptionId: string; keyId: string; prefillEmail: string }
  | { error: string };

/**
 * Creates a Razorpay subscription and returns the credentials
 * the client-side Razorpay.js checkout widget needs to open.
 */
export async function createRazorpaySubscription(
  planName: PlanName,
  requestedQuantity?: number,
): Promise<CheckoutResult> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { error: "Payment gateway not configured. Contact support." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id, email, role")
    .eq("id", user.id)
    .single();

  if (!appUser || !["admin"].includes(appUser.role)) {
    return { error: "Only admins can manage billing" };
  }

  const planId = RAZORPAY_PLAN_IDS[planName];
  if (!planId) {
    return { error: `No Razorpay plan configured for ${planName}` };
  }

  try {
    // Dynamically calculate seat count (accepted users + pending invitations)
    const adminClient = createAdminClient();
    const { count: memberCount } = await adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("client_id", appUser.client_id);
    const { count: openInviteCount } = await adminClient
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", appUser.client_id)
      .is("accepted_at", null);
    const seatsUsed = (memberCount ?? 0) + (openInviteCount ?? 0);
    
    // Respect the plan's minimum seats requirement (Starter: 1, Growth: 50, Scale: 100)
    // and any custom quantity selected by the user.
    const plan = getPlan(planName);
    let finalQuantity = Math.max(plan.minSeats, seatsUsed);
    if (requestedQuantity && requestedQuantity > 0) {
      finalQuantity = Math.max(finalQuantity, requestedQuantity);
    }

    // Create Razorpay subscription via API (Do NOT send callback_url or cancel_url here)
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 12,          // 12 months, then renews
        quantity: finalQuantity,  // Dynamic seat count passed here!
        notify_info: { notify_email: appUser.email },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err?.error?.description ?? "Razorpay API error" };
    }

    const sub = await response.json() as { id: string };

    // Store pending subscription in our DB
    const admin = createAdminClient();
    const { error: dbErr } = await admin.from("subscriptions").upsert({
      client_id: appUser.client_id,
      plan_name: planName,
      monthly_limit: 99999,
      status: "trialing",
      billing_cycle_start: new Date().toISOString().slice(0, 10),
      razorpay_subscription_id: sub.id,
    }, { onConflict: "client_id" });

    if (dbErr) {
      console.error("[checkout] DB upsert failed:", dbErr.message);
    }

    return {
      ok: true,
      subscriptionId: sub.id,
      keyId: RAZORPAY_KEY_ID,
      prefillEmail: appUser.email,
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Cancel the current subscription (sets status to pending cancellation).
 * Razorpay cancels at the end of the billing cycle.
 */
export async function cancelSubscription(): Promise<{ ok: true } | { error: string }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { error: "Payment gateway not configured" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!appUser || appUser.role !== "admin") {
    return { error: "Only admins can cancel billing" };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("client_id", appUser.client_id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub?.razorpay_subscription_id) {
    return { error: "No active subscription found" };
  }

  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      return { error: err?.error?.description ?? "Cancellation failed" };
    }

    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
