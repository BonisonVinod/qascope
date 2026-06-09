"use client";

import { useState } from "react";
import { createRazorpayOrder } from "./checkout-actions";


type Props = {
  isAdmin: boolean;
  estimatedUsageCost: number;
  estimatedChats: number;
};

export function TopUpButton({ isAdmin, estimatedUsageCost, estimatedChats }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Default top-up amount to their estimated usage, or at least 1000 chats
  const [chatsToBuy, setChatsToBuy] = useState<number>(Math.max(1000, estimatedChats));
  const amountInr = chatsToBuy * 1.5;

  async function handleCheckout() {
    if (!isAdmin) return;
    setError(null);
    setLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Could not load payment gateway. Check your internet connection.");
        return;
      }

      const result = await createRazorpayOrder(amountInr, chatsToBuy);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: result.keyId,
        order_id: result.orderId,
        name: "QAScope",
        description: `Top-Up: ${chatsToBuy.toLocaleString()} Conversation Credits`,
        theme: { color: "#18181b" },
        prefill: { email: result.prefillEmail },
        handler: (_response: any) => {
          setSuccess(true);
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

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Buy Conversation Credits</h3>
      </div>
      
      <p className="text-xs text-zinc-500 mb-6">
        Purchase credits to score conversations on Plan B. Unused credits roll over to the next month automatically.
      </p>

      {success ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Payment successful! Credits added to your balance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                Credits to buy
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={chatsToBuy}
                onChange={(e) => setChatsToBuy(Math.max(100, parseInt(e.target.value) || 0))}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div className="flex items-center self-end pb-2">
              <span className="text-zinc-400 font-medium px-2">×</span>
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Rate</p>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">₹1.50</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3 dark:bg-indigo-950/20">
            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-400">Total Price</p>
            <p className="text-lg font-black text-indigo-900 dark:text-indigo-400">
              ₹{amountInr.toLocaleString("en-IN")}
            </p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !isAdmin || amountInr < 1}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {loading ? "Opening checkout..." : isAdmin ? "Pay & Add Credits" : "Admin required"}
          </button>
          
          {error && (
            <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

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
