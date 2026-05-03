import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { estimateCostMicroInr } from "@/lib/billing/openai-cost";
import { resolveLlmConfig } from "@/lib/llm/client";
import { bedrockChat, bedrockChatAvailable, getBedrockChatModelId } from "@/lib/llm/bedrock-chat";

let _hostedClient: OpenAI | null = null;

/**
 * Hosted (env-key) OpenAI client. Used as a last-resort fallback when no
 * workspace LLM config is set and AWS Bedrock is not available either.
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
 * Run a chat completion. Provider resolution order:
 *
 *   1. Workspace-configured BYO provider (Settings → LLM provider) if set.
 *   2. AWS Bedrock Anthropic Claude — when AWS_BEARER_TOKEN_BEDROCK is set.
 *   3. Hosted env OpenAI key (Pilot tier) — last resort.
 *
 * Usage is logged into openai_usage when supabase + clientId + feature are
 * provided. Logging failures are non-fatal.
 */
export async function chatText(args: {
  system: string;
  user: string;
  temperature?: number;
  responseJson?: boolean;
  supabase?: SupabaseClient<Database>;
  clientId?: string;
  feature?: UsageFeature;
}): Promise<string> {
  // -------- Path 1: workspace-configured BYO provider --------
  if (args.supabase && args.clientId) {
    const wsConfig = await resolveLlmConfigForWorkspaceOnly(args.supabase, args.clientId);
    if (wsConfig) {
      const client = new OpenAI({
        apiKey: wsConfig.apiKey,
        baseURL: wsConfig.baseUrl || undefined,
      });
      const resp = await client.chat.completions.create({
        model: wsConfig.model,
        temperature: args.temperature ?? 0.2,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        response_format: args.responseJson ? { type: "json_object" } : undefined,
      });
      const content = resp.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from the LLM.");

      await logUsage(args, wsConfig.model, resp.usage?.prompt_tokens ?? 0, resp.usage?.completion_tokens ?? 0);
      return content;
    }
  }

  // -------- Path 2: AWS Bedrock Anthropic Claude --------
  if (bedrockChatAvailable()) {
    const result = await bedrockChat({
      system: args.system,
      user: args.user,
      temperature: args.temperature,
      responseJson: args.responseJson,
    });
    await logUsage(args, result.model, result.promptTokens, result.completionTokens);
    return result.text;
  }

  // -------- Path 3: hosted env OpenAI key (legacy fallback) --------
  if (process.env.OPENAI_API_KEY) {
    const client = getOpenAI();
    const model = getModel();
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
    await logUsage(args, model, resp.usage?.prompt_tokens ?? 0, resp.usage?.completion_tokens ?? 0);
    return content;
  }

  // No provider available at all.
  throw new Error(
    "No LLM configured. Either set up a provider in Settings → LLM provider, " +
      "or set AWS_BEARER_TOKEN_BEDROCK + AWS_REGION in .env.local for Bedrock Claude.",
  );
}

/**
 * Like resolveLlmConfig, but returns null if the workspace itself has no
 * configured key — does NOT fall back to env OpenAI. We want chatText to
 * decide between Bedrock vs env OpenAI explicitly.
 */
async function resolveLlmConfigForWorkspaceOnly(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<{ apiKey: string; baseUrl: string; model: string } | null> {
  const fullConfig = await resolveLlmConfig(supabase, clientId);
  if (!fullConfig) return null;
  // resolveLlmConfig returns the env-OpenAI fallback when no workspace key is
  // set. We can detect that case by re-querying the clients row.
  const { data: client } = await supabase
    .from("clients")
    .select("llm_api_key")
    .eq("id", clientId)
    .single();
  if (!client?.llm_api_key) return null; // workspace has no key of its own
  return {
    apiKey: fullConfig.apiKey,
    baseUrl: fullConfig.baseUrl,
    model: fullConfig.model,
  };
}

async function logUsage(
  args: {
    supabase?: SupabaseClient<Database>;
    clientId?: string;
    feature?: UsageFeature;
  },
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  if (!args.supabase || !args.clientId || !args.feature) return;
  try {
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
    console.warn("openai_usage insert failed:", e);
  }
}

// Re-export Bedrock helper for callers/tests that want to read the model id.
export { getBedrockChatModelId };
