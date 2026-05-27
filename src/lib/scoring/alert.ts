/**
 * Low-score alert dispatcher.
 *
 * Called by scoreConversation() immediately after a score is written.
 * Sends an email to all QA managers / admins on the client workspace
 * when the score falls below the client's configured pass threshold.
 *
 * Non-fatal: all errors are swallowed so a mail failure never breaks scoring.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendEmail } from "@/lib/email/send";
import { lowScoreAlertHtml } from "@/lib/email/templates/low-score-alert";

type SB = SupabaseClient<Database>;

export interface LowScoreAlertPayload {
  supabase: SB;
  clientId: string;
  clientName: string;
  qaScoreId: string;
  agentId: string | null;
  agentName: string;
  totalScore: number;
  passThreshold: number;
  conversationDate?: string;
}

export async function maybeSendLowScoreAlert(
  payload: LowScoreAlertPayload,
): Promise<void> {
  const {
    supabase,
    clientId,
    clientName,
    qaScoreId,
    agentId,
    agentName,
    totalScore,
    passThreshold,
    conversationDate,
  } = payload;

  // Only alert when the score is genuinely below threshold
  if (totalScore >= passThreshold) return;

  try {
    // 1. Get all QA manager + admin emails for this client
    const { data: managers } = await supabase
      .from("users")
      .select("email")
      .eq("client_id", clientId)
      .in("role", ["admin", "qa_manager"])
      .not("email", "is", null);

    const to = (managers ?? []).map((m) => m.email).filter(Boolean) as string[];
    if (!to.length) return; // nobody to notify

    // 2. Get agent email if available (agents table doesn't have email — optional)
    //    We still want to show agent name in the email.
    let agentEmail: string | undefined;
    if (agentId) {
      // agents table has no email column — check users table by matching name
      const { data: userRow } = await supabase
        .from("users")
        .select("email")
        .eq("client_id", clientId)
        .ilike("name", agentName)
        .maybeSingle();
      if (userRow?.email) agentEmail = userRow.email;
    }

    // 3. Get top failed criteria for this score (up to 3)
    const { data: failedDetails } = await supabase
      .from("qa_score_details")
      .select("criterion_id")
      .eq("qa_score_id", qaScoreId)
      .eq("score", 0)
      .limit(5);

    let failedCriteria: string[] = [];
    if (failedDetails?.length) {
      const criterionIds = failedDetails.map((d) => d.criterion_id);
      const { data: criteriaRows } = await supabase
        .from("qa_criteria")
        .select("name")
        .in("id", criterionIds);
      failedCriteria = (criteriaRows ?? []).map((c) => c.name);
    }

    // 4. Build the app URL for the direct link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const scoreUrl = `${appUrl}/results/${qaScoreId}`;

    // 5. Render and send
    const html = lowScoreAlertHtml({
      agentName,
      agentEmail,
      score: Math.round(totalScore),
      passThreshold,
      workspaceName: clientName,
      conversationDate,
      failedCriteria,
      scoreUrl,
    });

    await sendEmail({
      to,
      subject: `⚠ Low Score Alert — ${agentName} scored ${Math.round(totalScore)}/100 · ${clientName}`,
      html,
      text: `${agentName} scored ${Math.round(totalScore)}/100 (threshold: ${passThreshold}). View: ${scoreUrl}`,
    });
  } catch (err) {
    // Never propagate — email failure must not break the scoring pipeline
    console.error("[alert] Low-score alert failed:", err);
  }
}
