/**
 * Live Verification — Orchestrator
 *
 * Called by scoreConversation() before LLM scoring begins.
 * Returns a context block to inject into every criterion's system prompt
 * so the AI scores with real-world data as evidence.
 *
 * Flow:
 *   1. Load active data_sources for this client
 *   2. Collect all entity_hints across sources
 *   3. Extract entities from the transcript (LLM call)
 *   4. Query all sources in parallel with the extracted entities
 *   5. Return a formatted context string
 *
 * Non-fatal: always returns a string (empty if nothing configured or all fail).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { extractEntities } from "./extract-entities";
import { queryAllSources } from "./query-sources";

type SB = SupabaseClient<Database>;

export async function runVerification(
  supabase: SB,
  clientId: string,
  transcript: string,
): Promise<string> {
  try {
    // 1. Load active data sources for this client
    const { data: sources } = await supabase
      .from("data_sources")
      .select(
        "id, name, type, url, endpoint_template, http_method, auth_header_name, auth_secret_id, entity_hints, is_active",
      )
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (!sources?.length) return ""; // no sources configured

    // 2. Collect all unique entity hints across all sources
    const allHints = [
      ...new Set(sources.flatMap((s) => s.entity_hints ?? [])),
    ];

    // 3. Extract entities from transcript (single LLM call)
    const entities = allHints.length
      ? await extractEntities(supabase, clientId, transcript, allHints)
      : {};

    // 4. Query all sources in parallel (each has 8s timeout)
    const rawContext = await queryAllSources(sources, entities);

    if (!rawContext.trim()) return "";

    // 5. Format for injection into scoring system prompt
    return `
=== LIVE VERIFICATION DATA ===
The following real-time data was retrieved from configured sources to help you verify accuracy.
Use this data to check whether the agent gave the customer correct information.
If there is a discrepancy between what the agent said and what this data shows, that is an accuracy failure.

${rawContext}
=== END VERIFICATION DATA ===`;
  } catch {
    return ""; // never break scoring
  }
}
