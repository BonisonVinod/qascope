"use client";

import { useState } from "react";
import { cancelSubscription } from "./checkout-actions";

export function CancelButton({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to cancel your subscription? This will take effect at the end of your current billing cycle.")) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await cancelSubscription();
      if ("error" in result) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-500 dark:hover:text-red-400"
      >
        {loading ? "Canceling..." : "Cancel subscription"}
      </button>
      {error && (
        <p className="mt-2 text-[10px] text-red-500">{error}</p>
      )}
    </div>
  );
}
