/**
 * Pure helpers for converting LLM token counts into INR costs.
 * Pricing snapshot as of late-2025 — update PRICE_TABLE when providers
 * change theirs. INR conversion uses a fixed rate; refine when needed.
 *
 * The table covers OpenAI, AWS Bedrock (Amazon Nova, Anthropic Claude, Meta
 * Llama), OpenRouter-style namespaced ids, and Google Gemini. Lookup is
 * resilient to provider prefixes (`us.amazon.nova-pro-v1:0`,
 * `global.anthropic.claude-sonnet-4-6`, `openai/gpt-4o-mini`, etc.) — see
 * normaliseModelId() below.
 */

/** USD → INR conversion. Hardcoded for predictability; refresh quarterly. */
export const USD_TO_INR = 84;

/**
 * Per-model price in USD per 1,000,000 tokens.
 * Sources:
 *   • OpenAI:    https://openai.com/api/pricing
 *   • Bedrock:   https://aws.amazon.com/bedrock/pricing/
 *   • Gemini:    https://ai.google.dev/pricing
 * Keys are NORMALISED model ids (lowercase, provider prefix stripped).
 */
export const PRICE_TABLE: Record<
  string,
  { promptUsdPerM: number; completionUsdPerM: number }
> = {
  // ---- OpenAI ----
  "gpt-4o-mini":           { promptUsdPerM: 0.15,  completionUsdPerM: 0.60 },
  "gpt-4o":                { promptUsdPerM: 2.50,  completionUsdPerM: 10.00 },
  "gpt-4-1-mini":          { promptUsdPerM: 0.40,  completionUsdPerM: 1.60 },
  "gpt-4-1":               { promptUsdPerM: 2.00,  completionUsdPerM: 8.00 },

  // ---- AWS Bedrock — Amazon Nova ----
  "nova-micro":            { promptUsdPerM: 0.035, completionUsdPerM: 0.14 },
  "nova-lite":             { promptUsdPerM: 0.06,  completionUsdPerM: 0.24 },
  "nova-pro":              { promptUsdPerM: 0.80,  completionUsdPerM: 3.20 },
  "nova-premier":          { promptUsdPerM: 2.50,  completionUsdPerM: 12.50 },

  // ---- AWS Bedrock — Anthropic Claude ----
  "claude-3-haiku":        { promptUsdPerM: 0.25,  completionUsdPerM: 1.25 },
  "claude-3-5-haiku":      { promptUsdPerM: 0.80,  completionUsdPerM: 4.00 },
  "claude-3-sonnet":       { promptUsdPerM: 3.00,  completionUsdPerM: 15.00 },
  "claude-3-opus":         { promptUsdPerM: 15.00, completionUsdPerM: 75.00 },
  "claude-sonnet-4":       { promptUsdPerM: 3.00,  completionUsdPerM: 15.00 },
  "claude-sonnet-4-5":     { promptUsdPerM: 3.00,  completionUsdPerM: 15.00 },
  "claude-sonnet-4-6":     { promptUsdPerM: 3.00,  completionUsdPerM: 15.00 },
  "claude-opus-4":         { promptUsdPerM: 15.00, completionUsdPerM: 75.00 },
  "claude-opus-4-1":       { promptUsdPerM: 15.00, completionUsdPerM: 75.00 },
  "claude-haiku-4-5":      { promptUsdPerM: 1.00,  completionUsdPerM: 5.00 },

  // ---- AWS Bedrock — Meta Llama ----
  "llama3-1-8b-instruct":  { promptUsdPerM: 0.22,  completionUsdPerM: 0.22 },
  "llama3-1-70b-instruct": { promptUsdPerM: 0.99,  completionUsdPerM: 0.99 },
  "llama3-3-70b-instruct": { promptUsdPerM: 0.72,  completionUsdPerM: 0.72 },

  // ---- Google Gemini (via OpenAI-compat endpoint) ----
  "gemini-2-5-flash":      { promptUsdPerM: 0.10,  completionUsdPerM: 0.40 },
  "gemini-2-5-pro":        { promptUsdPerM: 1.25,  completionUsdPerM: 5.00 },
  "gemini-1-5-flash":      { promptUsdPerM: 0.075, completionUsdPerM: 0.30 },
  "gemini-1-5-pro":        { promptUsdPerM: 1.25,  completionUsdPerM: 5.00 },

  // Sensible default for unknown models
  default:                 { promptUsdPerM: 0.15,  completionUsdPerM: 0.60 },
};

/**
 * Normalise the various model-id formats we see in the wild down to keys
 * used in PRICE_TABLE. Examples:
 *   "us.amazon.nova-pro-v1:0"             -> "nova-pro"
 *   "global.anthropic.claude-sonnet-4-6"  -> "claude-sonnet-4-6"
 *   "anthropic.claude-3-haiku-20240307-v1:0" -> "claude-3-haiku"
 *   "openai/gpt-4o-mini"                  -> "gpt-4o-mini"
 *   "openrouter/anthropic/claude-3.5-sonnet" -> "claude-3-5-sonnet"
 *   "models/gemini-2.5-flash"             -> "gemini-2-5-flash"
 */
export function normaliseModelId(model: string): string {
  let id = model.toLowerCase().trim();
  id = id.replace(/^(us|global|eu|apac)\./, "");
  id = id.replace(
    /^(amazon|anthropic|meta|mistral|cohere|deepseek|writer|stability|google|openai|together|groq|openrouter|gemini|models)[./]/,
    "",
  );
  id = id.replace(
    /^(amazon|anthropic|meta|mistral|cohere|deepseek|writer|stability|google|openai|together|groq|gemini|models)[./]/,
    "",
  );
  id = id.replace(/[:-]v\d+(?::\d+)?$/, "");
  id = id.replace(/:\d+$/, "");
  id = id.replace(/-\d{8}$/, "");
  id = id.replace(/\./g, "-");
  return id;
}

/**
 * Convert (model, prompt-tokens, completion-tokens) to a cost in micro-rupees
 * (1 INR = 1,000,000 micro-rupees). Integer math keeps round-trips through
 * Postgres clean.
 */
export function estimateCostMicroInr(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const key = normaliseModelId(model);
  const price = PRICE_TABLE[key] ?? PRICE_TABLE.default;
  const promptUsd = (promptTokens * price.promptUsdPerM) / 1_000_000;
  const completionUsd = (completionTokens * price.completionUsdPerM) / 1_000_000;
  const totalUsd = promptUsd + completionUsd;
  return Math.round(totalUsd * USD_TO_INR * 1_000_000);
}

/** Convert micro-rupees back to a human-readable INR string. */
export function formatMicroInr(microInr: number): string {
  const rupees = microInr / 1_000_000;
  if (rupees < 0.01) return "<₹0.01";
  if (rupees < 1) return `₹${rupees.toFixed(2)}`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Format a token count (1234 -> "1,234"). */
export function formatTokens(n: number): string {
  return n.toLocaleString("en-IN");
}
