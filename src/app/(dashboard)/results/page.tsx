import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ChannelType, ScoreStatus } from "@/lib/database.types";
import { ScoreButton } from "./score-button";

export const dynamic = "force-dynamic";

type ScoredRow = {
  id: string;
  total_score: number;
  confidence_score: number;
  status: ScoreStatus;
  coaching_note: string | null;
  /** When the conversation was QA-audited (qa_scores.created_at). */
  audited_at: string;
  conversation_id: string;
  /** When the conversation actually took place. */
  conversation_date: string;
  channel: ChannelType;
  external_id: string | null;
  agent_name: string;
};

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user!.id)
    .single();

  const clientId = appUser?.client_id;

  // Always restrict Results to the most recent upload batch. Old data
  // remains in the database (Reports has access to it) but should never
  // show up here — the user reviews each upload as a discrete session.
  let latestBatchId: string | null = null;
  if (clientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("latest_upload_batch_id")
      .eq("id", clientId)
      .single();
    latestBatchId = clientRow?.latest_upload_batch_id ?? null;
  }

  // Pre-compute the conversation ids that belong to the latest batch OR real-time streams (no batch).
  let batchConvIds: string[] = [];
  if (clientId) {
    let query = supabase
      .from("conversations")
      .select("id")
      .eq("client_id", clientId);
    if (latestBatchId) {
      query = query.or(`upload_batch_id.eq.${latestBatchId},upload_batch_id.is.null`);
    } else {
      query = query.is("upload_batch_id", null);
    }
    const { data: batchConvs } = await query
      .order("created_at", { ascending: false })
      .limit(1000);
    batchConvIds = (batchConvs ?? []).map((c) => c.id);
  }

  const totalConvs = batchConvIds.length;

  let totalScored = 0;
  if (batchConvIds.length > 0) {
    const { count } = await supabase
      .from("qa_scores")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", batchConvIds);
    totalScored = count ?? 0;
  }

  const unscored = totalConvs - totalScored;

  let rawScores: Array<{
    id: string;
    total_score: number;
    confidence_score: number;
    status: ScoreStatus;
    coaching_note: string | null;
    created_at: string;
    conversation_id: string;
  }> = [];
  if (batchConvIds.length > 0) {
    const { data } = await supabase
      .from("qa_scores")
      .select(
        "id, total_score, confidence_score, status, coaching_note, created_at, conversation_id",
      )
      .order("created_at", { ascending: false })
      .limit(200)
      .in("conversation_id", batchConvIds);
    rawScores = data ?? [];
  }

  let rows: ScoredRow[] = [];
  if (rawScores && rawScores.length > 0) {
    const convIds = rawScores.map((s) => s.conversation_id);
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, conversation_date, channel, external_conversation_id, agent_id")
      .in("id", convIds);

    const agentIds = [
      ...new Set((convs ?? []).map((c) => c.agent_id).filter((x): x is string => !!x)),
    ];
    const { data: agents } =
      agentIds.length > 0
        ? await supabase.from("agents").select("id, agent_name").in("id", agentIds)
        : { data: [] };

    const convMap = new Map((convs ?? []).map((c) => [c.id, c]));
    const agentMap = new Map((agents ?? []).map((a) => [a.id, a.agent_name]));

    rows = rawScores
      .map((s) => {
        const c = convMap.get(s.conversation_id);
        if (!c) return null;
        return {
          id: s.id,
          total_score: s.total_score,
          confidence_score: s.confidence_score,
          status: s.status,
          coaching_note: s.coaching_note,
          audited_at: s.created_at,
          conversation_id: s.conversation_id,
          conversation_date: c.conversation_date,
          channel: c.channel,
          external_id: c.external_conversation_id,
          agent_name: c.agent_id ? agentMap.get(c.agent_id) ?? "Unknown" : "Unknown",
        } satisfies ScoredRow;
      })
      .filter((x): x is ScoredRow => x !== null);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {totalConvs > 0
              ? `${totalScored} scored · ${unscored > 0 ? `${unscored} pending` : "all caught up"} · current workspace`
              : "No conversations ingested yet."}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Showing conversations from your latest upload batch and real-time streams. Older
            data lives in <Link href="/reports" className="underline-offset-2 hover:underline">Reports</Link>.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <a
            href="/api/export/results"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Download these results as a CSV"
          >
            Download CSV
          </a>
          <ScoreButton pendingCount={unscored} totalConversations={totalConvs} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            {latestBatchId
              ? "Nothing scored yet for this upload. Click “Score pending” to begin."
              : "Nothing here yet. Upload a CSV to start an audit."}
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3">Conversation date</th>
                <th className="px-4 py-3">Audited on</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">External ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 text-zinc-500">
                    {r.conversation_date}
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 text-zinc-500">
                    {new Date(r.audited_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 font-medium">
                    {r.agent_name}
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 text-zinc-500">
                    {r.channel.replace("_", " ")}
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 font-semibold">
                    {r.total_score.toFixed(1)}
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3 text-zinc-500">
                    {(r.confidence_score * 100).toFixed(0)}%
                  </LinkCell>
                  <LinkCell href={`/results/${r.id}`} className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </LinkCell>
                  <LinkCell
                    href={`/results/${r.id}`}
                    className="px-4 py-3 font-mono text-xs text-zinc-500"
                  >
                    {r.external_id ?? "—"}
                  </LinkCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LinkCell({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td className="p-0">
      <Link href={href} className={`block ${className ?? ""}`}>
        {children}
      </Link>
    </td>
  );
}

function statusLabel(status: ScoreStatus): string {
  switch (status) {
    case "critical_fail":
      return "Compliance fail";
    case "needs_review":
      return "Needs review";
    case "final":
      return "Final";
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: ScoreStatus }) {
  const map: Record<string, string> = {
    final: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
    needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
    critical_fail: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
  };
  const cls = map[status] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}
