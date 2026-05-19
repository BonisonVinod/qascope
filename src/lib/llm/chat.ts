/**
 * Universal env-driven LLM dispatcher.
 *
 * Picks a provider and model from environment variables so you can swap
 * providers without changing any code. Set LLM_PROVIDER + LLM_MODEL +
 * LLM_API_KEY (and optionally LLM_BASE_URL) and you're done.
 *
 * Supported providers (LLM_PROVIDER values):
 *   bedrock     — AWS Bedrock (Nova, Llama, Mistral, Anthropic, etc.)
 *                 Auth: AWS_REGION + AWS_BEARER_TOKEN_BEDROCK
 *                 Model: any Bedrock model id (set via LLM_MODEL or
 *                        BEDROCK_CHAT_MODEL_ID)
 *   openai      — OpenAI (default base URL)
 *   openrouter  — OpenRouter (LLM_BASE_URL=https://openrouter.ai/api/v1)
 *   gemini      — Google Gemini via its OpenAI-compatible endpoint
 *                 (LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/)
 *   groq        — Groq (LLM_BASE_URL=https://api.groq.com/openai/v1)
 *   together    — Together AI (LLM_BASE_URL=https://api.together.xyz/v1)
 *   anthropic   — Anthropic via its OpenAI-compatible endpoint
 *                 (LLM_BASE_URL=https://api.anthropic.com/v1/)
 *   custom      — Any other OpenAI-compatible API. Set LLM_BASE_URL.
 *
 * Auto-detection: if LLM_PROVIDER is unset, falls back to:
 *   • bedrock if AWS_BEARER_TOKEN_BEDROCK is set
 *   • openai-compatible if LLM_API_KEY or OPENAI_API_KEY is set
 *
 * For non-bedrock providers we use the OpenAI SDK with a base URL override —
 * that one client speaks to anything that exposes an OpenAI-compatible API.
 */

import OpenAI from "openai";
import {
  bedrockChat,
  bedrockChatAvailable,
  getBedrockChatModelId,
} from "./bedrock-chat";

export type ChatArgs = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseJson?: boolean;
};

export type ChatResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

/** Returns "bedrock" | "openai-compatible" | null based on env. */
export function getEnvProvider(): "bedrock" | "openai-compatible" | null {
  const explicit = (process.env.LLM_PROVIDER || "").trim().toLowerCase();

  if (explicit === "bedrock") return "bedrock";
  if (
    explicit === "openai" ||
    explicit === "openrouter" ||
    explicit === "gemini" ||
    explicit === "groq" ||
    explicit === "together" ||
    explicit === "anthropic" ||
    explicit === "custom" ||
    explicit === "openai-compatible"
  ) {
    return "openai-compatible";
  }

  // Auto-detect when LLM_PROVIDER is unset
  if (process.env.LLM_API_KEY) return "openai-compatible";
  if (bedrockChatAvailable()) return "bedrock";
  if (process.env.OPENAI_API_KEY) return "openai-compatible";

  return null;
}

export function envChatAvailable(): boolean {
  return getEnvProvider() !== null;
}

/** The model id that envChat() will use, given current env. */
export function getEnvChatModelId(): string {
  const provider = getEnvProvider();
  if (provider === "bedrock") return getBedrockChatModelId();
  return (
    process.env.LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini"
  );
}

/**
 * Run a chat completion against whichever provider env vars point to.
 * Same input/output shape as bedrockChat() so callers don't care.
 */
export async function envChat(args: ChatArgs): Promise<ChatResult> {
  const provider = getEnvProvider();
  if (!provider) {
    throw new Error(
      "No LLM provider configured. Set LLM_PROVIDER + LLM_MODEL + LLM_API_KEY in .env.local " +
        "(or AWS_BEARER_TOKEN_BEDROCK + AWS_REGION for Bedrock).",
    );
  }

  if (provider === "bedrock") {
    return bedrockChat(args);
  }

  // openai-compatible path — uses OpenAI SDK with optional baseURL override
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY (or OPENAI_API_KEY) is not set.");
  }
  const baseURL = process.env.LLM_BASE_URL || undefined;
  const model =
    process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const client = new OpenAI({ apiKey, baseURL });
  const resp = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.2,
    max_tokens: args.maxTokens,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: args.responseJson ? { type: "json_object" } : undefined,
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from the LLM.");

  return {
    text: content,
    promptTokens: resp.usage?.prompt_tokens ?? 0,
    completionTokens: resp.usage?.completion_tokens ?? 0,
    model,
  };
}
