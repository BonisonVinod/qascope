import type { PlanName } from "@/lib/database.types";

/**
 * Plan catalogue — single source of truth for limits & pricing.
 * Pricing is in INR (₹) for Indian SMB BPOs.
 *
 * Pilot tier is the only one where QAScope pays the OpenAI bill (small, capped
 * at 500 conversations/month). Paid tiers operate on a BYO-OpenAI-key model:
 * customer creates an OpenAI account, generates a key, pastes it in Settings.
 * They see live usage in /billing and pay OpenAI directly. We charge a flat
 * platform fee that covers Vercel + Supabase + product value.
 */
export type PlanDefinition = {
  name: PlanName;
  label: string;
  /** Conversations cap per month. Effectively unlimited on paid tiers. */
  monthlyLimit: number;
  /** Platform fee in INR per month. */
  monthlyPriceInr: number;
  /** Number of teammate seats included. */
  seatsIncluded: number;
  /** Per-seat-per-month price for additional seats over the included count. */
  additionalSeatPriceInr: number;
  /** Whether the customer must bring their own OpenAI key (true) or QAScope eats the cost (false). */
  byoOpenAiKey: boolean;
  description: string;
  features: string[];
  /** Razorpay plan id (set once you create a plan in Razorpay dashboard). */
  razorpayPlanId: string | null;
};

type CataloguePlanName = "pilot" | "starter" | "team" | "pro";

export const PLANS: Record<CataloguePlanName, PlanDefinition> = {
  pilot: {
    name: "pilot",
    label: "Pilot",
    monthlyLimit: 500,
    monthlyPriceInr: 0,
    seatsIncluded: 1,
    additionalSeatPriceInr: 0,
    byoOpenAiKey: false,
    description: "Free trial — kick the tyres before you commit.",
    features: [
      "500 conversations / month (we cover OpenAI cost)",
      "1 admin seat",
      "All scoring + review queue features",
      "Email support",
    ],
    razorpayPlanId: null,
  },
  starter: {
    name: "starter",
    label: "Starter",
    monthlyLimit: 1_000_000,
    monthlyPriceInr: 6_999,
    seatsIncluded: 1,
    additionalSeatPriceInr: 2_999,
    byoOpenAiKey: true,
    description: "For a single QA manager running daily audits.",
    features: [
      "Unlimited conversations (you bring your OpenAI key)",
      "1 seat included; ₹2,999/seat/month for more",
      "Two-tier review with custom SLA",
      "Saved report templates",
      "Live OpenAI usage tracking",
      "Email support",
    ],
    razorpayPlanId: null,
  },
  team: {
    name: "team",
    label: "Team",
    monthlyLimit: 1_000_000,
    monthlyPriceInr: 14_999,
    seatsIncluded: 3,
    additionalSeatPriceInr: 2_999,
    byoOpenAiKey: true,
    description: "For QA managers plus team leads on a single campaign.",
    features: [
      "Unlimited conversations (BYO OpenAI key)",
      "3 seats included; ₹2,999/seat/month for more",
      "Custom rubric + project-specific fatal rules",
      "Bulk team CSV import",
      "Priority email support",
    ],
    razorpayPlanId: null,
  },
  pro: {
    name: "pro",
    label: "Pro",
    monthlyLimit: 1_000_000,
    monthlyPriceInr: 29_999,
    seatsIncluded: 5,
    additionalSeatPriceInr: 2_499,
    byoOpenAiKey: true,
    description: "For ops directors with multiple campaigns and audits.",
    features: [
      "Unlimited conversations (BYO OpenAI key)",
      "5 seats included; ₹2,499/seat/month for more",
      "Multiple rubrics for multi-campaign teams",
      "Priority + Slack support",
      "First CRM/ticketing integration on the house",
      "Pilot consulting hours",
    ],
    razorpayPlanId: null,
  },
};

/** Order in which plans are rendered on /billing. */
export const PLAN_ORDER: CataloguePlanName[] = ["pilot", "starter", "team", "pro"];

export function getPlan(name: PlanName | null | undefined): PlanDefinition {
  // Legacy compatibility: 'growth' (the old mid-tier) maps to 'team' now.
  if (name === "growth") return PLANS.team;
  if (name && name in PLANS) return PLANS[name as CataloguePlanName];
  return PLANS.pilot;
}

export function formatInr(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}
