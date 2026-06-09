import { NextRequest, NextResponse } from "next/server";
import {
  cleanupExpiredVoiceRecordings,
  processQueuedVoiceAudits,
} from "@/lib/voice/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const results = await processQueuedVoiceAudits(3);
    const recordingsDeleted = await cleanupExpiredVoiceRecordings(100);

    // Auto-score pending text chats/emails in the background
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { scoreUnscoredConversations } = await import("@/lib/scoring/score-batch");
    const adminSupabase = createAdminClient();
    const { data: clients } = await adminSupabase.from("clients").select("id");

    const textScoringResults: Record<string, any> = {};
    for (const client of clients ?? []) {
      const res = await scoreUnscoredConversations(adminSupabase, client.id, 3);
      if (res.attempted > 0) {
        textScoringResults[client.id] = {
          attempted: res.attempted,
          scored: res.scored,
          failed: res.failed,
          stopped: res.stopped,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      claimed: results.length,
      completed: results.filter((result) => result.ok).length,
      failedOrRetried: results.filter((result) => !result.ok).length,
      recordingsDeleted,
      results,
      textScoring: textScoringResults,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
