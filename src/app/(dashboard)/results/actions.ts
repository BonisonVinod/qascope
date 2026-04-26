"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scoreUnscoredConversations } from "@/lib/scoring/score-batch";

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

  const result = await scoreUnscoredConversations(supabase, clientId, 100);

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
