/**
 * Bedrock Anthropic Claude chat — used as scoring fallback when
 * AWS_BEARER_TOKEN_BEDROCK is set and no workspace-level LLM provider
 * is configured.
 *
 * Required env vars:
 *   AWS_REGION                  — e.g. us-east-1
 *   AWS_BEARER_TOKEN_BEDROCK    — long-term Bedrock API key
 * Optional:
 *   BEDROCK_CHAT_MODEL_ID       — defaults to us.anthropic.claude-3-5-sonnet-20241022-v2:0
 *
 * No SDK dep — calls Bedrock REST endpoint directly with Bearer auth and
 * the Anthropic Messages API request shape.
 */

const DEFAULT_MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 8000;

function getEndpoint(): string {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("AWS_REGION is not set in environment.");
  return `https://bedrock-runtime.${region}.amazonaws.com`;
}

function getBearerToken(): string {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!token) throw new Error("AWS_BEARER_TOKEN_BEDROCK is not set.");
  return token;
}

export function getBedrockChatModelId(): string {
  return process.env.BEDROCK_CHAT_MODEL_ID || DEFAULT_MODEL_ID;
}

export function bedrockChatAvailable(): boolean {
  return Boolean(process.env.AWS_REGION && process.env.AWS_BEARER_TOKEN_BEDROCK);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BedrockClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface BedrockClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: BedrockClaudeUsage;
  stop_reason?: string;
  [k: string]: unknown;
}

/**
 * Call Bedrock Anthropic Claude with a system + user message pair.
 * Returns the assistant text plus usage tokens.
 */
export async function bedrockChat(args: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseJson?: boolean;
}): Promise<{ text: string; promptTokens: number; completionTokens: number; model: string }> {
  const modelId = getBedrockChatModelId();
  const endpoint = getEndpoint();
  const token = getBearerToken();
  const url = `${endpoint}/model/${encodeURIComponent(modelId)}/invoke`;

  // Anthropic doesn't have a hard json-response mode; nudge in the system
  // prompt if the caller asked for JSON output.
  const systemPrompt = args.responseJson
    ? args.system + "\n\nIMPORTANT: Respond with a single valid JSON object only, no surrounding prose, no markdown code fences."
    : args.system;

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: args.maxTokens ?? 2048,
    temperature: args.temperature ?? 0.2,
    system: systemPrompt,
    messages: [
      { role: "user", content: args.user },
    ],
  };

  let lastErr: unknown;
  let backoff = INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json()) as BedrockClaudeResponse;
      const textBlocks = (data.content || [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string);
      let text = textBlocks.join("");
      if (!text) {
        throw new Error("Bedrock Claude returned empty content.");
      }
      // If JSON mode, strip a possible code fence wrapper.
      if (args.responseJson) {
        text = stripJsonFence(text);
      }
      return {
        text,
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        model: modelId,
      };
    }

    if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
      const errBody = await response.text().catch(() => "<no body>");
      lastErr = new Error(
        `Bedrock chat call failed (${response.status} ${response.statusText}): ${errBody}`
      );
      if (attempt < MAX_RETRIES - 1) {
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff + jitter);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        continue;
      }
    } else {
      const errBody = await response.text().catch(() => "<no body>");
      throw new Error(
        `Bedrock chat call failed (${response.status} ${response.statusText}): ${errBody}`
      );
    }
  }

  throw lastErr ?? new Error("Bedrock chat call failed after retries.");
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  // Match ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}
