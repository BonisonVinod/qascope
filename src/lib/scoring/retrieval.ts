/**
 * Knowledge retrieval for RAG-enhanced scoring.
 * Retrieves relevant document chunks by embedding similarity.
 * Respects a 2000-token context budget per criterion.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getEmbedding } from "@/lib/llm/embedding";

type SB = SupabaseClient<Database>;

export interface KnowledgeSource {
  document_id: string;
  document_title: string;
  chunk_id: string;
  chunk_index?: number;
}

export interface RetrievalResult {
  context: string;
  sources: KnowledgeSource[];
}

/**
 * Estimate token count using word count * 1.3 heuristic.
 * Matches the estimation in chunking.ts for consistency.
 */
function estimateTokens(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount * 1.3);
}

/**
 * Retrieve relevant knowledge chunks for a query.
 * Embeds the query, searches by cosine similarity, and assembles
 * a context string respecting the 2000-token budget.
 *
 * @param supabase - Supabase client
 * @param workspace_id - Workspace/client ID
 * @param query - User's criterion name or query string
 * @param opts - Retrieval options
 * @returns Promise<RetrievalResult | null> — null if no chunks found above threshold
 */
export async function retrieveKnowledge(
  supabase: SB,
  workspace_id: string,
  query: string,
  opts?: { limit?: number; similarityThreshold?: number }
): Promise<RetrievalResult | null> {
  const limit = opts?.limit ?? 15;
  const similarityThreshold = opts?.similarityThreshold ?? 0.5;

  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(query);
  } catch (err) {
    console.error("Failed to embed query:", err);
    return null;
  }

  // Call the Supabase RPC to fetch chunks.
  const { data: chunks, error } = await supabase.rpc(
    "search_knowledge_chunks",
    {
      p_workspace_id: workspace_id,
      p_embedding: queryEmbedding,
      p_limit: limit,
      p_similarity_threshold: similarityThreshold,
    }
  );

  if (error) {
    console.error("RPC error in search_knowledge_chunks:", error);
    return null;
  }

  if (!chunks || chunks.length === 0) {
    return null;
  }

  // Assemble context string, respecting the 2000-token budget.
  const contextLines: string[] = [];
  const contextSources: KnowledgeSource[] = [];
  let contextTokens = 0;
  const maxTokens = 2000;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.chunk_text);

    // If adding this chunk would exceed the budget, stop.
    if (contextTokens + chunkTokens > maxTokens) {
      break;
    }

    // Add chunk to context with a provenance marker.
    contextLines.push(
      `[Doc: ${chunk.document_title} (v${chunk.document_version}), chunk ${chunk.chunk_index}]\n${chunk.chunk_text}`
    );

    contextSources.push({
      document_id: chunk.document_id,
      document_title: chunk.document_title,
      chunk_id: chunk.chunk_id,
      chunk_index: chunk.chunk_index,
    });

    contextTokens += chunkTokens;
  }

  if (contextLines.length === 0) {
    return null;
  }

  const context = contextLines.join("\n\n");

  return {
    context,
    sources: contextSources,
  };
}
