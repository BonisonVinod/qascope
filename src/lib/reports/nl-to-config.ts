import {
  normalizeConfig,
  type ReportTemplateConfig,
} from "@/lib/reports/template-engine";
import { chatText } from "@/lib/scoring/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * System prompt that teaches the model the exact JSON schema for a template
 * config, with examples. We constrain the output to JSON-only so the call
 * costs ~300 tokens and is fully deterministic.
 */
const NL_TO_CONFIG_SYSTEM_INSTRUCTION = `You convert plain-English report requests into a structured QA report-template config.

Return ONLY a JSON object matching this schema (no prose, no markdown, no code fences):

{
  "timeWindow": "last_7_days" | "last_30_days" | "this_week" | "last_week" | "this_month" | "last_month" | "custom_days",
  "customDays": number,                 // 1..365, REQUIRED only if timeWindow is "custom_days"
  "groupBy": "agent" | "team" | "channel" | "none",
  "filters": {
    "status": ("final" | "needs_review" | "critical_fail")[],   // omit or empty = all
    "minScore": number,                 // 0..100, optional
    "maxScore": number,                 // 0..100, optional
    "team": string,                     // exact team_name match, optional
    "channel": "voice_transcript" | "email" | "chat"   // optional
  },
  "columns": ("volume" | "avg_score" | "fail_rate" | "appealed_count" | "ai_vs_final_delta")[],
  "sortBy": { "column": "label" | "volume" | "avg_score" | "fail_rate" | "appealed_count" | "ai_vs_final_delta", "direction": "asc" | "desc" },
  "rowLimit": number                    // 1..500
}

Heuristics:
- "this week", "this past week" -> "this_week" (Mon-Sun).
- "last week" -> "last_week".
- "last N days", "past N days" -> "custom_days" with customDays = N.
- "by agent", "per agent", "agent breakdown", "leaderboard" -> groupBy = "agent".
- "by team", "per team", "team rollup" -> groupBy = "team".
- "by channel" -> groupBy = "channel".
- "overall", "summary", "totals" -> groupBy = "none".
- "below 70", "<70", "less than 70" -> filters.maxScore = 69.
- "above 90", ">90" -> filters.minScore = 91.
- "compliance fails", "critical fails", "fatal" -> filters.status = ["critical_fail"].
- "needs review" -> filters.status = ["needs_review"].
- A team name like "Mumbai-Tier2" or "Bangalore-Voice" -> filters.team = exactly that string.
- "voice", "phone", "calls" -> filters.channel = "voice_transcript".
- "email" -> filters.channel = "email".
- "chat" -> filters.channel = "chat".
- "top N" + a metric -> sortBy direction "desc", rowLimit = N.
- "bottom N" or "worst N" -> sortBy direction "asc", rowLimit = N.
- "by volume" / "most" -> sortBy.column = "volume".
- "by score", "lowest score", "best", "worst" -> sortBy.column = "avg_score".
- "appeal rate", "appeals" -> include "appealed_count" in columns.

If a field is unclear, OMIT it rather than guess. Default columns when none implied:
["volume", "avg_score", "fail_rate"].

EXAMPLE 1
Request: "agents below 70 in Mumbai-Tier2 this week"
Output:
{"timeWindow":"this_week","groupBy":"agent","filters":{"maxScore":69,"team":"Mumbai-Tier2"},"columns":["volume","avg_score","fail_rate"],"sortBy":{"column":"avg_score","direction":"asc"},"rowLimit":50}

EXAMPLE 2
Request: "top 10 teams by volume last 30 days"
Output:
{"timeWindow":"last_30_days","groupBy":"team","filters":{},"columns":["volume","avg_score","fail_rate"],"sortBy":{"column":"volume","direction":"desc"},"rowLimit":10}

EXAMPLE 3
Request: "all critical fails this month grouped by channel"
Output:
{"timeWindow":"this_month","groupBy":"channel","filters":{"status":["critical_fail"]},"columns":["volume","avg_score","fail_rate","appealed_count"],"sortBy":{"column":"volume","direction":"desc"},"rowLimit":100}

EXAMPLE 4
Request: "summary for last 14 days"
Output:
{"timeWindow":"custom_days","customDays":14,"groupBy":"none","filters":{},"columns":["volume","avg_score","fail_rate","appealed_count","ai_vs_final_delta"],"sortBy":{"column":"label","direction":"asc"},"rowLimit":1}`;

export type NlToConfigResult =
  | { ok: true; config: ReportTemplateConfig }
  | { ok: false; error: string };

/**
 * Convert plain English into a normalized ReportTemplateConfig via a single
 * OpenAI call. The result is run through normalizeConfig so any out-of-range
 * or unknown fields get clamped/dropped before reaching the editor.
 */
export async function nlToConfig(
  description: string,
  ctx?: { supabase: SupabaseClient<Database>; clientId: string },
): Promise<NlToConfigResult> {
  const trimmed = description.trim();
  if (!trimmed) {
    return { ok: false, error: "Description is empty." };
  }
  if (trimmed.length > 1000) {
    return { ok: false, error: "Description is too long (max 1000 chars)." };
  }

  let raw: string;
  try {
    raw = await chatText({
      system: NL_TO_CONFIG_SYSTEM_INSTRUCTION,
      user: trimmed,
      responseJson: true,
      temperature: 0,
      supabase: ctx?.supabase,
      clientId: ctx?.clientId,
      feature: "report_template",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `OpenAI call failed: ${msg}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model did not return valid JSON." };
  }

  try {
    const config = normalizeConfig(parsed);
    return { ok: true, config };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not normalize config.",
    };
  }
}
