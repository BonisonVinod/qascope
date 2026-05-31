/**
 * Embedding utility for RAG ingest and retrieval.
 *
 * Production policy: every workspace must bring its own API key. There is
 * no env-var or AWS Bedrock fallback. Resolution order:
 *
 *   1. If clients.llm_embedding_api_key is set, use that (with the
 *      optional clients.llm_embedding_base_url) — lets a workspace pay for
 *      embeddings on a different / cheaper provider than chat.
 *   2. Otherwise use the workspace's chat key (clients.llm_api_key,
 *      clients.llm_base_url) — same /embeddings endpoint.
 *   3. If neither is configured, throw — the caller surfaces a clean
 *      "Configure your QA engine in Settings" message.
 *
 * Vector dimension is fixed at 1536 (text-embedding-3-small default), so
 * the pgvector column stays compatible across providers. text-embedding-3-large
 * works too — we ask for 1536 dims explicitly.
 */

import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const OPENAI_COMPAT_EMBED_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const CACHE_MAX_ENTRIES = 1000;

// Process-level cache: text -> embedding vector. Bounded LRU-ish.
const _embeddingCache = new Map<string, number[]>();

function cacheGet(key: string): number[] | undefined {
  return _embeddingCache.get(key);
}

function cacheSet(key: string, embedding: number[]): void {
  if (_embeddingCache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = _embeddingCache.keys().next().value;
    if (firstKey !== undefined) _embeddingCache.delete(firstKey);
  }
  _embeddingCache.set(key, embedding);
}

type EmbeddingCreds = {
  apiKey: string;
  baseUrl: string;
  /** Where this came from — only used in error/log messages, not behaviour. */
  source: "embedding-key" | "chat-key";
};

async function resolveEmbeddingCreds(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<EmbeddingCreds | null> {
  const { data: c } = await supabase
    .from("clients")
    .select(
      "llm_provider, llm_api_key, llm_base_url, llm_embedding_api_key, llm_embedding_base_url",
    )
    .eq("id", clientId)
    .single();

  if (c?.llm_embedding_api_key) {
    return {
      apiKey: c.llm_embedding_api_key,
      baseUrl: c.llm_embedding_base_url ?? "",
      source: "embedding-key",
    };
  }

  if (c?.llm_provider === "bedrock") {
    return null;
  }

  if (c?.llm_api_key) {
    return {
      apiKey: c.llm_api_key,
      baseUrl: c.llm_base_url ?? "",
      source: "chat-key",
    };
  }
  return null;
}

async function callOpenAiCompatEmbed(
  apiKey: string,
  baseUrl: string,
  text: string,
): Promise<number[]> {
  const client = new OpenAI({ apiKey, baseURL: baseUrl || undefined });
  const resp = await client.embeddings.create({
    model: OPENAI_COMPAT_EMBED_MODEL,
    input: text,
    // Force 1536 dims even on text-embedding-3-large — keeps the pgvector
    // column compatible with existing rows.
    dimensions: EMBEDDING_DIM,
  });

  if (!resp || !resp.data) {
    if (baseUrl && (baseUrl.includes("/keys") || baseUrl.includes("/workspaces"))) {
      throw new Error(
        `Invalid Base URL configured in Settings ("${baseUrl}"). It seems to be a website settings page URL instead of the actual API endpoint. For OpenRouter, please use "https://openrouter.ai/api/v1".`
      );
    }
    throw new Error(
      `Embedding endpoint did not return a valid data array. Check that your API key and Base URL ("${baseUrl || "https://api.openai.com/v1"}") are correct.`
    );
  }

  const v = resp.data[0]?.embedding;
  if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
    throw new Error(
      `Embedding endpoint returned unexpected shape (length=${v?.length}).`,
    );
  }
  return v;
}

/**
 * Get an embedding for a text string. Always uses the workspace's own
 * API key — no env-var fallback. Throws if no key is configured.
 *
 * Cached: identical (creds, text) returns the cached vector without
 * hitting any provider. Big win for batch scoring where the same
 * criterion names get embedded over and over.
 */
export async function getEmbedding(
  text: string,
  opts: { supabase: SupabaseClient<Database>; clientId: string },
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("getEmbedding called with empty text.");
  }

  const creds = await resolveEmbeddingCreds(opts.supabase, opts.clientId);
  if (!creds) {
    throw new Error(
      "QA engine API key is not configured for this workspace. " +
        "An admin must set it in Settings → QA engine provider.",
    );
  }

  const cacheKey = `wb:${creds.source}:${creds.baseUrl}:${creds.apiKey.slice(-6)}:${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const embedding = await callOpenAiCompatEmbed(creds.apiKey, creds.baseUrl, text);
  cacheSet(cacheKey, embedding);
  return embedding;
}

/** Test-only helper: clear the in-memory cache. */
export function _clearEmbeddingCacheForTests(): void {
  _embeddingCache.clear();
}
