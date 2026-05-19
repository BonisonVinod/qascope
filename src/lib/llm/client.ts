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
  | "openrouter"
  | "together"
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
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  groq: "https://api.groq.com/openai/v1",
  azure: "", // must be supplied by the customer
  custom: "", // must be supplied by the customer
};

/** Default model per provider — just a sensible starting point. */
const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  groq: "llama-3.1-70b-versatile",
  azure: "gpt-4o-mini",
  custom: "gpt-4o-mini",
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
    label: "OpenAI (direct)",
    description: "Use OpenAI's API directly. Most reliable, often most expensive.",
    defaultBaseUrl: DEFAULT_BASE_URL.openai,
    defaultModel: DEFAULT_MODEL.openai,
  },
  openrouter: {
    label: "OpenRouter (recommended)",
    description:
      "One API key, hundreds of models. Switch between OpenAI, Anthropic, Llama without changing your key. Pay-as-you-go.",
    defaultBaseUrl: DEFAULT_BASE_URL.openrouter,
    defaultModel: DEFAULT_MODEL.openrouter,
  },
  together: {
    label: "Together AI",
    description: "Cheap open-source models (Llama, Mixtral, etc.).",
    defaultBaseUrl: DEFAULT_BASE_URL.together,
    defaultModel: DEFAULT_MODEL.together,
  },
  groq: {
    label: "Groq",
    description: "Very fast inference on Llama models. Sometimes free tier.",
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
    label: "Custom",
    description: "Any OpenAI-API-compatible endpoint. You supply base URL + key + model.",
    defaultBaseUrl: "",
    defaultModel: "",
  },
};

export const PROVIDER_ORDER: LlmProvider[] = [
  "openrouter",
  "openai",
  "together",
  "groq",
  "azure",
  "custom",
];
