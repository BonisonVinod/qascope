/**
 * Bedrock chat — uses the AWS Bedrock Converse API.
 *
 * The Converse API has a single request/response shape that works across
 * every Bedrock-hosted model family (Amazon Nova, Anthropic Claude, Meta
 * Llama, Mistral, Cohere, etc.). To swap the underlying model, change
 * cfg.modelId — no code change required.
 *
 * Credentials are PASSED IN by the caller, not read from process.env. This
 * lets us configure Bedrock per-workspace via Settings → QA engine provider:
 *   - cfg.region = AWS region (e.g. "us-east-1")
 *   - cfg.token  = long-term Bedrock Bearer token (AWS_BEARER_TOKEN_BEDROCK)
 *   - cfg.modelId = Bedrock inference profile ID
 *
 * No SDK dep — calls the Bedrock REST endpoint directly with Bearer auth.
 *
 * Reference:
 *   https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
 */

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 8000;

export const DEFAULT_BEDROCK_MODEL_ID =
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0";

export type BedrockConfig = {
  region: string;
  token: string;
  modelId: string;
};

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
 * Call Bedrock Converse API with a system + user message pair. Returns the
 * assistant text plus usage tokens. Works with any Converse-compatible
 * Bedrock model (Nova, Claude, Llama, Mistral, Cohere, etc.).
 */
export async function bedrockChat(
  args: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    responseJson?: boolean;
  },
  cfg: BedrockConfig,
): Promise<{
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}> {
  if (!cfg.region) throw new Error("Bedrock region is not configured.");
  if (!cfg.token) throw new Error("Bedrock bearer token is not configured.");
  if (!cfg.modelId) throw new Error("Bedrock model id is not configured.");

  const endpoint = `https://bedrock-runtime.${cfg.region}.amazonaws.com`;
  const url = `${endpoint}/model/${encodeURIComponent(cfg.modelId)}/converse`;

  const systemPrompt = args.responseJson
    ? args.system +
      "\n\nIMPORTANT: Respond with a single valid JSON object only, no surrounding prose, no markdown code fences."
    : args.system;

  const body = {
    messages: [{ role: "user", content: [{ text: args.user }] }],
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
        Authorization: `Bearer ${cfg.token}`,
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
      if (args.responseJson) {
        text = stripJsonFence(text);
      }
      return {
        text,
        promptTokens: data.usage?.inputTokens ?? 0,
        completionTokens: data.usage?.outputTokens ?? 0,
        model: cfg.modelId,
      };
    }

    if (
      response.status === 429 ||
      (response.status >= 500 && response.status < 600)
    ) {
      const errBody = await response.text().catch(() => "<no body>");
      lastErr = new Error(
        `Bedrock chat call failed (${response.status} ${response.statusText}): ${errBody}`,
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
        `Bedrock chat call failed (${response.status} ${response.statusText}): ${errBody}`,
      );
    }
  }

  throw lastErr ?? new Error("Bedrock chat call failed after retries.");
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}
