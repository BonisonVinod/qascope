/**
 * Bedrock chat — provider-agnostic, uses the Bedrock Converse API.
 *
 * The Converse API has a single request/response shape that works across
 * every Bedrock-hosted model family (Amazon Nova, Anthropic Claude, Meta
 * Llama, Mistral, Cohere, etc.). To swap the underlying model, change the
 * BEDROCK_CHAT_MODEL_ID env var — no code change required.
 *
 * Required env vars:
 *   AWS_REGION                  — e.g. us-east-1
 *   AWS_BEARER_TOKEN_BEDROCK    — long-term Bedrock API key (Bearer token)
 * Optional:
 *   BEDROCK_CHAT_MODEL_ID       — defaults to us.amazon.nova-pro-v1:0
 *
 * No SDK dep — calls the Bedrock REST endpoint directly with Bearer auth.
 *
 * Reference: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
 */

const DEFAULT_MODEL_ID = "us.amazon.nova-pro-v1:0";
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
  return (
    process.env.BEDROCK_CHAT_MODEL_ID ||
    process.env.LLM_MODEL ||
    DEFAULT_MODEL_ID
  );
}

export function bedrockChatAvailable(): boolean {
  return Boolean(process.env.AWS_REGION && process.env.AWS_BEARER_TOKEN_BEDROCK);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ConverseUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface ConverseContentBlock {
  text?: string;
  [k: string]: unknown;
}

interface ConverseResponse {
  output?: {
    message?: {
      role?: string;
      content?: ConverseContentBlock[];
    };
  };
  usage?: ConverseUsage;
  stopReason?: string;
  [k: string]: unknown;
}

/**
 * Call Bedrock Converse API with a system + user message pair.
 * Returns the assistant text plus usage tokens.
 *
 * Works with any Converse-compatible Bedrock model (Nova, Claude, Llama,
 * Mistral, Cohere, etc.) — set BEDROCK_CHAT_MODEL_ID to pick one.
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
  const url = `${endpoint}/model/${encodeURIComponent(modelId)}/converse`;

  // Converse API doesn't have a hard json-response mode; nudge in the system
  // prompt if the caller asked for JSON output.
  const systemPrompt = args.responseJson
    ? args.system + "\n\nIMPORTANT: Respond with a single valid JSON object only, no surrounding prose, no markdown code fences."
    : args.system;

  const body = {
    messages: [
      {
        role: "user",
        content: [{ text: args.user }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: args.maxTokens ?? 2048,
      temperature: args.temperature ?? 0.2,
    },
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
      const data = (await response.json()) as ConverseResponse;
      const contentBlocks = data.output?.message?.content || [];
      const textBlocks = contentBlocks
        .filter((b) => typeof b.text === "string")
        .map((b) => b.text as string);
      let text = textBlocks.join("");
      if (!text) {
        throw new Error("Bedrock Converse returned empty content.");
      }
      // If JSON mode, strip a possible code fence wrapper.
      if (args.responseJson) {
        text = stripJsonFence(text);
      }
      return {
        text,
        promptTokens: data.usage?.inputTokens ?? 0,
        completionTokens: data.usage?.outputTokens ?? 0,
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
