import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationPrefs } from "./notification-prefs";

export const dynamic = "force-dynamic";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "🚨 Critical",
  warning: "⚠ Warning",
  info: "✓ Info",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#6366f1",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default async function MyFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("users")
    .select("name, role, client_id")
    .eq("id", user.id)
    .single();

  if (!appUser?.client_id) redirect("/dashboard");

  const isManager = ["admin", "qa_manager", "team_lead"].includes(
    appUser?.role ?? "",
  );

  // Fetch notifications
  let query = supabase
    .from("agent_notifications")
    .select("id, severity, title, body, action_url, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isManager) {
    query = query.eq("user_id", user.id);
  } else {
    query = query.eq("client_id", appUser.client_id);
  }

  const { data: notifications } = await query;
  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">My Feedback</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isManager
            ? "All workspace audit alerts and notifications."
            : "Your personal audit results and feedback queue."}
          {unreadCount > 0 && (
            <span className="ml-2 inline-block rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      {/* Push Notification Preferences */}
      <NotificationPrefs />

      {/* Notification Feed */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-3">
          Notifications
        </h2>

        {items.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Audit results will appear here once scoring is complete.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            {items.map((n, idx) => (
              <a
                key={n.id}
                href={n.action_url ?? "#"}
                className={`flex items-start gap-4 px-6 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  idx !== items.length - 1
                    ? "border-b border-zinc-100 dark:border-zinc-800"
                    : ""
                } ${!n.is_read ? "bg-zinc-50/60 dark:bg-zinc-800/30" : ""}`}
                style={{ textDecoration: "none" }}
              >
                {/* Severity indicator */}
                <div
                  className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
                  style={{
                    background: SEVERITY_COLOR[n.severity] ?? "#6366f1",
                    boxShadow: !n.is_read
                      ? `0 0 6px ${SEVERITY_COLOR[n.severity] ?? "#6366f1"}`
                      : "none",
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${SEVERITY_COLOR[n.severity]}20`,
                        color: SEVERITY_COLOR[n.severity],
                      }}
                    >
                      {SEVERITY_LABEL[n.severity] ?? n.severity}
                    </span>
                    {!n.is_read && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        New
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm ${!n.is_read ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.body}</p>
                </div>

                <p className="flex-shrink-0 text-xs text-zinc-400 whitespace-nowrap">
                  {timeAgo(n.created_at)}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
