"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markStopRequestedInProcess,
  scoreUnscoredConversations,
} from "@/lib/scoring/score-batch";
import { computeSlaDeadline } from "@/lib/scoring/sla";

export type ScoreBatchState =
  | undefined
  | {
      ok: true;
      attempted: number;
      scored: number;
      failed: number;
      firstError?: string;
    }
  | { ok: false; error: string };

async function getClientId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, clientId: null as string | null, error: "Not signed in." };

  const { data: appUser, error: uErr } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (uErr || !appUser) {
    return { supabase, clientId: null, error: "Could not load your account." };
  }
  return { supabase, clientId: appUser.client_id, error: null };
}

export async function scoreUnscored(): Promise<ScoreBatchState> {
  const { supabase, clientId, error } = await getClientId();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  const result = await scoreUnscoredConversations(supabase, clientId);

  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");

  return {
    ok: true,
    attempted: result.attempted,
    scored: result.scored,
    failed: result.failed,
    firstError: result.errors[0]?.message,
  };
}

/**
 * Ask the in-progress scoring loop to stop. Sets a timestamp on the
 * client row; the loop in scoreUnscoredConversations() reads it between
 * conversations and exits cleanly. Idempotent — clicking twice is fine.
 *
 * IMPORTANT: the clients table has SELECT-only RLS for tenant users, so a
 * regular user-scoped UPDATE silently affects 0 rows (no error, no effect).
 * That is why this UPDATE was a no-op in production. We use the admin
 * (service-role) client to bypass RLS for this single field. We still
 * verify the user owns the client_id we're flipping, so a user can never
 * stop someone else's run.
 */
export async function requestScoringStop(): Promise<{ ok: boolean; error?: string }> {
  const { clientId, error } = await getClientId();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  // Same-process fast path: the running loop will see this on its next
  // shouldStop() check without waiting for a DB read.
  markStopRequestedInProcess(clientId);

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("clients")
    .update({ scoring_stop_requested_at: new Date().toISOString() })
    .eq("id", clientId);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

// Wipe all qa_scores for this client (cascades to qa_score_details + review_queue),
// then re-score from scratch. Useful after adjusting a rubric or a prompt.
export async function rescoreAll(): Promise<ScoreBatchState> {
  const { supabase, clientId, error } = await getClientId();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  // Find all conversations for this client
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId);
  const convIds = (convs ?? []).map((c) => c.id);

  if (convIds.length > 0) {
    const { error: delErr } = await supabase
      .from("qa_scores")
      .delete()
      .in("conversation_id", convIds);
    if (delErr) return { ok: false, error: `Delete failed: ${delErr.message}` };
  }

  const result = await scoreUnscoredConversations(supabase, clientId);

  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");

  return {
    ok: true,
    attempted: result.attempted,
    scored: result.scored,
    failed: result.failed,
    firstError: result.errors[0]?.message,
  };
}

export async function submitAppeal(
  scoreId: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!scoreId) return { ok: false, error: "Missing score ID." };
  if (!notes || notes.trim().length === 0) {
    return { ok: false, error: "An appeal reason/note is required." };
  }

  const { supabase, clientId, error } = await getClientId();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  // 1. Verify the score exists and belongs to this client
  const { data: score, error: scoreErr } = await supabase
    .from("qa_scores")
    .select("id, conversation_id, status")
    .eq("id", scoreId)
    .single();

  if (scoreErr || !score) {
    return { ok: false, error: "Score not found." };
  }

  // Double check that the conversation belongs to the client (handled by RLS, but let's be safe)
  const { data: conv } = await supabase
    .from("conversations")
    .select("client_id")
    .eq("id", score.conversation_id)
    .single();

  if (!conv || conv.client_id !== clientId) {
    return { ok: false, error: "Unauthorized access." };
  }

  if (score.status !== "final") {
    return { ok: false, error: "Only final scores can be appealed." };
  }

  // 2. Check if an active review queue row already exists for this score
  const { data: activeQueue } = await supabase
    .from("review_queue")
    .select("id")
    .eq("qa_score_id", scoreId)
    .neq("state", "closed")
    .maybeSingle();

  if (activeQueue) {
    return { ok: false, error: "This score is already under appeal or active review." };
  }

  // 3. Get the client's SLA configuration
  const { data: client } = await supabase
    .from("clients")
    .select("sla_hours")
    .eq("id", clientId)
    .single();
  const slaHours = client?.sla_hours ?? 24;
  const deadline = computeSlaDeadline(slaHours).toISOString();

  // 4. Create the new review_queue item with reason 'manual_flag'
  const { error: insertErr } = await supabase.from("review_queue").insert({
    qa_score_id: scoreId,
    reason: "manual_flag",
    state: "pending_first",
    sla_deadline: deadline,
    first_reviewer_notes: notes, // Keep track of the appeal rationale
  });

  if (insertErr) {
    return { ok: false, error: `Failed to create appeal: ${insertErr.message}` };
  }

  // 5. Set the score status to 'needs_review' so it shows up in leaderboards / dashboards accordingly
  const { error: statusErr } = await supabase
    .from("qa_scores")
    .update({ status: "needs_review" })
    .eq("id", scoreId);

  if (statusErr) {
    return { ok: false, error: `Failed to update score status: ${statusErr.message}` };
  }

  // 6. Revalidate all related routes
  revalidatePath(`/results/${scoreId}`);
  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");

  return { ok: true };
}
