import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScoreStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ResultDetailPage(props: { params: Params }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: score } = await supabase
    .from("qa_scores")
    .select(
      "id, total_score, confidence_score, status, coaching_note, created_at, conversation_id, rubric_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!score) notFound();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, transcript_text, channel, conversation_date, customer_id, external_conversation_id, agent_id",
    )
    .eq("id", score.conversation_id)
    .single();
  if (!conv) notFound();

  let agentName = "Unknown";
  let teamName: string | null = null;
  if (conv.agent_id) {
    const { data: agent } = await supabase
      .from("agents")
      .select("agent_name, team_name")
      .eq("id", conv.agent_id)
      .single();
    if (agent) {
      agentName = agent.agent_name;
      teamName = agent.team_name;
    }
  }

  const { data: details } = await supabase
    .from("qa_score_details")
    .select("criterion_id, score, confidence, explanation, evidence_span")
    .eq("qa_score_id", score.id);

  const { data: criteria } = await supabase
    .from("qa_criteria")
    .select("id, name, description, weight, critical_fail_boolean, sort_order")
    .eq("rubric_id", score.rubric_id)
    .order("sort_order", { ascending: true });

  const detailByCrit = new Map((details ?? []).map((d) => [d.criterion_id, d]));

  const rows = (criteria ?? []).map((c) => ({
    criterion: c,
    detail: detailByCrit.get(c.id),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/results"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          \u2190 Back to results
        </Link>

        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {agentName}
              {teamName ? (
                <span className="ml-2 text-sm font-normal text-zinc-500">\u00b7 {teamName}</span>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {conv.conversation_date} \u00b7 {conv.channel.replace("_", " ")} \u00b7 ID{" "}
              <span className="font-mono text-xs">
                {conv.external_conversation_id ?? conv.id.slice(0, 8)}
              </span>
            </p>
          </div>
          <ScoreHeader
            total={score.total_score}
            confidence={score.confidence_score}
            status={score.status}
          />
        </div>
      </div>

      {score.coaching_note && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Coaching note
          </h2>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-900">
            {score.coaching_note}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Criterion breakdown
        </h2>
        <div className="mt-2 space-y-3">
          {rows.map((r) => (
            <CriterionCard key={r.criterion.id} {...r} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Transcript
        </h2>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          {conv.transcript_text}
        </pre>
      </section>
    </div>
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

function ScoreHeader({
  total,
  confidence,
  status,
}: {
  total: number;
  confidence: number;
  status: ScoreStatus;
}) {
  const tone =
    status === "critical_fail"
      ? "text-red-600 dark:text-red-400"
      : status === "needs_review"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="text-right">
      <p className={`text-4xl font-bold ${tone}`}>{total.toFixed(1)}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Confidence {(confidence * 100).toFixed(0)}% \u00b7 {statusLabel(status)}
      </p>
    </div>
  );
}

function CriterionCard({
  criterion,
  detail,
}: {
  criterion: {
    id: string;
    name: string;
    description: string | null;
    weight: number;
    critical_fail_boolean: boolean;
  };
  detail:
    | {
        score: number;
        confidence: number;
        explanation: string | null;
        evidence_span: string | null;
      }
    | undefined;
}) {
  const scoreNum = detail?.score ?? 0;
  const scoreLabel = scoreNum === 2 ? "Met" : scoreNum === 1 ? "Partial" : "Failed";
  const scoreTone =
    scoreNum === 2
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
      : scoreNum === 1
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {criterion.name}
            {criterion.critical_fail_boolean && (
              <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                Critical
              </span>
            )}
          </p>
          {criterion.description && (
            <p className="mt-0.5 text-xs text-zinc-500">{criterion.description}</p>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${scoreTone}`}>
            {scoreNum}/2 \u00b7 {scoreLabel}
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            Weight {criterion.weight}% \u00b7 Conf {((detail?.confidence ?? 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {detail?.explanation && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{detail.explanation}</p>
      )}

      {detail?.evidence_span && (
        <blockquote className="mt-3 border-l-2 border-zinc-300 pl-3 text-xs italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          \u201c{detail.evidence_span}\u201d
        </blockquote>
      )}
    </div>
  );
}
