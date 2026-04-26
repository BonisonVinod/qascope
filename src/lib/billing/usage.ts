import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlanName } from "@/lib/database.types";
import { getPlan } from "./plans";
import { checkPlanLimit } from "./limits";

type SB = SupabaseClient<Database>;

export type UsageSnapshot = {
  plan: PlanName;
  monthlyLimit: number;
  monthStart: string; // ISO
  monthEnd: string;   // ISO
  conversationsThisMonth: number;
  remaining: number;
  percentUsed: number;
  isOverLimit: boolean;
};

/**
 * Compute usage for a client in the current calendar month. Cheap query —
 * just a HEAD count against conversations.created_at >= monthStart.
 */
export async function getUsage(
  supabase: SB,
  clientId: string,
): Promise<UsageSnapshot> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const { data: client } = await supabase
    .from("clients")
    .select("active_plan")
    .eq("id", clientId)
    .single();
  const plan = client?.active_plan ?? "pilot";

  // Allow per-client override via active subscription's monthly_limit (most recent).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("monthly_limit, status")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const limit =
    sub && (sub.status === "active" || sub.status === "trialing")
      ? sub.monthly_limit
      : getPlan(plan).monthlyLimit;

  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", monthStart.toISOString())
    .lt("created_at", monthEnd.toISOString());

  const used = count ?? 0;
  // Delegate threshold logic to the pure helper so it's testable in isolation.
  const check = checkPlanLimit({
    monthlyLimit: limit,
    conversationsThisMonth: used,
    incoming: 0,
  });
  const remaining = check.ok ? check.remainingAfter : 0;
  const percentUsed = limit > 0 ? (used / limit) * 100 : 100;

  return {
    plan,
    monthlyLimit: limit,
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    conversationsThisMonth: used,
    remaining,
    percentUsed,
    isOverLimit: !check.ok && check.reason === "already_over",
  };
}
