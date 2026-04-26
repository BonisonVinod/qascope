/**
 * Pure plan-limit logic — separated from usage.ts so it's testable without
 * a Supabase mock.
 */
export type LimitCheckInput = {
  monthlyLimit: number;
  conversationsThisMonth: number;
  incoming: number; // how many rows the upload would add
};

export type LimitCheckResult =
  | { ok: true; remainingAfter: number }
  | { ok: false; reason: "already_over"; used: number; limit: number }
  | { ok: false; reason: "would_exceed"; over: number; used: number; limit: number };

export function checkPlanLimit(input: LimitCheckInput): LimitCheckResult {
  const { monthlyLimit, conversationsThisMonth, incoming } = input;
  if (conversationsThisMonth >= monthlyLimit) {
    return {
      ok: false,
      reason: "already_over",
      used: conversationsThisMonth,
      limit: monthlyLimit,
    };
  }
  const remainingAfter = monthlyLimit - conversationsThisMonth - incoming;
  if (remainingAfter < 0) {
    return {
      ok: false,
      reason: "would_exceed",
      over: -remainingAfter,
      used: conversationsThisMonth,
      limit: monthlyLimit,
    };
  }
  return { ok: true, remainingAfter };
}
