/**
 * GET /api/export/results
 *
 * Returns a CSV of the signed-in user's CURRENT-UPLOAD Results table,
 * matching the columns shown on /results. The Results page itself is
 * already scoped to the latest upload batch — this endpoint mirrors that
 * scope so the downloaded file matches what the user can see.
 *
 * Response headers set Content-Disposition: attachment so the browser
 * shows a save dialog.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote if needed: contains comma, quote, newline, or leading/trailing whitespace.
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();
  const clientId = appUser?.client_id;
  if (!clientId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("latest_upload_batch_id, name")
    .eq("id", clientId)
    .single();
  const latestBatchId = clientRow?.latest_upload_batch_id ?? null;

  // No upload yet → return an empty CSV (just the header row) so the
  // download still succeeds; the user knows there's nothing in the
  // current batch.
  if (!latestBatchId) {
    const csv = "Conversation date,Audited on,Agent,Team,Channel,Score,Confidence (%),Status,External ID,Coaching note\n";
    return csvResponse(csv, fileName(clientRow?.name));
  }

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, conversation_date, channel, external_conversation_id, agent_id")
    .eq("client_id", clientId)
    .eq("upload_batch_id", latestBatchId);
  const convList = convs ?? [];
  if (convList.length === 0) {
    const csv = "Conversation date,Audited on,Agent,Team,Channel,Score,Confidence (%),Status,External ID,Coaching note\n";
    return csvResponse(csv, fileName(clientRow?.name));
  }

  const convIds = convList.map((c) => c.id);
  const { data: scores } = await supabase
    .from("qa_scores")
    .select("id, total_score, confidence_score, status, coaching_note, created_at, conversation_id")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });
  const scoreList = scores ?? [];

  const agentIds = [
    ...new Set(convList.map((c) => c.agent_id).filter((x): x is string => !!x)),
  ];
  const { data: agents } = agentIds.length
    ? await supabase
        .from("agents")
        .select("id, agent_name, team_name")
        .in("id", agentIds)
    : { data: [] };
  const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));
  const convMap = new Map(convList.map((c) => [c.id, c]));

  const headers = [
    "Conversation date",
    "Audited on",
    "Agent",
    "Team",
    "Channel",
    "Score",
    "Confidence (%)",
    "Status",
    "External ID",
    "Coaching note",
  ];
  const lines = [headers.join(",")];

  for (const s of scoreList) {
    const c = convMap.get(s.conversation_id);
    if (!c) continue;
    const agent = c.agent_id ? agentMap.get(c.agent_id) : null;
    lines.push(
      [
        csvEscape(c.conversation_date),
        csvEscape(new Date(s.created_at).toISOString()),
        csvEscape(agent?.agent_name ?? "Unknown"),
        csvEscape(agent?.team_name ?? ""),
        csvEscape(c.channel.replace("_", " ")),
        csvEscape(s.total_score.toFixed(2)),
        csvEscape(Math.round(s.confidence_score * 100)),
        csvEscape(statusLabel(s.status)),
        csvEscape(c.external_conversation_id ?? ""),
        csvEscape(s.coaching_note ?? ""),
      ].join(","),
    );
  }

  return csvResponse(lines.join("\n") + "\n", fileName(clientRow?.name));
}

function statusLabel(s: string): string {
  switch (s) {
    case "critical_fail":
      return "Compliance fail";
    case "needs_review":
      return "Needs review";
    case "final":
      return "Final";
    default:
      return s;
  }
}

function fileName(workspaceName: string | null | undefined): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const ws = (workspaceName ?? "qascope")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${ws}-results-${stamp}.csv`;
}

function csvResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
