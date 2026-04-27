"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlanName } from "@/lib/database.types";
import { PLANS, PLAN_ORDER, getPlan } from "@/lib/billing/plans";

export type BillingActionState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Switch the workspace's plan. For now this is a "manual" upgrade that
 * writes a fresh subscription row directly. Once Razorpay is wired up,
 * this action will instead create a Razorpay subscription and redirect
 * to checkout — the webhook will then flip status to 'active'.
 *
 * Admins only.
 */
export async function changePlan(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "User record missing." };
  if (me.role !== "admin") {
    return { ok: false, error: "Only workspace admins can change the plan." };
  }
  if (!me.client_id) return { ok: false, error: "No client associated." };

  const requested = String(formData.get("plan") ?? "") as PlanName;
  // PLAN_ORDER is the catalogue of currently-offered plans; widen the
  // includes-check to a string array so legacy PlanName values that still
  // exist in the DB (e.g. 'growth') are correctly rejected without a TS
  // narrowing complaint.
  if (!(PLAN_ORDER as readonly string[]).includes(requested)) {
    return { ok: false, error: "Unknown plan." };
  }

  const plan = getPlan(requested);
  const now = new Date();
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  // Update the client's active_plan
  const { error: clientErr } = await supabase
    .from("clients")
    .update({ active_plan: requested })
    .eq("id", me.client_id);
  if (clientErr) return { ok: false, error: `Plan update failed: ${clientErr.message}` };

  // Insert a fresh subscription row (audit trail of plan changes).
  const { error: subErr } = await supabase.from("subscriptions").insert({
    client_id: me.client_id,
    plan_name: requested,
    monthly_limit: plan.monthlyLimit,
    status: requested === "pilot" ? "trialing" : "active",
    billing_cycle_start: cycleStart,
    razorpay_subscription_id: null,
  });
  if (subErr) return { ok: false, error: `Subscription insert failed: ${subErr.message}` };

  revalidatePath("/billing");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Plan changed to ${plan.label}.`,
  };
}
