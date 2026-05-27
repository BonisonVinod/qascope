/**
 * Live Verification — Entity Extractor
 *
 * Given a conversation transcript and a list of entity hints configured
 * in data_sources (e.g. ["order_id", "customer_id", "tracking_number"]),
 * uses the client's LLM to extract the values mentioned in the conversation.
 *
 * Returns a map of { entity_name → value } e.g.:
 *   { order_id: "ORD-9876", customer_id: "CUST-1234" }
 *
 * Non-fatal: returns empty map on any error.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { chatText } from "@/lib/scoring/openai";

type SB = SupabaseClient<Database>;

const SYSTEM_INSTRUCTION = `You are an entity extraction assistant.
Given a customer support conversation transcript, extract specific data entities mentioned.
Return ONLY a valid JSON object mapping entity names to their values.
If an entity is not mentioned in the conversation, omit it from the output.
Do not invent or guess values — only extract what is explicitly stated.
Example output: {"order_id": "ORD-1234", "customer_id": "CUST-567"}`;

export async function extractEntities(
  supabase: SB,
  clientId: string,
  transcript: string,
  entityHints: string[],
): Promise<Record<string, string>> {
  if (!entityHints.length) return {};

  try {
    const userMessage = `Extract the following entities from this conversation transcript.
Entity names to look for: ${entityHints.join(", ")}

TRANSCRIPT:
${transcript.slice(0, 6000)}

Return a JSON object with only the entities you found explicitly in the transcript.`;

    const raw = await chatText({
      system: SYSTEM_INSTRUCTION,
      user: userMessage,
      responseJson: true,
      supabase,
      clientId,
      feature: "scoring", // reuse scoring cost tracking
    });

    // Parse and validate — only keep string values
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "string" && val.trim()) {
        result[key] = val.trim();
      }
    }
    return result;
  } catch {
    return {};
  }
}
