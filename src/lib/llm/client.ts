import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Per-workspace LLM provider config. All providers below speak the OpenAI
 * Chat Completions API spec, so the SDK is the same; only baseURL + key
 * + model change.
 */
export type LlmProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "openrouter"
  | "groq"
  | "azure"
  | "custom";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

/**
 * Default endpoints per provider. Customers can override base_url for
 * provider-specific edge cases (Azure OpenAI deployment URLs etc.).
 */
const DEFAULT_BASE_URL: Record<LlmProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  xai: "https://api.x.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  azure: "", // must be supplied by the customer
  custom: "", // must be supplied by the customer
};

/** Default model per provider — just a sensible starting point. */
const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.5-flash",
  xai: "grok-3-mini",
  openrouter: "openai/gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  azure: "gpt-4o-mini",
  custom: "gpt-4o-mini",
};

// ---------------------------------------------------------------------------
// Model catalog — curated list per provider for the Settings UI dropdown.
// Every provider also supports a "Custom model ID" escape hatch.
// ---------------------------------------------------------------------------

export type ModelEntry = {
  /** Exact model ID to send to the API */
  id: string;
  /** Human-friendly display name */
  label: string;
  /** Show a ⭐ recommended badge in the dropdown */
  recommended?: boolean;
  /** Short context hint, e.g. "128K context" */
  context?: string;
};

/** Sentinel value for "I want to type a custom model ID" */
export const CUSTOM_MODEL_SENTINEL = "__custom__";

export const PROVIDER_MODELS: Record<LlmProvider, ModelEntry[]> = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o", context: "128K", recommended: true },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", context: "128K" },
    { id: "gpt-4.1", label: "GPT-4.1", context: "1M" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", context: "1M" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", context: "1M" },
    { id: "o4-mini", label: "o4-mini (Reasoning)", context: "200K" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", context: "200K", recommended: true },
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", context: "200K" },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)", context: "200K" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", context: "1M", recommended: true },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", context: "1M" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", context: "1M" },
  ],
  xai: [
    { id: "grok-3", label: "Grok 3", recommended: true },
    { id: "grok-3-mini", label: "Grok 3 Mini" },
    { id: "grok-3-fast", label: "Grok 3 Fast" },
  ],
  openrouter: [
    { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)", recommended: true },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (via OpenRouter)" },
    { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (via OpenRouter)" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OpenRouter)" },
    { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro (via OpenRouter)" },
    { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash (via OpenRouter)" },
    { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick (via OpenRouter)" },
    { id: "x-ai/grok-3", label: "Grok 3 (via OpenRouter)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", recommended: true },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", context: "32K" },
  ],
  azure: [
    { id: "gpt-4o", label: "GPT-4o", recommended: true },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  ],
  custom: [],
};

/**
 * Resolve the LLM config for a workspace. The workspace MUST have its own
 * key configured in Settings — there is no env-var fallback in production.
 * This forces every customer to bring their own API key, which is a
 * deliberate product decision (cost ownership + data isolation).
 *
 * Returns null if no workspace key is configured; the caller should
 * surface a friendly "Configure your LLM key in Settings" error.
 */
export async function resolveLlmConfig(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<LlmConfig | null> {
  const { data: client } = await supabase
    .from("clients")
    .select("llm_provider, llm_api_key, llm_base_url, llm_model")
    .eq("id", clientId)
    .single();

  if (!client?.llm_api_key) {
    return null;
  }

  const provider = (client.llm_provider as LlmProvider) ?? "openai";
  return {
    provider,
    apiKey: client.llm_api_key,
    baseUrl: client.llm_base_url || DEFAULT_BASE_URL[provider] || "",
    model: client.llm_model || DEFAULT_MODEL[provider] || "gpt-4o-mini",
  };
}

/**
 * Build a configured OpenAI SDK client for a workspace. Throws if there's
 * no key configured anywhere — caller should catch and surface a clean
 * "Configure your LLM key in Settings" error.
 */
export async function getLlmClient(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<{ client: OpenAI; config: LlmConfig }> {
  const config = await resolveLlmConfig(supabase, clientId);
  if (!config) {
    throw new Error(
      "No LLM configured. Set up an API key in Settings → LLM provider.",
    );
  }
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });
  return { client, config };
}

/**
 * Helpful provider metadata for the Settings UI — labels, descriptions,
 * default models so the dropdown can preview the right model name.
 */
export const PROVIDER_INFO: Record<
  LlmProvider,
  { label: string; description: string; defaultBaseUrl: string; defaultModel: string }
> = {
  openai: {
    label: "OpenAI",
    description: "GPT-4o, GPT-4.1 — most reliable, widely supported.",
    defaultBaseUrl: DEFAULT_BASE_URL.openai,
    defaultModel: DEFAULT_MODEL.openai,
  },
  anthropic: {
    label: "Anthropic",
    description: "Claude Sonnet 4, Claude 3.5 — excellent for nuanced QA scoring.",
    defaultBaseUrl: DEFAULT_BASE_URL.anthropic,
    defaultModel: DEFAULT_MODEL.anthropic,
  },
  gemini: {
    label: "Google Gemini",
    description: "Gemini 2.5 Pro/Flash — cost-effective with massive 1M context.",
    defaultBaseUrl: DEFAULT_BASE_URL.gemini,
    defaultModel: DEFAULT_MODEL.gemini,
  },
  xai: {
    label: "xAI (Grok)",
    description: "Grok 3 — fast and capable, growing ecosystem.",
    defaultBaseUrl: DEFAULT_BASE_URL.xai,
    defaultModel: DEFAULT_MODEL.xai,
  },
  openrouter: {
    label: "OpenRouter",
    description:
      "One API key, hundreds of models. Switch between providers without changing your key. Pay-as-you-go.",
    defaultBaseUrl: DEFAULT_BASE_URL.openrouter,
    defaultModel: DEFAULT_MODEL.openrouter,
  },
  groq: {
    label: "Groq",
    description: "Ultra-fast inference on open-source models. Great free tier.",
    defaultBaseUrl: DEFAULT_BASE_URL.groq,
    defaultModel: DEFAULT_MODEL.groq,
  },
  azure: {
    label: "Azure OpenAI",
    description: "Microsoft's OpenAI offering. Requires deployment-specific base URL.",
    defaultBaseUrl: "",
    defaultModel: DEFAULT_MODEL.azure,
  },
  custom: {
    label: "Custom / Other",
    description: "Any OpenAI-API-compatible endpoint. You supply base URL + key + model.",
    defaultBaseUrl: "",
    defaultModel: "",
  },
};

export const PROVIDER_ORDER: LlmProvider[] = [
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "xai",
  "groq",
  "azure",
  "custom",
];
