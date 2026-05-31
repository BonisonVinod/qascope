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
  /** USD per seat per month (0 = free). */
  pricePerSeatUsd: number;
  /** Human-readable seat range for this tier. */
  seatRange: string;
  /** Minimum seats to qualify for this tier (inclusive). */
  minSeats: number;
  /** Maximum seats for this tier (inclusive). -1 = unlimited. */
  maxSeats: number;
  /** Seats included in base plan before overage kicks in. */
  seatsIncluded: number;
  /** Whether the customer must bring their own QA-engine key. */
  byoOpenAiKey: boolean;
  /** Whether this plan can use CRM integration features. */
  integrationsAvailable: boolean;
  /** Email-support SLA commitment. */
  supportResponseSla: string;
  description: string;
  features: string[];
  /** Razorpay plan id — set once created in Razorpay dashboard. */
  razorpayPlanId: string | null;
};

type CataloguePlanName = "pilot" | "starter" | "team" | "pro";

const SUPPORT_SLA = "Email support, within 24 hours";

export const PLANS: Record<CataloguePlanName, PlanDefinition> = {
  /**
   * Free trial. DB name: "pilot".
   * QAScope covers the AI cost on this tier (capped at 500 conversations).
   */
  pilot: {
    name: "pilot",
    label: "Pilot",
    monthlyLimit: 500,
    pricePerSeatUsd: 0,
    seatRange: "Trial",
    minSeats: 1,
    maxSeats: 1,
    seatsIncluded: 1,
    byoOpenAiKey: false,
    integrationsAvailable: false,
    supportResponseSla: SUPPORT_SLA,
    description: "Free trial — explore QAScope before you commit.",
    features: [
      "500 conversations / month (AI cost covered by QAScope)",
      "1 admin seat",
      "Custom rubric + project-specific fatal rules",
      "Full scoring & two-tier review workflow",
      "Saved report templates",
      "CSV upload only (no CRM integrations)",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Plan A — predictable agent-based billing at ₹800/seat/month. DB name: "starter".
   */
  starter: {
    name: "starter",
    label: "Plan A (Seat-Based)",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 799,
    seatRange: "₹799/agent/mo",
    minSeats: 1,
    maxSeats: -1,
    seatsIncluded: 1,
    byoOpenAiKey: true,
    integrationsAvailable: false,
    supportResponseSla: SUPPORT_SLA,
    description: "For campaigns that prefer a predictable monthly cost per active agent.",
    features: [
      "Unlimited conversations (bring your own AI key)",
      "₹799 / active agent seat / month",
      "Beautiful Rubric Score Sheets",
      "Custom rubric + fatal rules",
      "Two-tier review workflow",
      "CSV bulk upload & automated scoring",
      "Daily manager email reports & trends",
      "Coaching note generator",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Plan B — flexible usage-based billing at ₹4,999/mo flat platform fee + ₹1.50/chat. DB name: "team".
   */
  team: {
    name: "team",
    label: "Plan B (Usage-Based)",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 4999,
    seatRange: "₹4,999/mo flat + ₹1.50/chat",
    minSeats: 1,
    maxSeats: -1,
    seatsIncluded: 9999, // unlimited seats
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "For high-volume campaigns or seasonal support centers with unlimited QA seats.",
    features: [
      "₹4,999 / month flat platform base fee",
      "₹1.50 / conversation scored (usage fee)",
      "Unlimited QA & Admin logins (no account sharing limits)",
      "Bring your own OpenAI / OpenRouter key",
      "Freshdesk, Zoho Desk, Salesforce integrations (Webhook)",
      "Live web API verification (fact-checking agent claims)",
      "Saved custom report templates",
      "Bulk team CSV import",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Scale tier — kept for backwards compatibility (hidden from default rendering). DB name: "pro".
   */
  pro: {
    name: "pro",
    label: "Scale Enterprise",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 1300,
    seatRange: "100+ seats",
    minSeats: 100,
    maxSeats: -1,
    seatsIncluded: 100,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "For custom high-scale operations across multiple BPO clients.",
    features: [
      "Unlimited conversations (bring your own AI key)",
      "Custom volume-based pricing",
      "Everything in Plan B",
      "Salesforce Service Cloud + Zendesk connectors",
      "Custom rubric templates per campaign",
      "Priority onboarding session",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },
};

/** Order in which plans are rendered on /billing. */
export const PLAN_ORDER: CataloguePlanName[] = ["pilot", "starter", "team"];

export function getPlan(name: PlanName | null | undefined): PlanDefinition {
  if (name === "growth") return PLANS.team; // legacy alias
  if (name && name in PLANS) return PLANS[name as CataloguePlanName];
  return PLANS.pilot;
}

/** Format a Rupee (INR) amount. Returns "Free" for ₹0. */
export function formatUsd(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Format a Rupee (INR) amount. */
export function formatInr(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}
