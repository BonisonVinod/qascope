import type { PlanName } from "@/lib/database.types";

/**
 * Plan catalogue — single source of truth for limits & pricing.
 * Pricing is in INR (₹) since QAScope's pilot market is India BPOs.
 * Razorpay subscription ids are wired in once Razorpay dashboard plans
 * are created; for now we ship a "manual" mode where upgrading writes a
 * subscription row directly.
 */
export type PlanDefinition = {
  name: PlanName;
  label: string;
  monthlyLimit: number;
  monthlyPriceInr: number;
  /** Number of teammate seats included in the plan. */
  seatsIncluded: number;
  /** Per-seat-per-month price in INR for additional seats over the included count. */
  additionalSeatPriceInr: number;
  description: string;
  features: string[];
  /** Razorpay plan id (set once you create a plan in Razorpay dashboard). */
  razorpayPlanId: string | null;
};

export const PLANS: Record<PlanName, PlanDefinition> = {
  pilot: {
    name: "pilot",
    label: "Pilot",
    monthlyLimit: 500,
    monthlyPriceInr: 0,
    seatsIncluded: 4,
    additionalSeatPriceInr: 0,
    description: "Free trial — kick the tyres before you commit.",
    features: [
      "500 conversations / month",
      "Up to 4 teammates",
      "All scoring + review queue features",
      "Email support",
    ],
    razorpayPlanId: null,
  },
  growth: {
    name: "growth",
    label: "Growth",
    monthlyLimit: 5_000,
    monthlyPriceInr: 9_999,
    seatsIncluded: 10,
    additionalSeatPriceInr: 499,
    description: "For teams of ~20–80 agents.",
    features: [
      "5,000 conversations / month",
      "10 teammates included; ₹499/seat/month for more",
      "Two-tier review with custom SLA",
      "Weekly reports",
      "Priority email support",
    ],
    razorpayPlanId: null,
  },
  pro: {
    name: "pro",
    label: "Pro",
    monthlyLimit: 25_000,
    monthlyPriceInr: 24_999,
    seatsIncluded: 25,
    additionalSeatPriceInr: 399,
    description: "For teams of ~80–200 agents with multiple campaigns.",
    features: [
      "25,000 conversations / month",
      "25 teammates included; ₹399/seat/month for more",
      "Custom rubric builder",
      "Priority + Slack support",
      "Pilot consulting hours",
    ],
    razorpayPlanId: null,
  },
};

export const PLAN_ORDER: PlanName[] = ["pilot", "growth", "pro"];

export function getPlan(name: PlanName | null | undefined): PlanDefinition {
  return PLANS[name ?? "pilot"] ?? PLANS.pilot;
}

export function formatInr(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}
