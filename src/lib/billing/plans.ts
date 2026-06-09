import type { PlanName } from "@/lib/database.types";

/**
 * Plan catalogue — single source of truth for limits & pricing.
 *
 * Pricing model: USD per-seat / month — retroactive volume discount.
 *   Starter : 1–49  seats  → $20 / seat / month (all seats)
 *   Growth  : 50–99 seats  → $18 / seat / month (all seats, retroactive)
 *   Scale   : 100+  seats  → $16 / seat / month (all seats, retroactive)
 *
 * "Retroactive" means: if you have 60 seats you pay $18 × 60 = $1,080/mo
 * (not $20×49 + $16×11). Moving to a higher tier lowers the per-seat rate
 * on every seat you already have.
 *
 * Internal DB plan_name enum values (pilot/starter/team/pro) are preserved —
 * no database migration required. UI labels differ from DB names:
 *   "team" → displayed as "Growth"
 *   "pro"  → displayed as "Scale"
 *
 * Paid tiers use a BYO-key model: customers bring their own AI provider key,
 * paste it in Settings → QA Engine, and pay their provider directly.
 * QAScope charges the per-seat platform fee only.
 */
export type PlanDefinition = {
  name: PlanName;
  label: string;
  /** Conversations cap per month. Unlimited on paid tiers. */
  monthlyLimit: number;
  /** INR platform fee per seat per month (0 = free, 0 on Plan B = flat fee model). */
  pricePerSeatInr: number;
  /** @deprecated Use pricePerSeatInr. Kept so billing UI compiles without a migration. */
  pricePerSeatUsd: number;
  /** INR flat monthly platform fee (Plan B only, 0 for seat-based plans). */
  flatMonthlyFeeInr: number;
  /** INR per conversation scored (chat or voice call). 0 = no usage charge. */
  pricePerConversationInr: number;
  /** Human-readable pricing summary. */
  seatRange: string;
  /** Minimum seats to qualify for this tier (inclusive). */
  minSeats: number;
  /** Maximum seats for this tier (inclusive). -1 = unlimited. */
  maxSeats: number;
  seatsIncluded: number;
  byoOpenAiKey: boolean;
  integrationsAvailable: boolean;
  supportResponseSla: string;
  description: string;
  features: string[];
  razorpayPlanId: string | null;
};

type CataloguePlanName = "pilot" | "starter" | "team" | "pro";

const SUPPORT_SLA = "Email support, within 24 hours";

export const PLANS: Record<CataloguePlanName, PlanDefinition> = {
  /**
   * Free trial. DB name: "pilot".
   * QAScope covers AI cost on this tier (capped at 500 conversations).
   */
  pilot: {
    name: "pilot",
    label: "Pilot",
    monthlyLimit: 500,
    pricePerSeatInr: 0,
    pricePerSeatUsd: 0,
    flatMonthlyFeeInr: 0,
    pricePerConversationInr: 0,
    seatRange: "Free Trial",
    minSeats: 1,
    maxSeats: 1,
    seatsIncluded: 1,
    byoOpenAiKey: false,
    integrationsAvailable: false,
    supportResponseSla: SUPPORT_SLA,
    description: "Explore QAScope free before you commit.",
    features: [
      "500 conversations / month (AI cost covered by QAScope)",
      "1 admin seat",
      "Custom rubric + fatal rules",
      "Full scoring & two-tier review workflow",
      "CSV upload only (no CRM integrations)",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Plan A — Seat-based platform fee. DB name: "starter".
   * ₹799/seat/month. Unlimited conversations. No per-conversation charge.
   */
  starter: {
    name: "starter",
    label: "Plan A — Seat Based",
    monthlyLimit: 1_000_000,
    pricePerSeatInr: 799,
    pricePerSeatUsd: 799,
    flatMonthlyFeeInr: 0,
    pricePerConversationInr: 0,
    seatRange: "₹799 / agent / month",
    minSeats: 1,
    maxSeats: -1,
    seatsIncluded: 1,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "Predictable monthly cost per active agent. Unlimited chat & voice audits.",
    features: [
      "₹799 / active agent seat / month",
      "Unlimited conversations — chat, email & voice calls",
      "No per-conversation or per-minute charges",
      "Bring your own AI provider key (BYOK)",
      "CRM & Dialer integrations via Webhook",
      "Custom rubric + fatal compliance rules",
      "Two-tier human review workflow",
      "CSV bulk upload & automated scoring",
      "Weekly QA reports & agent leaderboard",
      "Coaching note generator",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Plan B — Usage-based platform fee. DB name: "team".
   * ₹4,999/month flat + ₹1.50 per conversation (chat or voice call).
   * Transcription API cost is on the customer's own key — not charged by QAScope.
   */
  team: {
    name: "team",
    label: "Plan B — Usage Based",
    monthlyLimit: 1_000_000,
    pricePerSeatInr: 0,
    pricePerSeatUsd: 4999,  // Plan B: flat fee mapped here for legacy billing UI
    flatMonthlyFeeInr: 4999,
    pricePerConversationInr: 1.5,
    seatRange: "₹4,999/mo + ₹1.50/conversation",
    minSeats: 1,
    maxSeats: -1,
    seatsIncluded: 9999,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "Flat monthly fee with pay-per-use scoring. Unlimited seats for your whole team.",
    features: [
      "₹4,999 / month flat platform base fee",
      "₹1.50 per conversation scored (chat, email or voice call)",
      "Unlimited QA & Admin seats — no headcount limits",
      "Bring your own AI provider key (BYOK)",
      "Voice transcription cost on your own API key",
      "CRM & Dialer integrations via Webhook",
      "Outbound score delivery to your CRM",
      "Real-time critical fail alerts to managers",
      "Weekly & custom-range QA reports",
      "Coaching note generator",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Scale tier — hidden from billing page, available for enterprise deals only.
   * DB name: "pro". Applied manually via DB for large clients.
   */
  pro: {
    name: "pro",
    label: "Scale Enterprise",
    monthlyLimit: 1_000_000,
    pricePerSeatInr: 0,
    pricePerSeatUsd: 0,
    flatMonthlyFeeInr: 0,
    pricePerConversationInr: 0,
    seatRange: "Custom pricing",
    minSeats: 100,
    maxSeats: -1,
    seatsIncluded: 100,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "Custom pricing for large BPO operations.",
    features: [
      "Everything in Plan B",
      "Custom volume pricing",
      "Priority onboarding & dedicated support",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },
};

/** Plans shown on /billing — Scale (pro) is hidden, available only via direct deal. */
export const PLAN_ORDER: CataloguePlanName[] = ["pilot", "starter", "team"];

export function getPlan(name: PlanName | null | undefined): PlanDefinition {
  if (name === "growth") return PLANS.team; // legacy alias
  if (name && name in PLANS) return PLANS[name as CataloguePlanName];
  return PLANS.pilot;
}

/** Format an INR amount. Returns "Free" for ₹0. */
export function formatInr(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** @deprecated Use formatInr instead. Alias kept so existing imports compile. */
export function formatUsd(amount: number): string {
  return formatInr(amount);
}
