import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChannelType, ScoreStatus } from "@/lib/database.types";
import {
  CRITERION_PROMPTS,
  buildCriterionUserMessage,
  type CriterionScore,
  COACHING_SYSTEM_INSTRUCTION,
  buildCoachingUserMessage,
} from "./prompts";
import { chatText } from "./openai";
import {
  parseCriterionJson,
  computeScoreTotals,
  deriveStatus,
  type ScoredCriterion,
} from "./scoring-math";
import { computeSlaDeadline } from "./sla";

type SB = SupabaseClient<Database>;

export type ScoreConversationResult =
  | { ok: true; qaScoreId: string; totalScore: number; status: ScoreStatus }
  | { ok: false; error: string };

/**
 * Score a single conversation against the client's default rubric.
 * - If a score already exists for (conversation, rubric), skip and return ok.
 * - Runs all 7 criterion prompts in parallel.
 * - Computes weighted total on a 0-100 scale.
 * - Flags critical_fail if any critical criterion scored 0.
 * - Flags needs_review if overall confidence < 0.7.
 * - Writes qa_scores (including original_total_score / original_status
 *   so reports can compare AI vs post-appeal), qa_score_details, and
 *   review_queue rows with an SLA deadline drawn from the client config.
 */
export async function scoreConversation(
  supabase: SB,
  conversationId: string,
): Promise<ScoreConversationResult> {
  // 1. Load the conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, client_id, channel, transcript_text, agent_id")
    .eq("id", conversationId)
    .single();
  if (convErr || !conv) {
    return { ok: false, error: `Conversation not found: ${convErr?.message}` };
  }

  // Optional: get agent name for prompt context
  let agentName = "Unknown";
  if (conv.agent_id) {
    const { data: agent } = await supabase
      .from("agents")
      .select("agent_name")
      .eq("id", conv.agent_id)
      .single();
    if (agent?.agent_name) agentName = agent.agent_name;
  }

  // 2. Load the client's default rubric + criteria, plus SLA & pass threshold.
  const { data: client } = await supabase
    .from("clients")
    .select("id, sla_hours, pass_threshold")
    .eq("id", conv.client_id)
    .single();
  const slaHours = client?.sla_hours ?? 24;
  const passThreshold = client?.pass_threshold ?? 70;

  const { data: rubric, error: rubricErr } = await supabase
    .from("qa_rubrics")
    .select("id")
    .eq("client_id", conv.client_id)
    .eq("is_default", true)
    .single();
  if (rubricErr || !rubric) {
    return { ok: false, error: "No default rubric for this client." };
  }

  const { data: criteria, error: critErr } = await supabase
    .from("qa_criteria")
    .select("id, name, weight, critical_fail_boolean, sort_order")
    .eq("rubric_id", rubric.id)
    .order("sort_order", { ascending: true });
  if (critErr || !criteria || criteria.length === 0) {
    return { ok: false, error: "Rubric has no criteria." };
  }

  // Project-specific fatal rules: injected into the compliance prompt at run
  // time so each campaign can enforce its own checklist without a code change.
  const { data: fatalRules } = await supabase
    .from("fatal_rules")
    .select("name, description")
    .eq("rubric_id", rubric.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  const fatalRulesBlock =
    fatalRules && fatalRules.length > 0
      ? `\n\nPROJECT-SPECIFIC FATAL RULES (any one of these, if violated with quotable evidence, is an automatic 0 for compliance):\n${fatalRules
          .map((r, i) => `${i + 1}. ${r.name}: ${r.description}`)
          .join("\n")}\n`
      : "";

  // 3. Skip if already scored
  const { data: existing } = await supabase
    .from("qa_scores")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("rubric_id", rubric.id)
    .maybeSingle();
  if (existing) {
    return {
      ok: true,
      qaScoreId: existing.id,
      totalScore: 0,
      status: "final",
    };
  }

  // 4. Run all criterion prompts in parallel.
  //    Match DB criterion to prompt by sort_order.
  const userMessage = buildCriterionUserMessage(
    conv.transcript_text,
    conv.channel as ChannelType,
    agentName,
  );

  const promptBySortOrder = new Map(
    CRITERION_PROMPTS.map((p) => [p.sortOrder, p]),
  );

  const results = await Promise.all(
    criteria.map(async (c) => {
      const prompt = promptBySortOrder.get(c.sort_order);
      if (!prompt) {
        return {
          criterion: c,
          result: {
            score: 0,
            confidence: 0,
            explanation: `No prompt configured for sort_order ${c.sort_order}`,
            evidence: "",
          } as CriterionScore,
        };
      }
      // Augment compliance (sortOrder 1) with project-specific fatal rules.
      const systemInstruction =
        prompt.key === "compliance" && fatalRulesBlock
          ? prompt.systemInstruction + fatalRulesBlock
          : prompt.systemInstruction;
      try {
        const raw = await chatText({
          system: systemInstruction,
          user: userMessage,
          responseJson: true,
          supabase,
          clientId: conv.client_id,
          feature: "scoring",
        });
        const parsed = parseCriterionJson(raw);
        return { criterion: c, result: parsed };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          criterion: c,
          result: {
            score: 0,
            confidence: 0,
            explanation: `Scoring error: ${msg}`,
            evidence: "",
          } as CriterionScore,
        };
      }
    }),
  );

  // 5. Compute weighted total (0-100) and overall confidence — pure helpers.
  const scored: ScoredCriterion[] = results.map((r) => ({
    weight: r.criterion.weight,
    critical_fail_boolean: r.criterion.critical_fail_boolean,
    result: r.result,
  }));
  const { totalScore, overallConfidence, criticalFail } = computeScoreTotals(scored);
  const status: ScoreStatus = deriveStatus(criticalFail, overallConfidence);

  const roundedTotal = Math.round(totalScore * 100) / 100;
  const roundedConfidence = Math.round(overallConfidence * 100) / 100;

  // 6. Insert qa_scores row — preserve the AI baseline in original_* columns.
  const { data: scoreRow, error: scoreErr } = await supabase
    .from("qa_scores")
    .insert({
      conversation_id: conversationId,
      rubric_id: rubric.id,
      total_score: roundedTotal,
      confidence_score: roundedConfidence,
      status,
      original_total_score: roundedTotal,
      original_status: status,
    })
    .select("id")
    .single();
  if (scoreErr || !scoreRow) {
    return { ok: false, error: `qa_scores insert failed: ${scoreErr?.message}` };
  }

  // 7. Insert qa_score_details
  const details = results.map((r) => ({
    qa_score_id: scoreRow.id,
    criterion_id: r.criterion.id,
    score: r.result.score,
    confidence: Math.round(r.result.confidence * 100) / 100,
    explanation: r.result.explanation.slice(0, 2000),
    evidence_span: r.result.evidence.slice(0, 2000),
  }));
  const { error: detailsErr } = await supabase.from("qa_score_details").insert(details);
  if (detailsErr) {
    return { ok: false, error: `qa_score_details insert failed: ${detailsErr.message}` };
  }

  // 8. Decide whether this conversation needs review.
  //    Reasons (priority):
  //      - critical_fail   : a critical criterion was missed
  //      - low_confidence  : AI overall confidence below threshold
  //      - low_score       : final-status, but total below client pass_threshold
  //    Tier-1 pending with an SLA deadline; if nobody actions it in time,
  //    the sweep_review_sla() DB function auto-approves.
  let queueReason: "critical_fail" | "low_confidence" | "low_score" | null = null;
  if (status === "critical_fail") queueReason = "critical_fail";
  else if (status === "needs_review") queueReason = "low_confidence";
  else if (roundedTotal < passThreshold) queueReason = "low_score";

  if (queueReason) {
    const deadline = computeSlaDeadline(slaHours).toISOString();
    await supabase.from("review_queue").insert({
      qa_score_id: scoreRow.id,
      reason: queueReason,
      state: "pending_first",
      sla_deadline: deadline,
    });
  }

  // 9. Generate coaching note (best effort - non-fatal if it fails)
  try {
    const coachingNote = await chatText({
      system: COACHING_SYSTEM_INSTRUCTION,
      user: buildCoachingUserMessage({
        agentName,
        transcript: conv.transcript_text,
        scoresTable: results.map((r) => ({
          criterion: r.criterion.name,
          score: r.result.score,
          explanation: r.result.explanation,
        })),
      }),
      temperature: 0.4,
      supabase,
      clientId: conv.client_id,
      feature: "coaching",
    });
    await supabase
      .from("qa_scores")
      .update({ coaching_note: coachingNote.trim() })
      .eq("id", scoreRow.id);
  } catch (e) {
    console.error("Coaching note generation failed:", e);
  }

  return {
    ok: true,
    qaScoreId: scoreRow.id,
    totalScore: roundedTotal,
    status,
  };
}
