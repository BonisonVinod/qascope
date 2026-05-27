"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeSlaDeadline } from "@/lib/scoring/sla";

export type ReviewActionState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Two-tier review workflow.
 *
 * Tier 1 (first reviewer = the agent or their lead, depending on client setup):
 *   - firstReviewerAgree:    item closes immediately, AI score stands as final.
 *   - firstReviewerDisagree: item escalates to pending_second, note required.
 *
 * Tier 2 (second reviewer = client.second_reviewer_user_id):
 *   - secondReviewerConfirm: the override is approved.
 *       qa_scores.status flips to 'final' and qa_scores.appealed_at = now()
 *       (so reports can show "original vs post-appeal").
 *   - secondReviewerDeny:    the override is rejected; original AI score stands.
 *
 * SLA: if a tier hasn't been actioned within client.sla_hours, a DB sweeper
 * auto-resolves it (tier 1 -> auto_approved; tier 2 -> auto_confirmed). The
 * sweeper is invoked opportunistically via sweepReviewSla() on page reads.
 */


async function resolveTier1(
  reviewId: string,
  decision: "agree" | "disagree",
  notes: string | null,
  adjustedScore?: number | null,
): Promise<ReviewActionState> {
  if (!reviewId) return { ok: false, error: "Missing review id." };
  if (decision === "disagree" && (!notes || notes.length === 0)) {
    return { ok: false, error: "A comment is required when disagreeing." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Confirm the item is still at tier 1.
  const { data: existing, error: fetchErr } = await supabase
    .from("review_queue")
    .select("id, state, qa_score_id")
    .eq("id", reviewId)
    .single();
  if (fetchErr || !existing) {
    return { ok: false, error: "Review item not found." };
  }
  if (existing.state !== "pending_first") {
    return { ok: false, error: "This item is no longer awaiting first review." };
  }

  const now = new Date().toISOString();

  if (decision === "agree") {
    // Tier 1 agree -> close the item. AI score already stands.
    const { error: updErr } = await supabase
      .from("review_queue")
      .update({
        state: "closed",
        first_reviewer_id: user.id,
        first_reviewer_decision: "agree",
        first_reviewer_at: now,
        first_reviewer_notes: notes,
        // Legacy fields for backward compat with older reports.
        decision: "approved",
        assigned_to: user.id,
        resolved_at: now,
        notes,
      })
      .eq("id", reviewId);
    if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };
  } else {
    // Tier 1 disagree -> escalate to tier 2. Compute a fresh deadline from client's sla_hours.
    if (adjustedScore === undefined || adjustedScore === null || isNaN(adjustedScore) || adjustedScore < 0 || adjustedScore > 100) {
      return { ok: false, error: "A valid adjusted score (0-100) is required when disagreeing." };
    }

    const slaHours = await getSlaHoursForScore(supabase, existing.qa_score_id);
    const newDeadline = computeSlaDeadline(slaHours).toISOString();

    const { error: updErr } = await supabase
      .from("review_queue")
      .update({
        state: "pending_second",
        first_reviewer_id: user.id,
        first_reviewer_decision: "disagree",
        first_reviewer_at: now,
        first_reviewer_notes: notes,
        sla_deadline: newDeadline,
        adjusted_score: adjustedScore,
        // Legacy field: keep legacy decision as 'pending' since it's still open.
        notes,
      })
      .eq("id", reviewId);
    if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };
  }

  revalidatePath("/review-queue");
  revalidatePath("/results");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: decision === "agree" ? "Agreed — closed." : "Sent to second reviewer.",
  };
}

async function resolveTier2(
  reviewId: string,
  decision: "confirm_override" | "deny_override",
  notes: string | null,
): Promise<ReviewActionState> {
  if (!reviewId) return { ok: false, error: "Missing review id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Fetch the queue row plus the associated score so we can flip status on confirm.
  const { data: existing, error: fetchErr } = await supabase
    .from("review_queue")
    .select("id, state, qa_score_id")
    .eq("id", reviewId)
    .single();
  if (fetchErr || !existing) {
    return { ok: false, error: "Review item not found." };
  }
  if (existing.state !== "pending_second") {
    return { ok: false, error: "This item is not awaiting second review." };
  }

  // Verify the acting user is the configured second reviewer for this client.
  const authorised = await isSecondReviewerFor(supabase, existing.qa_score_id, user.id);
  if (!authorised) {
    return { ok: false, error: "You are not the second reviewer for this client." };
  }

  const now = new Date().toISOString();

  if (decision === "confirm_override") {
    // Fetch the proposed adjusted score from the review queue.
    const { data: queueRow } = await supabase
      .from("review_queue")
      .select("adjusted_score")
      .eq("id", reviewId)
      .single();

    const newScore = queueRow?.adjusted_score;
    if (newScore === null || newScore === undefined) {
      return {
        ok: false,
        error: "Cannot confirm override because no adjusted score was proposed.",
      };
    }

    // Appeal upheld: apply the proposed score, flip status to final, and mark appealed.
    const { error: scoreErr } = await supabase
      .from("qa_scores")
      .update({
        total_score: newScore,
        status: "final",
        appealed_at: now,
      })
      .eq("id", existing.qa_score_id);
    if (scoreErr) {
      return { ok: false, error: `Score update failed: ${scoreErr.message}` };
    }
  }
  // On deny, original AI score & status remain untouched.

  const { error: updErr } = await supabase
    .from("review_queue")
    .update({
      state: "closed",
      second_reviewer_id: user.id,
      second_reviewer_decision: decision,
      second_reviewer_at: now,
      second_reviewer_notes: notes,
      // Legacy fields:
      decision: decision === "confirm_override" ? "overridden" : "rejected",
      assigned_to: user.id,
      resolved_at: now,
      notes,
    })
    .eq("id", reviewId);
  if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };

  revalidatePath("/review-queue");
  revalidatePath("/results");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      decision === "confirm_override"
        ? "Override confirmed — score updated to final."
        : "Override denied — original QA score stands.",
  };
}

// ---------- Exported server actions ----------

export async function firstReviewerAgree(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  return resolveTier1(reviewId, "agree", null);
}

export async function firstReviewerDisagree(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const scoreVal = formData.get("adjustedScore");
  const adjustedScore = scoreVal ? Number(scoreVal) : null;
  return resolveTier1(reviewId, "disagree", notes, adjustedScore);
}

export async function secondReviewerConfirm(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return resolveTier2(reviewId, "confirm_override", notes);
}

export async function secondReviewerDeny(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return resolveTier2(reviewId, "deny_override", notes);
}

/**
 * Opportunistic SLA sweep. Call from page reads (not on every request —
 * it's a write op). Idempotent; the DB function is the source of truth.
 */
export async function sweepReviewSla(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("sweep_review_sla");
  } catch (e) {
    // Non-fatal: the next read will try again.
    console.error("sweepReviewSla failed:", e);
  }
}

// ---------- Helpers ----------

async function getSlaHoursForScore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  qaScoreId: string,
): Promise<number> {
  const { data } = await supabase
    .from("qa_scores")
    .select("conversation_id")
    .eq("id", qaScoreId)
    .single();
  if (!data) return 24;
  const { data: conv } = await supabase
    .from("conversations")
    .select("client_id")
    .eq("id", data.conversation_id)
    .single();
  if (!conv) return 24;
  const { data: client } = await supabase
    .from("clients")
    .select("sla_hours")
    .eq("id", conv.client_id)
    .single();
  return client?.sla_hours ?? 24;
}

async function isSecondReviewerFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  qaScoreId: string,
  userId: string,
): Promise<boolean> {
  const { data: score } = await supabase
    .from("qa_scores")
    .select("conversation_id")
    .eq("id", qaScoreId)
    .single();
  if (!score) return false;
  const { data: conv } = await supabase
    .from("conversations")
    .select("client_id")
    .eq("id", score.conversation_id)
    .single();
  if (!conv) return false;

  // Load the current user's role to see if they are an admin or qa_manager
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  if (userRow?.role === "admin" || userRow?.role === "qa_manager") {
    return true;
  }

  const { data: client } = await supabase
    .from("clients")
    .select("second_reviewer_user_id")
    .eq("id", conv.client_id)
    .single();
  return client?.second_reviewer_user_id === userId;
}
