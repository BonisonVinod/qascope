"use client";

/**
 * PushNotificationProvider
 *
 * Renders nothing visible. On mount, checks if:
 *  1. The browser supports push notifications.
 *  2. The user hasn't already subscribed (checked via a cookie flag).
 *
 * If both are true, shows a dismissable banner asking the user to enable
 * push notifications. On "Enable", it:
 *  1. Registers the service worker.
 *  2. Subscribes to push via PushManager.
 *  3. POSTs the subscription to /api/push/subscribe.
 *
 * Applies to ALL users (agents and managers alike).
 */

import { useEffect, useState } from "react";

const DISMISSED_KEY = "qascope_push_dismissed";

export function PushNotificationProvider() {
  const [showBanner, setShowBanner] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    // Only run in a secure context (https or localhost)
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    // Don't show if already dismissed or already granted
    if (
      localStorage.getItem(DISMISSED_KEY) === "true" ||
      Notification.permission === "granted" ||
      Notification.permission === "denied"
    ) {
      // If already granted, register service worker silently
      if (Notification.permission === "granted") {
        registerAndSubscribe().catch(() => {});
      }
      return;
    }

    setShowBanner(true);
  }, []);

  async function registerAndSubscribe() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) return; // already registered

    // Convert VAPID key from base64url to Uint8Array
    const keyBytes = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes as any,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent.slice(0, 200),
      }),
    });
  }

  async function handleEnable() {
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerAndSubscribe();
        setStatus("done");
        setShowBanner(false);
      } else {
        setStatus("error");
        setShowBanner(false);
        localStorage.setItem(DISMISSED_KEY, "true");
      }
    } catch (err) {
      console.error("[push] Failed to subscribe:", err);
      setStatus("error");
      setShowBanner(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(480px, calc(100vw - 32px))",
        background: "rgba(24, 24, 27, 0.96)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(99,102,241,0.4)",
        borderRadius: "14px",
        padding: "16px 20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        animation: "slideUp 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Bell icon */}
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        🔔
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#f4f4f5",
            lineHeight: 1.4,
          }}
        >
          Enable push notifications
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#a1a1aa", lineHeight: 1.4 }}>
          Get instant alerts for critical fails even when this tab is in the
          background.
        </p>
      </div>

      {/* Actions */}
      <div style={{ flexShrink: 0, display: "flex", gap: 8 }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #3f3f46",
            background: "transparent",
            color: "#a1a1aa",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          disabled={status === "loading"}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "Enabling…" : "Enable"}
        </button>
      </div>
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
