import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { estimateCostMicroInr } from "@/lib/billing/openai-cost";
import { resolveLlmConfig } from "@/lib/llm/client";
import { bedrockChat } from "@/lib/llm/bedrock-chat";

/** Categories of LLM calls — used in the per-feature breakdown on /billing. */
export type UsageFeature = "scoring" | "coaching" | "report_template";

/**
 * Run a chat completion using the WORKSPACE-CONFIGURED provider only.
 *
 * Production policy: every workspace must bring its own API key in
 * Settings → QA engine. There is no env-var fallback — that was removed
 * deliberately so a customer's data never accidentally hits a key the
 * vendor (us) controls. If the workspace key is not configured, we throw
 * a clean error and the caller surfaces a "Configure your QA engine key"
 * message.
 *
 * Providers fall into two paths:
 *   - Bedrock → custom REST call via bedrockChat() (region + bearer token)
 *   - Everything else → OpenAI SDK with optional baseURL override
 *
 * Usage is logged into openai_usage when supabase + clientId + feature
 * are provided. Logging failures are non-fatal.
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
  if (!args.supabase || !args.clientId) {
    throw new Error(
      "chatText requires a workspace context (supabase + clientId).",
    );
  }
  const wsConfig = await resolveLlmConfigForWorkspaceOnly(args.supabase, args.clientId);
  if (!wsConfig) {
    throw new Error(
      "QA engine API key is not configured for this workspace. " +
        "An admin must set it in Settings → QA engine provider.",
    );
  }

  // Bedrock path — wsConfig.baseUrl is the AWS region, wsConfig.apiKey is the
  // Bearer token, wsConfig.model is the Bedrock model id.
  if (wsConfig.provider === "bedrock") {
    const result = await bedrockChat(
      {
        system: args.system,
        user: args.user,
        temperature: args.temperature,
        responseJson: args.responseJson,
      },
      {
        region: wsConfig.baseUrl,
        token: wsConfig.apiKey,
        modelId: wsConfig.model,
      },
    );
    await logUsage(args, result.model, result.promptTokens, result.completionTokens);
    return result.text;
  }

  // OpenAI-compatible path (covers openai, openrouter, together, groq, azure,
  // anthropic-via-openai-compat, gemini-via-openai-compat, custom).
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
  if (!content) throw new Error("Empty response from the QA engine.");

  await logUsage(
    args,
    wsConfig.model,
    resp.usage?.prompt_tokens ?? 0,
    resp.usage?.completion_tokens ?? 0,
  );
  return content;
}

/**
 * Thin wrapper around resolveLlmConfig that just returns null when nothing
 * is configured. Kept as a separate function so future callers can layer
 * in their own validation easily.
 */
async function resolveLlmConfigForWorkspaceOnly(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<{ provider: string; apiKey: string; baseUrl: string; model: string } | null> {
  const fullConfig = await resolveLlmConfig(supabase, clientId);
  if (!fullConfig) return null;
  return {
    provider: fullConfig.provider,
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

