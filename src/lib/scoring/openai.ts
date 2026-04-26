import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { estimateCostMicroInr } from "@/lib/billing/openai-cost";
import { getLlmClient } from "@/lib/llm/client";

let _hostedClient: OpenAI | null = null;

/**
 * Hosted (env-key) client used when no workspace context is available.
 * This is the legacy entry point — left in place so older code paths
 * still work, but new callers should pass supabase+clientId so chatText
 * can pick the workspace's own provider.
 */
export function getOpenAI(): OpenAI {
  if (!_hostedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment.");
    }
    _hostedClient = new OpenAI({ apiKey });
  }
  return _hostedClient;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/** Categories of LLM calls — used in the per-feature breakdown on /billing. */
export type UsageFeature = "scoring" | "coaching" | "report_template";

/**
 * Run a chat completion. When supabase + clientId are provided, the call
 * is routed to the workspace's configured LLM provider (OpenAI, OpenRouter,
 * Together AI, Groq, Azure, or any OpenAI-API-compatible endpoint) and
 * usage is logged into openai_usage. Without context, we fall back to the
 * hosted env key (Pilot tier).
 *
 * Logging failures are non-fatal — the chat result is returned regardless.
 */
export async function chatText(args: {
  system: string;
  user: string;
  temperature?: number;
  responseJson?: boolean;
  // Workspace context — when present, picks the workspace's LLM config + logs usage.
  supabase?: SupabaseClient<Database>;
  clientId?: string;
  feature?: UsageFeature;
}): Promise<string> {
  let client: OpenAI;
  let model: string;

  if (args.supabase && args.clientId) {
    const { client: c, config } = await getLlmClient(args.supabase, args.clientId);
    client = c;
    model = config.model;
  } else {
    client = getOpenAI();
    model = getModel();
  }

  const resp = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.2,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: args.responseJson ? { type: "json_object" } : undefined,
  });
  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from the LLM.");

  // Log usage opportunistically. Don't fail the call if Supabase rejects it.
  if (args.supabase && args.clientId && args.feature) {
    try {
      const promptTokens = resp.usage?.prompt_tokens ?? 0;
      const completionTokens = resp.usage?.completion_tokens ?? 0;
      const cost = estimateCostMicroInr(model, promptTokens, completionTokens);
      await args.supabase.from("openai_usage").insert({
        client_id: args.clientId,
        model,
        feature: args.feature,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_inr_micro: cost,
      });
    } catch (e) {
      // Non-fatal — usage tracking is best-effort.
      console.warn("openai_usage insert failed:", e);
    }
  }

  return content;
}
