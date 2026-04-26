/**
 * Pure helpers for converting OpenAI token counts into INR costs.
 * Pricing snapshot as of mid-2025 — update PRICE_TABLE when OpenAI changes
 * theirs. INR conversion uses a fixed rate; refine when needed.
 */

/** USD → INR conversion. Hardcoded for predictability; refresh quarterly. */
export const USD_TO_INR = 84;

/**
 * Per-model price in USD per 1,000,000 tokens.
 * Source: https://openai.com/api/pricing
 * Add new models here as we adopt them.
 */
export const PRICE_TABLE: Record<
  string,
  { promptUsdPerM: number; completionUsdPerM: number }
> = {
  "gpt-4o-mini":      { promptUsdPerM: 0.15,  completionUsdPerM: 0.60 },
  "gpt-4o":           { promptUsdPerM: 2.50,  completionUsdPerM: 10.00 },
  "gpt-4.1-mini":     { promptUsdPerM: 0.40,  completionUsdPerM: 1.60 },
  "gpt-4.1":          { promptUsdPerM: 2.00,  completionUsdPerM: 8.00 },
  // Sensible default for unknown models — same as 4o-mini
  default:            { promptUsdPerM: 0.15,  completionUsdPerM: 0.60 },
};

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
  const price = PRICE_TABLE[model] ?? PRICE_TABLE.default;
  // USD per 1M tokens × tokens × INR/USD × 1_000_000 micro-INR / 1_000_000 tokens
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
