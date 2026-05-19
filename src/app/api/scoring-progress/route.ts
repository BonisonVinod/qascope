/**
 * GET /api/scoring-progress
 *
 * Returns current scoring progress for the signed-in user's workspace.
 * Used by the <ScoringProgress /> client component to drive a top-of-page
 * progress bar during long Rescore-all / batch-score runs.
 *
 * isActive = true when a qa_score row was inserted in the last 60 seconds
 * AND there are still conversations left to score. The 60-second window is
 * forgiving enough that a slow Bedrock call (with retries) still keeps the
 * bar visible, but stale rebuilds time out instead of leaving the bar stuck.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bar stays visible while qa_scores rows are being written. Lower window =
// snappier disappearance once the loop actually stops. 20s is generous
// enough that a slow LLM call (with retry/backoff) keeps the bar visible,
// but cuts the awkward "Stopping…" lingering after a real stop.
const ACTIVITY_WINDOW_SECONDS = 20;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();
  const clientId = appUser?.client_id;
  if (!clientId) {
    return NextResponse.json({ total: 0, scored: 0, isActive: false, stopRequested: false });
  }

  // Has the user clicked Stop on the active run?
  const { data: clientRow } = await supabase
    .from("clients")
    .select("scoring_stop_requested_at")
    .eq("id", clientId)
    .single();
  const stopRequested = Boolean(clientRow?.scoring_stop_requested_at);

  // Total conversations in the workspace
  const { count: total } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  // Default rubric for this workspace
  const { data: rubric } = await supabase
    .from("qa_rubrics")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_default", true)
    .single();

  let scored = 0;
  let isActive = false;
  if (rubric?.id) {
    // Conversations already scored against the default rubric
    const { count: scoredCount } = await supabase
      .from("qa_scores")
      .select("id", { count: "exact", head: true })
      .eq("rubric_id", rubric.id);
    scored = scoredCount ?? 0;

    // Was a score inserted recently? If yes, scoring is in progress.
    const since = new Date(Date.now() - ACTIVITY_WINDOW_SECONDS * 1000).toISOString();
    const { count: recent } = await supabase
      .from("qa_scores")
      .select("id", { count: "exact", head: true })
      .eq("rubric_id", rubric.id)
      .gte("created_at", since);
    isActive = (recent ?? 0) > 0 && scored < (total ?? 0);
  }

  return NextResponse.json({
    total: total ?? 0,
    scored,
    isActive,
    stopRequested,
    percent: total ? Math.round((scored / total) * 100) : 0,
  });
}
