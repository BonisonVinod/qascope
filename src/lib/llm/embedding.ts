/**
 * Embedding utility for RAG ingest and retrieval.
 *
 * Uses AWS Bedrock — Amazon Titan Text Embeddings v1 (1536 dimensions),
 * authenticated via a Bedrock API key (Bearer token).
 *
 * Required env vars:
 *   AWS_REGION                 — e.g. us-east-1
 *   AWS_BEARER_TOKEN_BEDROCK   — long-term Bedrock API key
 *
 * Features:
 *   - In-memory cache keyed by exact text (massive savings for criterion-name
 *     embeddings during batch scoring)
 *   - Automatic retry with exponential backoff on 429 (Bedrock rate limit)
 *
 * No SDK dependency — calls the Bedrock REST endpoint directly.
 */

const TITAN_EMBED_MODEL_ID = "amazon.titan-embed-text-v1";
const EMBEDDING_DIM = 1536;

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 600;
const MAX_BACKOFF_MS = 8000;
const CACHE_MAX_ENTRIES = 1000;

// Process-level cache: text -> embedding vector.
// Bounded to CACHE_MAX_ENTRIES (LRU-ish via insertion order).
const _embeddingCache = new Map<string, number[]>();

function cacheGet(text: string): number[] | undefined {
  return _embeddingCache.get(text);
}

function cacheSet(text: string, embedding: number[]): void {
  if (_embeddingCache.size >= CACHE_MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order)
    const firstKey = _embeddingCache.keys().next().value;
    if (firstKey !== undefined) _embeddingCache.delete(firstKey);
  }
  _embeddingCache.set(text, embedding);
}

function getBedrockEndpoint(): string {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not set in environment.");
  }
  return `https://bedrock-runtime.${region}.amazonaws.com`;
}

function getBearerToken(): string {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!token) {
    throw new Error(
      "AWS_BEARER_TOKEN_BEDROCK is not set. Generate a Bedrock API key in the AWS console."
    );
  }
  return token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callBedrockEmbed(text: string): Promise<number[]> {
  const endpoint = getBedrockEndpoint();
  const token = getBearerToken();
  const url = `${endpoint}/model/${TITAN_EMBED_MODEL_ID}/invoke`;

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
      body: JSON.stringify({ inputText: text }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        embedding?: number[];
        inputTextTokenCount?: number;
      };
      if (
        !Array.isArray(data.embedding) ||
        data.embedding.length !== EMBEDDING_DIM
      ) {
        throw new Error(
          `Bedrock returned unexpected embedding shape (length=${data.embedding?.length}).`
        );
      }
      return data.embedding;
    }

    // Retry on 429 (rate limit) and 5xx (transient server)
    if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
      const errBody = await response.text().catch(() => "<no body>");
      lastErr = new Error(
        `Bedrock embedding call failed (${response.status} ${response.statusText}): ${errBody}`
      );
      if (attempt < MAX_RETRIES - 1) {
        // Add small jitter to avoid thundering herd
        const jitter = Math.floor(Math.random() * 200);
        await sleep(backoff + jitter);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        continue;
      }
    } else {
      // Non-retryable error
      const errBody = await response.text().catch(() => "<no body>");
      throw new Error(
        `Bedrock embedding call failed (${response.status} ${response.statusText}): ${errBody}`
      );
    }
  }

  throw lastErr ?? new Error("Bedrock embedding call failed after retries.");
}

/**
 * Get an embedding for a text string.
 * Returns a 1536-dimensional vector from Amazon Titan Text Embeddings v1.
 *
 * Cached: identical text returns the cached vector without hitting Bedrock.
 * This is a big win for batch scoring (the same criterion names get embedded
 * over and over).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("getEmbedding called with empty text.");
  }

  const cached = cacheGet(text);
  if (cached) return cached;

  const embedding = await callBedrockEmbed(text);
  cacheSet(text, embedding);
  return embedding;
}

/**
 * Test-only helper: clear the in-memory cache. Not exported to consumers.
 */
export function _clearEmbeddingCacheForTests(): void {
  _embeddingCache.clear();
}
