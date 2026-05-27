/**
 * GET /api/export/reports?week=YYYY-MM-DD
 *
 * Returns a multi-section CSV mirroring what /reports renders for the
 * given week (defaults to current ISO week). Sections:
 *
 *   1. Per-agent breakdown
 *   2. Per-channel breakdown
 *   3. Headline KPIs
 *
 * Sections are separated by a blank line and a section title row.
 * Excel and Google Sheets both render that fine — the user can see
 * everything in one download without us building a multi-sheet XLSX.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isoWeekRange } from "@/lib/reports/iso-week";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // Resolve the range. Custom (?from=&to=) takes precedence over ?week=,
  // matching the Reports page UI.
  function parseDate(s: string | null): Date | null {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fromDate = parseDate(fromParam);
  const toDate = parseDate(toParam);

  let start: Date;
  let end: Date;
  let label: string;
  if (fromDate && toDate) {
    start = fromDate;
    end = new Date(toDate.getTime() + 86400 * 1000);
    label = `${fromDate.toISOString().slice(0, 10)} \u2192 ${toDate.toISOString().slice(0, 10)}`;
  } else {
    const reference = weekParam ? new Date(weekParam) : new Date();
    if (Number.isNaN(reference.getTime())) {
      return NextResponse.json({ error: "Invalid week" }, { status: 400 });
    }
    const w = isoWeekRange(reference);
    start = w.start;
    end = w.end;
    label = w.label;
  }

  const { data: scores } = await supabase
    .from("qa_scores")
    .select(
      "id, total_score, original_total_score, appealed_at, status, conversation_id",
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .limit(5000);
  const list = scores ?? [];

  const convIds = [...new Set(list.map((s) => s.conversation_id))];
  const { data: convs } = convIds.length
    ? await supabase
        .from("conversations")
        .select("id, agent_id, channel")
        .in("id", convIds)
    : { data: [] };
  const agentIds = [
    ...new Set((convs ?? []).map((c) => c.agent_id).filter((x): x is string => !!x)),
  ];
  const { data: agents } = agentIds.length
    ? await supabase
        .from("agents")
        .select("id, agent_name, team_name")
        .in("id", agentIds)
    : { data: [] };
  const convMap = new Map((convs ?? []).map((c) => [c.id, c]));
  const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));

  // Headline KPIs
  const total = list.length;
  const avgCurrent = avg(list.map((s) => s.total_score));
  const avgOriginal = avg(list.map((s) => s.original_total_score));
  const compliance = list.filter((s) => s.status === "critical_fail").length;
  const needsReview = list.filter((s) => s.status === "needs_review").length;
  const finalCount = list.filter((s) => s.status === "final").length;
  const appealed = list.filter((s) => s.appealed_at !== null).length;

  // Per-agent rollup
  type AgentRow = {
    name: string;
    team: string;
    n: number;
    sumCur: number;
    sumOrig: number;
    compliance: number;
    appealed: number;
  };
  const agentBuckets = new Map<string, AgentRow>();
  for (const s of list) {
    const c = convMap.get(s.conversation_id);
    if (!c?.agent_id) continue;
    const a = agentMap.get(c.agent_id);
    if (!a) continue;
    const key = c.agent_id;
    const row =
      agentBuckets.get(key) ??
      { name: a.agent_name, team: a.team_name ?? "", n: 0, sumCur: 0, sumOrig: 0, compliance: 0, appealed: 0 };
    row.n += 1;
    row.sumCur += s.total_score;
    row.sumOrig += s.original_total_score;
    if (s.status === "critical_fail") row.compliance += 1;
    if (s.appealed_at !== null) row.appealed += 1;
    agentBuckets.set(key, row);
  }
  const agentRows = [...agentBuckets.values()].sort((a, b) => b.n - a.n);

  // Per-channel rollup
  type ChannelRow = { channel: string; n: number; sumCur: number; sumOrig: number };
  const channelBuckets = new Map<string, ChannelRow>();
  for (const s of list) {
    const c = convMap.get(s.conversation_id);
    if (!c) continue;
    const row = channelBuckets.get(c.channel) ?? { channel: c.channel, n: 0, sumCur: 0, sumOrig: 0 };
    row.n += 1;
    row.sumCur += s.total_score;
    row.sumOrig += s.original_total_score;
    channelBuckets.set(c.channel, row);
  }
  const channelRows = [...channelBuckets.values()].sort((a, b) => b.n - a.n);

  const lines: string[] = [];
  lines.push(`QAScope weekly report,${csvEscape(label)},Week,${csvEscape(start.toISOString().slice(0, 10))} to ${csvEscape(end.toISOString().slice(0, 10))}`);
  lines.push("");

  lines.push("Headline KPIs");
  lines.push("Metric,Value");
  lines.push(`Conversations scored,${total}`);
  lines.push(`Average score,${avgCurrent.toFixed(2)}`);
  lines.push(`Original QA score,${avgOriginal.toFixed(2)}`);
  lines.push(`Score delta (final - original),${(avgCurrent - avgOriginal).toFixed(2)}`);
  lines.push(`Compliance fails,${compliance}`);
  lines.push(`Needs review,${needsReview}`);
  lines.push(`Final,${finalCount}`);
  lines.push(`Cases appealed,${appealed}`);
  lines.push("");

  lines.push("Per-agent breakdown");
  lines.push("Agent,Team,Channel(s),Volume,Original QA score,Final score,Delta,Compliance fails,Appealed");
  for (const a of agentRows) {
    // Channels for this agent — derive from convList intersect agent's convs
    // (we kept channel rollup global; per-agent channel mix is best-effort)
    const channelsForAgent = new Set<string>();
    for (const s of list) {
      const c = convMap.get(s.conversation_id);
      if (c?.agent_id && agentMap.get(c.agent_id)?.agent_name === a.name && (agentMap.get(c.agent_id)?.team_name ?? "") === a.team) {
        channelsForAgent.add(c.channel);
      }
    }
    lines.push(
      [
        csvEscape(a.name),
        csvEscape(a.team),
        csvEscape([...channelsForAgent].map((c) => c.replace("_", " ")).join(" / ")),
        a.n,
        (a.sumOrig / a.n).toFixed(2),
        (a.sumCur / a.n).toFixed(2),
        ((a.sumCur - a.sumOrig) / a.n).toFixed(2),
        a.compliance,
        a.appealed,
      ].join(","),
    );
  }
  lines.push("");

  lines.push("Per-channel breakdown");
  lines.push("Channel,Volume,Original QA score,Final score,Delta");
  for (const r of channelRows) {
    lines.push(
      [
        csvEscape(r.channel.replace("_", " ")),
        r.n,
        (r.sumOrig / r.n).toFixed(2),
        (r.sumCur / r.n).toFixed(2),
        ((r.sumCur - r.sumOrig) / r.n).toFixed(2),
      ].join(","),
    );
  }

  const filename = `qascope-report-${start.toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
