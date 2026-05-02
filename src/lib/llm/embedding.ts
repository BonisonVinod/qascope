/**
 * Embedding utility for RAG ingest and retrieval.
 * Hardcoded to OpenAI's text-embedding-3-small (1536 dimensions) for v1.
 *
 * v1 uses the hosted OPENAI_API_KEY. BYO embedding provider (e.g., Cohere, Voyage)
 * is deferred to v2.
 */

import OpenAI from "openai";

let _embeddingClient: OpenAI | null = null;

/**
 * Get or create the embedding client.
 * Uses OPENAI_API_KEY from environment.
 */
function getEmbeddingClient(): OpenAI {
  if (!_embeddingClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment.");
    }
    _embeddingClient = new OpenAI({ apiKey });
  }
  return _embeddingClient;
}

/**
 * Get an embedding for a text string.
 * Returns a 1536-dimensional vector.
 *
 * @param text - Text to embed
 * @returns Promise<number[]> — the 1536-dim embedding vector
 * @throws if OPENAI_API_KEY is not set or the API call fails
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getEmbeddingClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("No embedding returned from OpenAI.");
  }

  return embedding;
}
