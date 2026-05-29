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
   * Starter tier — 1 to 49 seats at ₹1,600/seat/month. DB name: "starter".
   */
  starter: {
    name: "starter",
    label: "Starter",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 1600,
    seatRange: "1–49 seats",
    minSeats: 1,
    maxSeats: 49,
    seatsIncluded: 1,
    byoOpenAiKey: true,
    integrationsAvailable: false,
    supportResponseSla: SUPPORT_SLA,
    description: "For small QA teams running daily audits.",
    features: [
      "Unlimited conversations (bring your own AI key)",
      "₹1,600 / seat / month · up to 49 seats",
      "Custom rubric + fatal rules",
      "Two-tier review workflow",
      "Webhook ingest — connect any CRM",
      "Real-time low-score email alerts",
      "Day-end manager report (email + in-app)",
      "Saved report templates",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Growth tier — 50 to 99 seats at ₹1,450/seat/month on ALL seats. DB name: "team".
   * Retroactive: a 60-seat team pays ₹1,450 × 60, not ₹1,600×49 + ₹1,450×11.
   */
  team: {
    name: "team",
    label: "Growth",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 1450,
    seatRange: "50–99 seats",
    minSeats: 50,
    maxSeats: 99,
    seatsIncluded: 50,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "For growing BPOs running multiple campaigns.",
    features: [
      "Unlimited conversations (bring your own AI key)",
      "₹1,450 / seat / month on all seats · 50–99 seats",
      "Everything in Starter",
      "Live web & API data verification (order/customer fact-checking)",
      "Freshdesk + Zoho Desk native connectors",
      "Bulk team CSV import",
      "Agent coaching history & trend reports",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },

  /**
   * Scale tier — 100+ seats at ₹1,300/seat/month on ALL seats. DB name: "pro".
   * Retroactive: a 100-seat team pays ₹1,300 × 100, not ₹1,450×99 + ₹1,300×1.
   */
  pro: {
    name: "pro",
    label: "Scale",
    monthlyLimit: 1_000_000,
    pricePerSeatUsd: 1300,
    seatRange: "100+ seats",
    minSeats: 100,
    maxSeats: -1,
    seatsIncluded: 100,
    byoOpenAiKey: true,
    integrationsAvailable: true,
    supportResponseSla: SUPPORT_SLA,
    description: "For large operations across multiple BPO clients.",
    features: [
      "Unlimited conversations (bring your own AI key)",
      "₹1,300 / seat / month on all seats · 100+ seats",
      "Everything in Growth",
      "Salesforce Service Cloud + Zendesk connectors",
      "Custom rubric templates per campaign",
      "Priority onboarding session",
      SUPPORT_SLA,
    ],
    razorpayPlanId: null,
  },
};

/** Order in which plans are rendered on /billing. */
export const PLAN_ORDER: CataloguePlanName[] = ["pilot", "starter", "team", "pro"];

export function getPlan(name: PlanName | null | undefined): PlanDefinition {
  if (name === "growth") return PLANS.team; // legacy alias
  if (name && name in PLANS) return PLANS[name as CataloguePlanName];
  return PLANS.pilot;
}

/** Format a Rupee (INR) amount. Returns "Free" for ₹0. */
export function formatUsd(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-US")}`;
}

/** Format a Rupee (INR) amount. */
export function formatInr(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-US")}`;
}
