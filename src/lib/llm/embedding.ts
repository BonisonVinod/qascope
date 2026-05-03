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
 * Output is a 1536-dimensional vector that drops directly into the
 * vector(1536) column on document_chunks (see migration 011).
 *
 * No SDK dependency — calls the Bedrock REST endpoint directly.
 */

const TITAN_EMBED_MODEL_ID = "amazon.titan-embed-text-v1";
const EMBEDDING_DIM = 1536;

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

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("getEmbedding called with empty text.");
  }

  const endpoint = getBedrockEndpoint();
  const token = getBearerToken();
  const url = `${endpoint}/model/${TITAN_EMBED_MODEL_ID}/invoke`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ inputText: text }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "<no body>");
    throw new Error(
      `Bedrock embedding call failed (${response.status} ${response.statusText}): ${errBody}`
    );
  }

  const data = (await response.json()) as {
    embedding?: number[];
    inputTextTokenCount?: number;
  };

  if (!Array.isArray(data.embedding) || data.embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `Bedrock returned unexpected embedding shape (length=${data.embedding?.length}).`
    );
  }

  return data.embedding;
}
