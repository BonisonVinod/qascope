"use client";

/**
 * NotificationBell
 *
 * A client-side component that shows a bell icon with an unread badge
 * in the dashboard navigation. Uses Supabase Realtime to receive new
 * notifications without polling.
 *
 * For agents: shows only their own notifications.
 * For managers/admins: shows all notifications in their workspace.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AlertSeverity } from "@/lib/database.types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Notification {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  clientId: string;
  userRole: string;
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "#ef4444",
  warning:  "#f59e0b",
  info:     "#6366f1",
};

const SEVERITY_BG: Record<AlertSeverity, string> = {
  critical: "rgba(239,68,68,0.12)",
  warning:  "rgba(245,158,11,0.12)",
  info:     "rgba(99,102,241,0.08)",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell({ userId, clientId, userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const isManager = ["admin", "qa_manager", "team_lead"].includes(userRole);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Fetch initial notifications ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    let query = supabase
      .from("agent_notifications")
      .select("id, severity, title, body, action_url, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!isManager) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("client_id", clientId);
    }

    const { data } = await query;
    if (data) setNotifications(data as Notification[]);
  }, [userId, clientId, isManager, supabase]);

  // ── Set up Supabase Realtime subscription ────────────────────────────────
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("agent_notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_notifications",
          filter: isManager
            ? `client_id=eq.${clientId}`
            : `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 30));
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, clientId, isManager, fetchNotifications, supabase]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Mark all as read ─────────────────────────────────────────────────────
  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from("agent_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
  }

  async function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await supabase.from("agent_notifications").update({ is_read: true }).eq("id", id);
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) markAllRead();
        }}
        title="Notifications"
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.08)",
          background: open ? "rgba(99,102,241,0.15)" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          transition: "background 0.2s",
          color: "#a1a1aa",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 99,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
              padding: "0 3px",
              border: "2px solid var(--bg, #18181b)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            overflowY: "auto",
            background: "rgba(18,18,20,0.98)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            zIndex: 1000,
            animation: "fadeDown 0.15s ease",
          }}
        >
          <style>{`
            @keyframes fadeDown {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: "1px 6px",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </p>
            <a
              href="/my-feedback"
              style={{ fontSize: 12, color: "#6366f1", textDecoration: "none" }}
            >
              View all →
            </a>
          </div>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#52525b",
                fontSize: 13,
              }}
            >
              No notifications yet
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {notifications.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.action_url ?? "#"}
                    onClick={() => markOneRead(n.id)}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "12px 16px",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: n.is_read ? "transparent" : SEVERITY_BG[n.severity],
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Severity dot */}
                    <div
                      style={{
                        flexShrink: 0,
                        marginTop: 4,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: SEVERITY_COLOR[n.severity],
                        boxShadow: n.is_read
                          ? "none"
                          : `0 0 6px ${SEVERITY_COLOR[n.severity]}`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: n.is_read ? 400 : 600,
                          color: "#e4e4e7",
                          lineHeight: 1.4,
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "#71717a",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.body}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: "#52525b",
                        }}
                      >
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
