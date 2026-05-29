"use client";

import { useState } from "react";
import { createRazorpaySubscription } from "./checkout-actions";
import type { PlanName } from "@/lib/database.types";
import { getPlan } from "@/lib/billing/plans";

declare global {
  interface Window {
    // Razorpay checkout script injected at runtime
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { email: string };
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string }) => void;
  modal: { ondismiss: () => void };
};

type Props = {
  planName: PlanName;
  planLabel: string;
  pricePerSeat: number;
  currentPlan: PlanName | null;
  seatCount: number;
  isAdmin: boolean;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function CheckoutButton({
  planName,
  planLabel,
  pricePerSeat,
  currentPlan,
  seatCount,
  isAdmin,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const plan = getPlan(planName);
  const chargedSeats = Math.max(plan.minSeats, seatCount);
  const monthlyTotal = pricePerSeat * chargedSeats;
  const isCurrent = currentPlan === planName;

  async function handleCheckout() {
    setError(null);
    setLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Could not load payment gateway. Check your internet connection.");
        return;
      }

      const result = await createRazorpaySubscription(planName, seatCount);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const rzp = new window.Razorpay({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: "QAScope",
        description: `${planLabel} Plan — ${chargedSeats} seats × ₹${pricePerSeat}/seat/mo`,
        theme: { color: "#18181b" },
        prefill: { email: result.prefillEmail },
        handler: (_response) => {
          // Payment success — webhook will activate the plan server-side
          setSuccess(true);
          // Refresh page after a short delay to show updated plan
          setTimeout(() => window.location.reload(), 2000);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.open();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-xs text-zinc-400">Contact your admin to change the plan.</p>
    );
  }

  if (success) {
    return (
      <div className="rounded-md bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ Payment successful! Your plan is being activated…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={loading || isCurrent}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          isCurrent
            ? "cursor-default bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
            : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Opening checkout…
          </span>
        ) : isCurrent ? (
          "Current plan"
        ) : (
          `Upgrade to ${planLabel} — ₹${monthlyTotal.toLocaleString("en-US")}/mo${
            chargedSeats > seatCount ? ` (Min ${plan.minSeats} seats)` : ""
          }`
        )}
      </button>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
