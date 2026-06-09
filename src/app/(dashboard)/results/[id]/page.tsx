import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScoreStatus } from "@/lib/database.types";
import { AppealButton } from "./appeal-button";

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

  // Load any active review queue record for this score
  const { data: activeReview } = await supabase
    .from("review_queue")
    .select("id, state, reason, first_reviewer_notes, second_reviewer_notes")
    .eq("qa_score_id", score.id)
    .neq("state", "closed")
    .maybeSingle();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, transcript_text, channel, conversation_date, customer_id, external_conversation_id, agent_id",
    )
    .eq("id", score.conversation_id)
    .single();
  if (!conv) notFound();
  
  // Check if this conversation is a voice transcript and has an audio recording
  let audioUrl: string | null = null;
  if (conv.channel === "voice_transcript") {
    const adminSupabase = createAdminClient();
    const { data: voiceJob } = await adminSupabase
      .from("voice_audit_jobs")
      .select("recording_url, storage_path")
      .eq("conversation_id", conv.id)
      .maybeSingle();

    if (voiceJob) {
      if (voiceJob.storage_path) {
        const { data: signedData } = await adminSupabase.storage
          .from("voice-recordings")
          .createSignedUrl(voiceJob.storage_path, 3600);
        audioUrl = signedData?.signedUrl ?? null;
      } else if (voiceJob.recording_url) {
        audioUrl = voiceJob.recording_url;
      }
    }
  }

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
            <div className="mt-2 flex items-center gap-3">
              {activeReview ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Under Appeal / Review ({activeReview.state === "pending_first" ? "Tier 1" : "Tier 2"})
                </span>
              ) : score.status === "final" ? (
                <AppealButton scoreId={score.id} />
              ) : null}
            </div>
          </div>
          <ScoreHeader
            total={score.total_score}
            confidence={score.confidence_score}
            status={score.status}
          />
        </div>
      </div>

      {activeReview && activeReview.first_reviewer_notes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
          <p className="font-medium text-xs uppercase tracking-wider text-amber-800 dark:text-amber-400">Active Appeal rationale</p>
          <p className="mt-1 leading-relaxed italic">&ldquo;{activeReview.first_reviewer_notes}&rdquo;</p>
        </div>
      )}

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

      {/* 📋 Rubric Score Sheet Summary Grid */}
      <section className="print:block">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Rubric Score Sheet
        </h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3">Rubric / Criterion</th>
                <th className="px-4 py-3 text-center">Weight</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3">Audit Finding / Reason for Low Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map(({ criterion, detail }) => {
                const scoreNum = detail?.score ?? 0;
                const isLow = scoreNum < 2;

                const statusLabel =
                  scoreNum === 2 ? "Met" : scoreNum === 1 ? "Partial" : "Failed";
                
                const badgeStyle =
                  scoreNum === 2
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                    : scoreNum === 1
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40 animate-pulse"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40 animate-pulse";

                return (
                  <tr
                    key={criterion.id}
                    className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 ${
                      isLow ? "bg-zinc-50/30 dark:bg-zinc-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {criterion.name}
                        {criterion.critical_fail_boolean && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-900/30">
                            Critical
                          </span>
                        )}
                      </div>
                      {criterion.description && (
                        <span className="mt-0.5 block text-xs text-zinc-500 font-normal leading-normal">
                          {criterion.description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-zinc-500">
                      {criterion.weight}%
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold leading-normal ${badgeStyle}`}>
                        {scoreNum === 2 ? "✓" : scoreNum === 1 ? "⚠" : "✗"} {scoreNum}/2 · {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs leading-normal">
                      {isLow ? (
                        <div className="space-y-1">
                          <p className={`font-semibold ${scoreNum === 1 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {scoreNum === 1 ? "⚠ Partial Performance Finding:" : "✗ Critical Compliance Gap:"}
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-300 italic">
                            &ldquo;{detail?.explanation || "No audit explanation provided by QA engine."}&rdquo;
                          </p>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          ✓ Fully compliant and met SOP guidelines.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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

      {audioUrl && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Call Recording
          </h2>
          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <audio controls src={audioUrl} className="w-full">
              Your browser does not support the audio element.
            </audio>
          </div>
        </section>
      )}

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
      <p className="mt-1 inline-flex items-center justify-end gap-1 text-xs text-zinc-500">
        Confidence {(confidence * 100).toFixed(0)}%
        <span
          tabIndex={0}
          role="img"
          aria-label="What does confidence mean?"
          title={
            "Confidence is the QA engine\u2019s self-rated certainty, weighted across criteria. " +
            "Below your workspace threshold (Settings \u2192 Review), the conversation is flagged for human review. " +
            "Higher numbers mean the engine is sure about its judgement; lower numbers mean it wants a second pair of eyes."
          }
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          ?
        </span>
        {" \u00b7 "}
        {statusLabel(status)}
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
