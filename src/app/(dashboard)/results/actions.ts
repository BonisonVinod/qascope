"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markStopRequestedInProcess,
  scoreUnscoredConversations,
} from "@/lib/scoring/score-batch";

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
