import type { PlanName } from "@/lib/database.types";

/**
 * Plan catalogue — single source of truth for limits & pricing.
 * Pricing is in INR (₹) for Indian SMB BPOs.
 *
 * Pilot tier is the only one where QAScope pays the OpenAI bill (small, capped
 * at 500 conversations/month). Paid tiers operate on a BYO-OpenAI-key model:
 * customer creates an OpenAI/OpenRouter account, generates a key, pastes it in
 * Settings. They see live usage in /billing and pay their provider directly.
 * We charge a flat platform fee that covers Vercel + Supabase + product value.
 *
 * **Differentiator strategy:**
 *   - Custom rubric + fatal rules is a TABLESTAKES feature, included on every
 *     tier (including Pilot). Without it the tool is useless.
 *   - Higher tiers differentiate on: seats, support response SLA, number of
 *     integrations included, and multi-rubric support.
 *   - Integrations are an add-on at every paid tier; the per-integration price
 *     drops as you go up the ladder, and Pro includes 3 + white-glove setup.
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
  /** Number of integrations included in the base price. */
  integrationsIncluded: number;
  /** Per-integration-per-month add-on price. null = not available on this tier. */
  additionalIntegrationPriceInr: number | null;
  /** Human-readable email-support response-time commitment. */
  supportResponseSla: string;
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
    integrationsIncluded: 0,
    additionalIntegrationPriceInr: null,
    supportResponseSla: "Email support, best-effort response",
    description: "Free trial — kick the tyres before you commit.",
    features: [
      "500 conversations / month (we cover OpenAI cost)",
      "1 admin seat",
      "Custom rubric + project-specific fatal rules",
      "All scoring + review-queue features",
      "Saved report templates",
      "Email support, best-effort response",
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
    integrationsIncluded: 0,
    additionalIntegrationPriceInr: 2_499,
    supportResponseSla: "Email support, 24-hour response",
    description: "For a single QA manager running daily audits.",
    features: [
      "Unlimited conversations (you bring your QA-engine key)",
      "1 seat included; ₹2,999/seat/month for more",
      "Custom rubric + project-specific fatal rules",
      "Two-tier review with custom SLA",
      "Saved report templates",
      "Live QA-engine usage tracking",
      "Integrations available as add-on (₹2,499 / month each)",
      "Email support, 24-hour response",
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
    integrationsIncluded: 1,
    additionalIntegrationPriceInr: 1_999,
    supportResponseSla: "Email support, 4-hour response",
    description: "For QA managers plus team leads on a single campaign.",
    features: [
      "Unlimited conversations (BYO QA-engine key)",
      "3 seats included; ₹2,999/seat/month for more",
      "Custom rubric + project-specific fatal rules",
      "Bulk team CSV import",
      "1 integration included (CRM, helpdesk or messenger)",
      "Additional integrations ₹1,999 / month each",
      "Email support, 4-hour response",
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
    integrationsIncluded: 3,
    additionalIntegrationPriceInr: 1_499,
    supportResponseSla: "Email + Slack support, 1-hour response",
    description: "For ops directors running multiple campaigns and audits.",
    features: [
      "Unlimited conversations (BYO QA-engine key)",
      "5 seats included; ₹2,499/seat/month for more",
      "Multiple rubrics for multi-campaign teams",
      "Custom rubric + project-specific fatal rules (per rubric)",
      "3 integrations included + white-glove setup",
      "Additional integrations ₹1,499 / month each",
      "Email + Slack support, 1-hour response",
      "Quarterly consulting hours with the QAScope team",
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
