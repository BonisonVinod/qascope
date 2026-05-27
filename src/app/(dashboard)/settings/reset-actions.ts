"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResetState =
  | undefined
  | { ok: true; deletedCounts: Record<string, number> }
  | { ok: false; error: string };

/**
 * Reset the signed-in user's workspace. Wipes the operational data
 * (conversations, scores, review queue, knowledge base, agents) so the
 * workspace looks as if no upload had ever happened. Keeps the things
 * that make the workspace "yours" — rubrics, fatal rules, QA-engine
 * credentials, team members, plan/billing.
 *
 * Admin-only. Uses the service-role client because most of these tables
 * cascade through clients via RLS and the user-scoped client can hit
 * tricky edge cases on bulk deletes. Admin auth is checked in code.
 *
 * The user must type "RESET" in the form to confirm — a safety belt
 * against accidental clicks.
 */
export async function resetWorkspace(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "Your user record is missing." };
  if (me.role !== "admin") {
    return {
      ok: false,
      error: "Only admins can reset the workspace.",
    };
  }
  if (!me.client_id) {
    return { ok: false, error: "No workspace associated with your account." };
  }

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "RESET") {
    return {
      ok: false,
      error: 'Type "RESET" exactly to confirm (this cannot be undone).',
    };
  }

  const admin = createAdminClient();
  const clientId = me.client_id;
  const counts: Record<string, number> = {};

  // Delete in reverse-dependency order (children first, then parents).
  // Each call uses { count: "exact" } so we can report what we removed.

  // 1. review_queue rows for this client's scores
  const { data: scoreIds } = await admin
    .from("qa_scores")
    .select("id, conversation_id")
    .in(
      "conversation_id",
      (
        (
          await admin
            .from("conversations")
            .select("id")
            .eq("client_id", clientId)
        ).data ?? []
      ).map((c) => c.id),
    );
  const scoreIdList = (scoreIds ?? []).map((s) => s.id);

  if (scoreIdList.length > 0) {
    const { count: reviewCount } = await admin
      .from("review_queue")
      .delete({ count: "exact" })
      .in("qa_score_id", scoreIdList);
    counts.review_queue = reviewCount ?? 0;

    const { count: detailsCount } = await admin
      .from("qa_score_details")
      .delete({ count: "exact" })
      .in("qa_score_id", scoreIdList);
    counts.qa_score_details = detailsCount ?? 0;

    const { count: scoresCount } = await admin
      .from("qa_scores")
      .delete({ count: "exact" })
      .in("id", scoreIdList);
    counts.qa_scores = scoresCount ?? 0;
  } else {
    counts.review_queue = 0;
    counts.qa_score_details = 0;
    counts.qa_scores = 0;
  }

  // 2. Knowledge base — best-effort. Tables may or may not exist depending
  // on whether the workspace_documents migration has been applied. Wrapped
  // in try/catch so a missing table doesn't fail the whole reset.
  try {
    const { count } = await admin
      .from("knowledge_chunks" as never)
      .delete({ count: "exact" })
      .eq("workspace_id" as never, clientId);
    counts.knowledge_chunks = count ?? 0;
  } catch {
    counts.knowledge_chunks = 0;
  }
  try {
    const { count } = await admin
      .from("workspace_documents" as never)
      .delete({ count: "exact" })
      .eq("workspace_id" as never, clientId);
    counts.workspace_documents = count ?? 0;
  } catch {
    counts.workspace_documents = 0;
  }

  // 3. Conversations (now safe to delete — qa_scores already gone)
  const { count: convCount } = await admin
    .from("conversations")
    .delete({ count: "exact" })
    .eq("client_id", clientId);
  counts.conversations = convCount ?? 0;

  // 4. Agents (referenced only by conversations, which are gone)
  const { count: agentCount } = await admin
    .from("agents")
    .delete({ count: "exact" })
    .eq("client_id", clientId);
  counts.agents = agentCount ?? 0;

  // 5. Reset the latest upload pointer + any stale stop flag.
  await admin
    .from("clients")
    .update({
      latest_upload_batch_id: null,
      scoring_stop_requested_at: null,
    })
    .eq("id", clientId);

  // 6. Best-effort: per-user UI preferences (if the table exists).
  try {
    await admin
      .from("user_preferences" as never)
      .delete()
      .eq("client_id" as never, clientId);
  } catch {
    // ignore
  }

  // Note on what we INTENTIONALLY KEEP:
  //   - clients row (workspace name, plan, QA-engine credentials, SLA,
  //     review confidence threshold, embedding key).
  //   - users (team members).
  //   - qa_rubrics + qa_criteria + fatal_rules (so the rubric the user
  //     built is preserved).
  //   - subscriptions + openai_usage (billing history is audit-trail).
  //   - invitations (pending team invites stay valid).
  //   - report_templates (saved report definitions).

  revalidatePath("/dashboard");
  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/knowledge");
  revalidatePath("/upload");

  return { ok: true, deletedCounts: counts };
}
