"use client";

/**
 * NotificationPrefs
 *
 * Agent self-service card to enable or disable browser push notifications.
 * Shows current status and lets the user toggle with one click.
 */

import { useState, useEffect } from "react";

const DISMISSED_KEY = "qascope_push_dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type PushStatus = "unsupported" | "denied" | "enabled" | "disabled" | "loading";

export function NotificationPrefs() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Check if actually subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setStatus(sub ? "enabled" : "disabled");
        });
      });
    } else {
      setStatus("disabled");
    }
  }, []);

  async function enable() {
    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setWorking(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
        setWorking(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setStatus("enabled");
        setWorking(false);
        return;
      }

      const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes as any,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent.slice(0, 200),
        }),
      });

      localStorage.removeItem(DISMISSED_KEY);
      setStatus("enabled");
    } catch (err) {
      console.error("[push] Enable failed:", err);
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch("/api/push/subscribe", { method: "DELETE" });

      localStorage.setItem(DISMISSED_KEY, "true");
      setStatus("disabled");
    } catch (err) {
      console.error("[push] Disable failed:", err);
    } finally {
      setWorking(false);
    }
  }

  const statusConfig = {
    loading: { icon: "⏳", text: "Checking...", color: "#71717a", desc: "" },
    unsupported: {
      icon: "🚫",
      text: "Not supported",
      color: "#71717a",
      desc: "Your browser does not support push notifications.",
    },
    denied: {
      icon: "🔕",
      text: "Blocked by browser",
      color: "#ef4444",
      desc: "You have blocked notifications. Reset this in your browser site settings.",
    },
    enabled: {
      icon: "🔔",
      text: "Push notifications enabled",
      color: "#22c55e",
      desc: "You will receive instant alerts for critical fails, even when this tab is in the background.",
    },
    disabled: {
      icon: "🔕",
      text: "Push notifications off",
      color: "#71717a",
      desc: "Enable to receive instant alerts for critical fails on top of any open application.",
    },
  }[status];

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-3">
        Push Notifications
      </h2>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <span style={{ fontSize: 24 }}>{statusConfig.icon}</span>
          <div className="flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: statusConfig.color }}
            >
              {statusConfig.text}
            </p>
            {statusConfig.desc && (
              <p className="mt-1 text-xs text-zinc-500">{statusConfig.desc}</p>
            )}
          </div>

          {status === "disabled" && (
            <button
              onClick={enable}
              disabled={working}
              className="flex-shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition"
            >
              {working ? "Enabling…" : "Enable"}
            </button>
          )}
          {status === "enabled" && (
            <button
              onClick={disable}
              disabled={working}
              className="flex-shrink-0 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
            >
              {working ? "Disabling…" : "Turn off"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
