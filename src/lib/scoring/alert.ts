/**
 * dispatchAlerts — unified alert dispatcher.
 *
 * Called by scoreConversation() immediately after a score is written.
 *
 * Responsibilities:
 *  - critical_fail: red email to all managers/admins + in-app notification
 *    for managers + browser push to managers (if subscribed) + browser push
 *    to agent (if subscribed) + in-app notification for agent.
 *  - low score: yellow email to managers + in-app notification for managers.
 *  - always: info/warning in-app notification for agent's personal queue.
 *
 * Non-fatal: all errors are swallowed so alert failures never break scoring.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AlertSeverity } from "@/lib/database.types";
import { sendEmail, fromEmail } from "@/lib/email/send";
import { lowScoreAlertHtml } from "@/lib/email/templates/low-score-alert";
import { criticalFailAlertHtml } from "@/lib/email/templates/critical-fail-alert";
import type { ScoreStatus } from "@/lib/database.types";

type SB = SupabaseClient<Database>;

export interface DispatchAlertsPayload {
  supabase: SB;
  clientId: string;
  clientName: string;
  qaScoreId: string;
  agentId: string | null;
  agentName: string;
  totalScore: number;
  passThreshold: number;
  status: ScoreStatus;
  conversationDate?: string;
  failedCriteria?: string[];
}

// ─── Helper: send a browser push notification ──────────────────────────────

async function sendPushToUser(
  supabase: SB,
  userId: string,
  payload: { title: string; body: string; url: string; severity: AlertSeverity },
): Promise<void> {
  // Use service-role bypass: fetch all push subscriptions for this user
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  // Dynamically import web-push (server-only, avoids edge runtime issues)
  const webpush = await import("web-push");

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:support@qascope.ai";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[push] VAPID keys not set — push notifications disabled.");
    return;
  }

  webpush.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const pushPayload = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.default.sendNotification(
        sub.subscription as unknown as Parameters<typeof webpush.default.sendNotification>[0],
        pushPayload,
      );
    } catch (err) {
      // Subscription expired or invalid — clean it up
      console.warn("[push] Push failed (subscription may be stale):", err);
    }
  }
}

// ─── Helper: insert in-app notification ───────────────────────────────────

async function insertNotification(
  supabase: SB,
  params: {
    clientId: string;
    userId: string;
    qaScoreId: string;
    severity: AlertSeverity;
    title: string;
    body: string;
    actionUrl: string;
  },
): Promise<void> {
  await supabase.from("agent_notifications").insert({
    client_id: params.clientId,
    user_id: params.userId,
    qa_score_id: params.qaScoreId,
    severity: params.severity,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl,
  });
}

// ─── Main dispatcher ───────────────────────────────────────────────────────

export async function dispatchAlerts(payload: DispatchAlertsPayload): Promise<void> {
  const {
    supabase,
    clientId,
    clientName,
    qaScoreId,
    agentId,
    agentName,
    totalScore,
    passThreshold,
    status,
    conversationDate,
    failedCriteria = [],
  } = payload;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const scoreUrl = `${appUrl}/results/${qaScoreId}`;
  const roundedScore = Math.round(totalScore);
  const isCriticalFail = status === "critical_fail";
  const isLowScore = totalScore < passThreshold;

  try {
    // ── 1. Load alert preferences ──────────────────────────────────────────
    const { data: prefs } = await supabase
      .from("alert_preferences")
      .select("email_on_critical_fail, email_on_low_score, alert_score_threshold")
      .eq("client_id", clientId)
      .maybeSingle();

    const emailOnCritical = prefs?.email_on_critical_fail ?? true;
    const emailOnLowScore = prefs?.email_on_low_score ?? true;
    // Use custom threshold if set, otherwise fall back to workspace pass_threshold
    const alertThreshold = prefs?.alert_score_threshold ?? passThreshold;

    // ── 2. Get all managers / admins for this workspace ────────────────────
    const { data: managers } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("client_id", clientId)
      .in("role", ["admin", "qa_manager", "team_lead"]);

    const managerEmails = (managers ?? [])
      .map((m) => m.email)
      .filter(Boolean) as string[];

    // ── 3. Find the agent's user record (if agent maps to a user account) ──
    let agentUserId: string | null = null;
    if (agentId) {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("client_id", clientId)
        .ilike("name", agentName)
        .maybeSingle();
      if (userRow?.id) agentUserId = userRow.id;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL FAIL path
    // ─────────────────────────────────────────────────────────────────────────
    if (isCriticalFail) {
      // 3a. Email all managers (always-on for critical fail, unless workspace disabled)
      if (emailOnCritical && managerEmails.length > 0) {
        const html = criticalFailAlertHtml({
          agentName,
          score: roundedScore,
          passThreshold,
          workspaceName: clientName,
          conversationDate,
          failedCriteria,
          scoreUrl,
        });

        const isSandbox = fromEmail.includes("resend.dev");
        const recipients = isSandbox
          ? [process.env.SANDBOX_RECIPIENT ?? "supportqascope@gmail.com"]
          : managerEmails;

        await sendEmail({
          to: recipients,
          subject: `🚨 Critical Fail — ${agentName} · ${clientName}`,
          html,
          text: `CRITICAL FAIL: ${agentName} scored ${roundedScore}/100 on an audit. View: ${scoreUrl}`,
        });
      }

      // 3b. In-app notifications + push for every manager
      for (const manager of managers ?? []) {
        await insertNotification(supabase, {
          clientId,
          userId: manager.id,
          qaScoreId,
          severity: "critical",
          title: `🚨 Critical Fail — ${agentName}`,
          body: `Scored ${roundedScore}/100. Immediate review required.`,
          actionUrl: scoreUrl,
        });

        // Browser push (manager opted in if they have a subscription)
        await sendPushToUser(supabase, manager.id, {
          title: `🚨 Critical Fail Alert`,
          body: `${agentName} scored ${roundedScore}/100 in ${clientName}. Tap to review.`,
          url: scoreUrl,
          severity: "critical",
        });
      }

      // 3c. Browser push + in-app for the agent themselves
      if (agentUserId) {
        await insertNotification(supabase, {
          clientId,
          userId: agentUserId,
          qaScoreId,
          severity: "critical",
          title: `🚨 Your audit was flagged as Critical Fail`,
          body: `You scored ${roundedScore}/100. Please review the feedback immediately.`,
          actionUrl: scoreUrl,
        });

        await sendPushToUser(supabase, agentUserId, {
          title: `🚨 Critical Fail on your audit`,
          body: `You scored ${roundedScore}/100. Tap to view the full feedback.`,
          url: scoreUrl,
          severity: "critical",
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOW SCORE path (but not critical fail — that was handled above)
    // ─────────────────────────────────────────────────────────────────────────
    else if (isLowScore && totalScore < alertThreshold) {
      // Email managers
      if (emailOnLowScore && managerEmails.length > 0) {
        const html = lowScoreAlertHtml({
          agentName,
          score: roundedScore,
          passThreshold,
          workspaceName: clientName,
          conversationDate,
          failedCriteria,
          scoreUrl,
        });

        const isSandbox = fromEmail.includes("resend.dev");
        const recipients = isSandbox
          ? [process.env.SANDBOX_RECIPIENT ?? "supportqascope@gmail.com"]
          : managerEmails;

        await sendEmail({
          to: recipients,
          subject: `⚠ Low Score Alert — ${agentName} scored ${roundedScore}/100 · ${clientName}`,
          html,
          text: `${agentName} scored ${roundedScore}/100 (threshold: ${passThreshold}). View: ${scoreUrl}`,
        });
      }

      // In-app notifications for managers
      for (const manager of managers ?? []) {
        await insertNotification(supabase, {
          clientId,
          userId: manager.id,
          qaScoreId,
          severity: "warning",
          title: `⚠ Low Score — ${agentName}`,
          body: `Scored ${roundedScore}/100 (threshold: ${passThreshold}/100).`,
          actionUrl: scoreUrl,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALWAYS: silent info/warning notification for agent's personal queue
    // ─────────────────────────────────────────────────────────────────────────
    if (agentUserId && !isCriticalFail) {
      // Critical fail is already handled above with a higher-severity message
      const severity: AlertSeverity = isLowScore ? "warning" : "info";
      const title =
        severity === "warning"
          ? `⚠ Audit Result — ${roundedScore}/100`
          : `✓ Audit Complete — ${roundedScore}/100`;
      const body =
        severity === "warning"
          ? `Your score is below the pass threshold (${passThreshold}/100). Review your feedback.`
          : `Great work! Your audit score is ${roundedScore}/100.`;

      await insertNotification(supabase, {
        clientId,
        userId: agentUserId,
        qaScoreId,
        severity,
        title,
        body,
        actionUrl: scoreUrl,
      });
    }
  } catch (err) {
    // Never propagate — alert failure must not break the scoring pipeline
    console.error("[alerts] dispatchAlerts failed:", err);
  }
}

// ─── Legacy export — kept for backward compatibility ──────────────────────
// score-conversation.ts previously called maybeSendLowScoreAlert directly.
// That call is now replaced by dispatchAlerts, but we keep this no-op shim
// in case any other code imports it.
export async function maybeSendLowScoreAlert(_payload: unknown): Promise<void> {
  console.warn(
    "[alerts] maybeSendLowScoreAlert is deprecated. Use dispatchAlerts instead.",
  );
}
