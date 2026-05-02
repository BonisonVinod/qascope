/**
 * Document chunking utility for RAG ingest.
 * Splits text on paragraph boundaries to respect semantic structure.
 * Target chunk size: ~800 tokens (estimated using word_count * 1.3).
 *
 * NOTE: Token estimation is a heuristic. For code-heavy documents (SQL, JSON),
 * the actual token count may exceed the estimate. Consider swapping in tiktoken
 * or a similar library if v1 customers have SOPs with heavy code blocks.
 */

export interface ChunkingOptions {
  /**
   * Target token count per chunk. Actual chunks may be smaller (if paragraph
   * boundaries occur earlier) or slightly larger (if a single paragraph exceeds
   * the target). Default: 800 tokens.
   */
  targetTokens?: number;

  /**
   * Overlap in tokens between consecutive chunks. Default: 128 tokens.
   * Helps preserve context across chunk boundaries for RAG retrieval.
   */
  overlapTokens?: number;
}

/**
 * Split text into semantic chunks respecting paragraph boundaries.
 *
 * @param text - Raw document text
 * @param opts - Chunking options
 * @returns Array of text chunks
 */
export function chunkText(text: string, opts?: ChunkingOptions): string[] {
  const targetTokens = opts?.targetTokens ?? 800;
  const overlapTokens = opts?.overlapTokens ?? 128;

  // Split on paragraph boundaries (double newline or multiple newlines).
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  // Estimate tokens per paragraph using word_count * 1.3.
  // This is a rough heuristic; for precise token counting, use tiktoken.
  const estimateTokens = (str: string): number => {
    const wordCount = str.split(/\s+/).length;
    return Math.ceil(wordCount * 1.3);
  };

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If adding this paragraph would exceed target, flush current chunk.
    if (currentTokens + paragraphTokens > targetTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n\n"));

      // Build overlap: take the last ~overlapTokens worth of paragraphs.
      // This preserves context across chunk boundaries.
      let overlapChunk: string[] = [];
      let overlapTokensCount = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const tokens = estimateTokens(currentChunk[i]);
        if (overlapTokensCount + tokens <= overlapTokens) {
          overlapChunk.unshift(currentChunk[i]);
          overlapTokensCount += tokens;
        } else {
          break;
        }
      }
      currentChunk = overlapChunk;
      currentTokens = overlapTokensCount;
    }

    currentChunk.push(paragraph);
    currentTokens += paragraphTokens;
  }

  // Flush any remaining chunk.
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }

  return chunks;
}
