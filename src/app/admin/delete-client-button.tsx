"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "./admin-actions";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    // Second click — confirmed
    setMessage(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if ("error" in result) {
        setMessage(`❌ ${result.error}`);
        setConfirming(false);
      } else {
        setMessage("✓ Deleted");
        router.refresh();
      }
    });
  }

  if (message) {
    return <span className="text-xs text-zinc-400">{message}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`rounded px-2 py-1 text-xs font-medium text-white transition disabled:opacity-40 ${
          confirming
            ? "bg-red-600 hover:bg-red-500 animate-pulse"
            : "bg-zinc-700 hover:bg-red-700"
        }`}
        title={confirming ? "Click again to confirm deletion" : `Delete ${clientName}`}
      >
        {isPending ? "Deleting…" : confirming ? "Confirm?" : "Delete"}
      </button>
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
