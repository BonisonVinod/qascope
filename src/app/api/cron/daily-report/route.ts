/**
 * GET /api/cron/daily-report
 *
 * Cron endpoint — sends the day-end QA digest email to all QA managers
 * on every active client workspace.
 *
 * Scheduled via vercel.json at 12:30 UTC = 6:00 PM IST daily.
 * Manual test: GET /api/cron/daily-report?secret=<CRON_SECRET>
 *
 * Query strategy:
 *   1. conversations  (has client_id + agent_id + conversation_date)
 *   2. qa_scores      filtered by conversation_id IN (step 1 IDs)
 *   3. qa_score_details filtered by qa_score_id IN (step 2 IDs)
 * This avoids any reverse-join direction that PostgREST can't resolve.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { dailyReportHtml } from "@/lib/email/templates/daily-report";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const secretParam = req.nextUrl.searchParams.get("secret");
  if (
    CRON_SECRET &&
    authHeader !== `Bearer ${CRON_SECRET}` &&
    secretParam !== CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = new Date();

  // Use IST midnight as the day boundary
  const todayIST = new Date(
    today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  todayIST.setHours(0, 0, 0, 0);
  const tomorrowIST = new Date(todayIST);
  tomorrowIST.setDate(tomorrowIST.getDate() + 1);

  const reportDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  // Get all clients
  const { data: clients } = await supabase.from("clients").select("id, name");
  if (!clients?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "No clients found" });
  }

  let totalSent = 0;

  for (const client of clients) {
    try {
      // --- Step 0: QA manager emails for this client ---
      const { data: managers } = await supabase
        .from("users")
        .select("email")
        .eq("client_id", client.id)
        .in("role", ["admin", "qa_manager"])
        .not("email", "is", null);

      const managerEmails = (managers ?? [])
        .map((m) => m.email)
        .filter(Boolean) as string[];
      if (!managerEmails.length) continue;

      // --- Step 1: Conversations for this client scored today ---
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, agent_id")
        .eq("client_id", client.id)
        .gte("created_at", todayIST.toISOString())
        .lt("created_at", tomorrowIST.toISOString());

      if (!convos?.length) continue;

      const convoIds = convos.map((c) => c.id);
      const convoAgentMap = new Map(convos.map((c) => [c.id, c.agent_id]));

      // --- Step 2: QA scores for those conversations ---
      const { data: scores } = await supabase
        .from("qa_scores")
        .select("id, conversation_id, total_score, status")
        .in("conversation_id", convoIds)
        .eq("status", "final");

      if (!scores?.length) continue;

      const totalScored = scores.length;
      const passThreshold = 70;
      const passing = scores.filter((s) => (s.total_score ?? 0) >= passThreshold).length;
      const passRate = (passing / totalScored) * 100;
      const avgScore = scores.reduce((sum, s) => sum + (s.total_score ?? 0), 0) / totalScored;

      // --- Step 3: Bottom agents by avg score ---
      const agentScoreMap = new Map<string, { total: number; count: number }>();
      for (const s of scores) {
        const agentId = convoAgentMap.get(s.conversation_id ?? "");
        if (!agentId) continue;
        const entry = agentScoreMap.get(agentId) ?? { total: 0, count: 0 };
        entry.total += s.total_score ?? 0;
        entry.count += 1;
        agentScoreMap.set(agentId, entry);
      }

      const agentIds = [...agentScoreMap.keys()];
      const { data: agentRows } = agentIds.length
        ? await supabase.from("agents").select("id, agent_name").in("id", agentIds)
        : { data: [] };

      const agentNameMap = new Map((agentRows ?? []).map((a) => [a.id, a.agent_name]));

      const bottomAgents = [...agentScoreMap.entries()]
        .map(([id, { total, count }]) => ({
          name: agentNameMap.get(id) ?? "Unknown Agent",
          score: total / count,
          count,
        }))
        .filter((a) => a.score < passThreshold)
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);

      // --- Step 4: Top failed criteria from qa_score_details ---
      const scoreIds = scores.map((s) => s.id);
      const criteriaFailMap = new Map<string, number>();

      if (scoreIds.length) {
        // Fetch failed detail rows (score=0) — criterion_id only, no join
        const { data: details } = await supabase
          .from("qa_score_details")
          .select("criterion_id")
          .in("qa_score_id", scoreIds)
          .eq("score", 0);

        const failedCriterionIds = [
          ...new Set((details ?? []).map((d) => d.criterion_id)),
        ];

        if (failedCriterionIds.length) {
          // Count failures per criterion_id
          for (const d of details ?? []) {
            criteriaFailMap.set(
              d.criterion_id,
              (criteriaFailMap.get(d.criterion_id) ?? 0) + 1,
            );
          }

          // Resolve criterion names in one batch query
          const { data: criteriaRows } = await supabase
            .from("qa_criteria")
            .select("id, name")
            .in("id", failedCriterionIds);

          const criteriaNameMap = new Map(
            (criteriaRows ?? []).map((c) => [c.id, c.name]),
          );

          // Replace criterion_id keys with human-readable names
          for (const [id, count] of criteriaFailMap.entries()) {
            const name = criteriaNameMap.get(id);
            if (name && name !== id) {
              criteriaFailMap.set(name, count);
              criteriaFailMap.delete(id);
            }
          }
        }
      }

      const topFailedCriteria = [...criteriaFailMap.entries()]
        .map(([criterion, failCount]) => ({ criterion, failCount }))
        .sort((a, b) => b.failCount - a.failCount)
        .slice(0, 5);

      // --- Step 5: Send the email ---
      const html = dailyReportHtml({
        workspaceName: client.name,
        reportDate,
        totalScored,
        passRate,
        avgScore,
        bottomAgents,
        topFailedCriteria,
        reportUrl: `${APP_URL}/reports`,
      });

      await sendEmail({
        to: managerEmails,
        subject: `QA Daily Report — ${reportDate} · ${client.name}`,
        html,
      });

      totalSent += managerEmails.length;
    } catch (err) {
      console.error(`[cron/daily-report] Error for client ${client.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent, date: reportDate });
}
