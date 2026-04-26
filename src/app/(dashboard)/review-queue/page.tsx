import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  ChannelType,
  FirstReviewerDecision,
  ReviewState,
  ScoreStatus,
  SecondReviewerDecision,
} from "@/lib/database.types";
import { FirstReviewerActions, SecondReviewerActions } from "./review-row-actions";
import { sweepReviewSla } from "./actions";

export const dynamic = "force-dynamic";

type QueueRow = {
  reviewId: string;
  state: ReviewState;
  reason: string;
  slaDeadline: string | null;
  createdAt: string;
  firstReviewerDecision: FirstReviewerDecision | null;
  firstReviewerNotes: string | null;
  firstReviewerAt: string | null;
  secondReviewerDecision: SecondReviewerDecision | null;
  secondReviewerNotes: string | null;
  secondReviewerAt: string | null;
  qaScoreId: string;
  totalScore: number;
  originalTotalScore: number;
  appealedAt: string | null;
  confidenceScore: number;
  status: ScoreStatus;
  conversationDate: string;
  channel: ChannelType;
  externalId: string | null;
  agentName: string;
};

export default async function ReviewQueuePage() {
  // Opportunistic SLA sweep — cheap RPC, idempotent. Expired items get
  // auto-resolved before we read them so the page is always consistent.
  await sweepReviewSla();

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

  const { data: client } = clientId
    ? await supabase
        .from("clients")
        .select("second_reviewer_user_id, sla_hours")
        .eq("id", clientId)
        .single()
    : { data: null };

  const isSecondReviewer =
    !!client?.second_reviewer_user_id && client.second_reviewer_user_id === user!.id;

  // Pull review queue items. RLS scopes these to this client's qa_scores.
  const { data: queue } = await supabase
    .from("review_queue")
    .select(
      "id, qa_score_id, reason, state, sla_deadline, created_at, first_reviewer_decision, first_reviewer_notes, first_reviewer_at, second_reviewer_decision, second_reviewer_notes, second_reviewer_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = await hydrateRows(supabase, queue ?? []);
  const pendingFirst = rows.filter((r) => r.state === "pending_first");
  const pendingSecond = rows.filter((r) => r.state === "pending_second");
  const resolved = rows.filter((r) => r.state === "closed");

  const { count: totalConvs } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId!);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review queue</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {pendingFirst.length} awaiting first review &middot; {pendingSecond.length}{" "}
            awaiting second review &middot; {resolved.length} resolved
            {typeof totalConvs === "number" ? ` of ${totalConvs} total` : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            SLA: {client?.sla_hours ?? 24}h per tier &middot; items auto-approve after
            deadline.
          </p>
        </div>
      </div>

      {/* Tier 1 section */}
      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Pending first review
        </h2>
        {pendingFirst.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Nothing awaiting first review.</p>
          </div>
        ) : (
          <QueueTable rows={pendingFirst} tier="first" canAct={true} />
        )}
      </section>

      {/* Tier 2 section */}
      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Pending second review
          {!isSecondReviewer && pendingSecond.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium normal-case text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              view-only &mdash; assigned to client's second reviewer
            </span>
          )}
        </h2>
        {pendingSecond.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Nothing escalated to second review.</p>
          </div>
        ) : (
          <QueueTable
            rows={pendingSecond}
            tier="second"
            canAct={isSecondReviewer}
          />
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <details className="mt-10 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Resolved ({resolved.length})
          </summary>
          <QueueTable rows={resolved} tier="resolved" canAct={false} />
        </details>
      )}
    </div>
  );
}

async function hydrateRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  queue: {
    id: string;
    qa_score_id: string;
    reason: string;
    state: ReviewState;
    sla_deadline: string | null;
    created_at: string;
    first_reviewer_decision: FirstReviewerDecision | null;
    first_reviewer_notes: string | null;
    first_reviewer_at: string | null;
    second_reviewer_decision: SecondReviewerDecision | null;
    second_reviewer_notes: string | null;
    second_reviewer_at: string | null;
  }[],
): Promise<QueueRow[]> {
  if (queue.length === 0) return [];

  const scoreIds = queue.map((q) => q.qa_score_id);
  const { data: scores } = await supabase
    .from("qa_scores")
    .select(
      "id, total_score, original_total_score, appealed_at, confidence_score, status, conversation_id",
    )
    .in("id", scoreIds);

  const convIds = [...new Set((scores ?? []).map((s) => s.conversation_id))];
  const { data: convs } =
    convIds.length > 0
      ? await supabase
          .from("conversations")
          .select("id, conversation_date, channel, external_conversation_id, agent_id")
          .in("id", convIds)
      : { data: [] };

  const agentIds = [
    ...new Set(
      (convs ?? [])
        .map((c) => c.agent_id)
        .filter((x): x is string => !!x),
    ),
  ];
  const { data: agents } =
    agentIds.length > 0
      ? await supabase.from("agents").select("id, agent_name").in("id", agentIds)
      : { data: [] };

  const scoreMap = new Map((scores ?? []).map((s) => [s.id, s]));
  const convMap = new Map((convs ?? []).map((c) => [c.id, c]));
  const agentMap = new Map((agents ?? []).map((a) => [a.id, a.agent_name]));

  return queue
    .map((q): QueueRow | null => {
      const score = scoreMap.get(q.qa_score_id);
      if (!score) return null;
      const conv = convMap.get(score.conversation_id);
      if (!conv) return null;
      return {
        reviewId: q.id,
        state: q.state,
        reason: q.reason,
        slaDeadline: q.sla_deadline,
        createdAt: q.created_at,
        firstReviewerDecision: q.first_reviewer_decision,
        firstReviewerNotes: q.first_reviewer_notes,
        firstReviewerAt: q.first_reviewer_at,
        secondReviewerDecision: q.second_reviewer_decision,
        secondReviewerNotes: q.second_reviewer_notes,
        secondReviewerAt: q.second_reviewer_at,
        qaScoreId: score.id,
        totalScore: score.total_score,
        originalTotalScore: score.original_total_score,
        appealedAt: score.appealed_at,
        confidenceScore: score.confidence_score,
        status: score.status,
        conversationDate: conv.conversation_date,
        channel: conv.channel,
        externalId: conv.external_conversation_id,
        agentName: conv.agent_id
          ? agentMap.get(conv.agent_id) ?? "Unknown"
          : "Unknown",
      };
    })
    .filter((x): x is QueueRow => x !== null);
}

type Tier = "first" | "second" | "resolved";

function QueueTable({
  rows,
  tier,
  canAct,
}: {
  rows: QueueRow[];
  tier: Tier;
  canAct: boolean;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Flagged</th>
            <th className="px-4 py-3">
              {tier === "resolved" ? "Outcome" : "Notes / SLA"}
            </th>
            <th className="px-4 py-3">
              {tier === "resolved" ? "Closed" : canAct ? "Action" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr
              key={r.reviewId}
              className="align-top transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="px-4 py-3 text-zinc-500">{r.conversationDate}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/results/${r.qaScoreId}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {r.agentName}
                </Link>
                {r.externalId && (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {r.externalId}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {r.channel.replace("_", " ")}
              </td>
              <td className="px-4 py-3">
                <ScoreCell
                  current={r.totalScore}
                  original={r.originalTotalScore}
                  confidence={r.confidenceScore}
                  appealedAt={r.appealedAt}
                />
              </td>
              <td className="px-4 py-3">
                <ReasonBadge reason={r.reason} status={r.status} />
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {tier === "first" && r.slaDeadline && (
                  <SlaCountdown deadline={r.slaDeadline} />
                )}
                {tier === "second" && (
                  <div className="space-y-1">
                    {r.slaDeadline && <SlaCountdown deadline={r.slaDeadline} />}
                    {r.firstReviewerNotes && (
                      <p className="italic text-zinc-600 dark:text-zinc-400">
                        First reviewer: &ldquo;{r.firstReviewerNotes}&rdquo;
                      </p>
                    )}
                  </div>
                )}
                {tier === "resolved" && (
                  <ResolvedNotes row={r} />
                )}
              </td>
              <td className="px-4 py-3">
                {tier === "first" && canAct ? (
                  <FirstReviewerActions reviewId={r.reviewId} />
                ) : tier === "second" && canAct ? (
                  <SecondReviewerActions reviewId={r.reviewId} />
                ) : tier === "resolved" ? (
                  <OutcomeBadge row={r} />
                ) : (
                  <span className="text-xs text-zinc-400">
                    Awaiting {tier === "first" ? "first" : "second"} reviewer
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({
  current,
  original,
  confidence,
  appealedAt,
}: {
  current: number;
  original: number;
  confidence: number;
  appealedAt: string | null;
}) {
  const changed = appealedAt !== null && current !== original;
  return (
    <div>
      <span className="font-semibold">{current.toFixed(1)}</span>
      {changed && (
        <span className="ml-1.5 text-[11px] text-zinc-400 line-through">
          {original.toFixed(1)}
        </span>
      )}
      <span className="ml-1 text-xs font-normal text-zinc-500">
        &middot; {(confidence * 100).toFixed(0)}%
      </span>
      {changed && (
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Appealed
        </p>
      )}
    </div>
  );
}

function ReasonBadge({
  reason,
  status,
}: {
  reason: string;
  status: ScoreStatus;
}) {
  const isCompliance = reason === "critical_fail" || status === "critical_fail";
  const isLowScore = reason === "low_score";
  let label = "Low confidence";
  let cls = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400";
  if (isCompliance) {
    label = "Compliance fail";
    cls = "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
  } else if (isLowScore) {
    label = "Below pass";
    cls = "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400";
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function SlaCountdown({ deadline }: { deadline: string }) {
  const d = new Date(deadline).getTime();
  const now = Date.now();
  const msLeft = d - now;

  if (msLeft <= 0) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-400">
        Overdue &middot; auto-approving
      </span>
    );
  }
  const hoursLeft = msLeft / 3600000;
  const label =
    hoursLeft < 1
      ? `${Math.round(msLeft / 60000)}m left`
      : hoursLeft < 24
        ? `${hoursLeft.toFixed(1)}h left`
        : `${Math.floor(hoursLeft / 24)}d ${Math.round(hoursLeft % 24)}h left`;
  const cls =
    hoursLeft < 2
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : hoursLeft < 6
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title={new Date(deadline).toLocaleString()}
    >
      {label}
    </span>
  );
}

function ResolvedNotes({ row }: { row: QueueRow }) {
  return (
    <div className="space-y-1">
      {row.firstReviewerNotes && (
        <p className="italic text-zinc-600 dark:text-zinc-400">
          First: &ldquo;{row.firstReviewerNotes}&rdquo;
        </p>
      )}
      {row.secondReviewerNotes && (
        <p className="italic text-zinc-600 dark:text-zinc-400">
          Second: &ldquo;{row.secondReviewerNotes}&rdquo;
        </p>
      )}
      {!row.firstReviewerNotes && !row.secondReviewerNotes && (
        <span className="text-zinc-400">&mdash;</span>
      )}
    </div>
  );
}

function OutcomeBadge({ row }: { row: QueueRow }) {
  const second = row.secondReviewerDecision;
  const first = row.firstReviewerDecision;

  let label = "Closed";
  let cls = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  if (second === "confirm_override") {
    label = "Override confirmed";
    cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400";
  } else if (second === "deny_override") {
    label = "Override denied";
    cls = "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
  } else if (second === "auto_confirmed") {
    label = "Auto-confirmed (SLA)";
    cls = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  } else if (first === "agree") {
    label = "Agreed";
    cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400";
  } else if (first === "auto_approved") {
    label = "Auto-approved (SLA)";
    cls = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  }

  const resolvedAt = row.secondReviewerAt ?? row.firstReviewerAt;

  return (
    <div className="text-xs">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 font-medium ${cls}`}
      >
        {label}
      </span>
      {resolvedAt && (
        <p className="mt-1 text-[10px] text-zinc-400">
          {new Date(resolvedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
