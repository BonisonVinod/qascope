import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { scoreConversation } from "./score-conversation";

type SB = SupabaseClient<Database>;

export type BatchResult = {
  attempted: number;
  scored: number;
  failed: number;
  errors: { conversationId: string; message: string }[];
};

/**
 * Find unscored conversations (for the authenticated user's client via RLS)
 * and score them one-by-one. Limit keeps runtime bounded.
 */
export async function scoreUnscoredConversations(
  supabase: SB,
  clientId: string,
  limit = 25,
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
  // Use a left join via !inner trick OR a NOT IN subquery. PostgREST doesn't
  // support NOT IN directly, so we fetch both sides and diff in JS. Cheap for
  // pilot-scale volume; we can optimize later.
  const { data: allConvs, error: convErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .order("conversation_date", { ascending: false })
    .limit(500);
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

  for (const c of pending) {
    const r = await scoreConversation(supabase, c.id);
    if (r.ok) scored += 1;
    else errors.push({ conversationId: c.id, message: r.error });
  }

  return {
    attempted: pending.length,
    scored,
    failed: errors.length,
    errors,
  };
}
