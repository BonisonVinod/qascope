import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreConversation } from "./score-conversation";

type SB = SupabaseClient<Database>;

export type BatchResult = {
  attempted: number;
  scored: number;
  failed: number;
  /** True if the loop exited early because the user clicked Stop. */
  stopped?: boolean;
  errors: { conversationId: string; message: string }[];
};

/**
 * In-process cache for "stop requested" state, keyed by client_id. Lets the
 * running loop short-circuit without a DB round-trip on every iteration.
 * The DB column is still the source of truth across processes.
 */
const stopRequestedAt = new Map<string, number>();

export function markStopRequestedInProcess(clientId: string): void {
  stopRequestedAt.set(clientId, Date.now());
}

/**
 * Check whether the user has requested that scoring stop. We compare the
 * stamp on the client row against the loop's start time — only stops set
 * AFTER the run started count, so an old stale flag never aborts the next
 * run. The flag is cleared at the end of every run to keep things tidy.
 *
 * Read goes via the user-scoped client (SELECT-only RLS is fine for reads).
 */
async function shouldStop(
  supabase: SB,
  clientId: string,
  loopStartedAt: number,
): Promise<boolean> {
  // Fast path — same Node process that handled the Stop click.
  const inMem = stopRequestedAt.get(clientId);
  if (inMem && inMem >= loopStartedAt) return true;

  const { data } = await supabase
    .from("clients")
    .select("scoring_stop_requested_at")
    .eq("id", clientId)
    .single();
  const stamp = data?.scoring_stop_requested_at;
  if (!stamp) return false;
  return new Date(stamp).getTime() >= loopStartedAt;
}

/**
 * Clear the stop flag. clients has SELECT-only RLS for tenant users, so the
 * UPDATE must go through the admin (service-role) client — that was the
 * core reason Stop appeared to be silently ignored in production.
 */
async function clearStopFlag(clientId: string): Promise<void> {
  stopRequestedAt.delete(clientId);
  const admin = createAdminClient();
  await admin
    .from("clients")
    .update({ scoring_stop_requested_at: null })
    .eq("id", clientId);
}

/**
 * Find unscored conversations (for the authenticated user's client via RLS)
 * and score them one-by-one. Default limit is high so a single click
 * processes all pending — the UI surfaces a confirm modal when count is
 * large so the user opts in.
 */
export async function scoreUnscoredConversations(
  supabase: SB,
  clientId: string,
  limit = 5000,
): Promise<BatchResult> {
  // Find default rubric id
  const { data: rubric } = await supabase
    .from("qa_rubrics")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_default", true)
    .single();

  const rubricId = rubric?.id;

  // Find conversations that don't yet have a qa_score for the default rubric.
  // PostgREST doesn't support NOT IN directly, so we fetch both sides and
  // diff in JS. Cap at 5000 (matches the upload row cap).
  const { data: allConvs, error: convErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .order("conversation_date", { ascending: false })
    .limit(5000);
  if (convErr || !allConvs) {
    return {
      attempted: 0,
      scored: 0,
      failed: 0,
      errors: [{ conversationId: "", message: `Load failed: ${convErr?.message}` }],
    };
  }

  let scoredIds = new Set<string>();
  if (rubricId) {
    const { data: scored } = await supabase
      .from("qa_scores")
      .select("conversation_id")
      .eq("rubric_id", rubricId)
      .in(
        "conversation_id",
        allConvs.map((c) => c.id),
      );
    scoredIds = new Set((scored ?? []).map((s) => s.conversation_id));
  }

  const pending = allConvs.filter((c) => !scoredIds.has(c.id)).slice(0, limit);

  const errors: BatchResult["errors"] = [];
  let scored = 0;
  let stopped = false;

  // Capture loop start so an old stale stop-flag from a previous run can't
  // abort us. shouldStop() only returns true if the stamp is newer.
  const loopStartedAt = Date.now();
  // Clear any pre-existing stop request before we begin so the upcoming run
  // is clean. (User can click Stop AGAIN once we're going.)
  await clearStopFlag(clientId);

  for (const c of pending) {
    if (await shouldStop(supabase, clientId, loopStartedAt)) {
      stopped = true;
      break;
    }
    const r = await scoreConversation(supabase, c.id);
    if (r.ok) scored += 1;
    else errors.push({ conversationId: c.id, message: r.error });
  }

  // Whether we finished normally or were stopped, clean up the flag so the
  // next manual run starts from a known state.
  await clearStopFlag(clientId);

  return {
    attempted: pending.length,
    scored,
    failed: errors.length,
    stopped,
    errors,
  };
}
