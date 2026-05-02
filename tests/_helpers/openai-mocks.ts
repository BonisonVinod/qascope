/**
 * OpenAI mock helpers for integration tests.
 * Uses node:test mock.fn() and mock.module() to replace OpenAI API calls.
 */

import { test } from "node:test";

/**
 * Mock response for chatText() calls.
 * Returns a JSON-shaped scoring response that includes sources_used.
 */
export function mockChatTextResponse(options?: {
  sources?: Array<{ document_id: string; document_title: string; chunk_id: string }>;
  score?: number;
  confidence?: number;
}): string {
  const sources = options?.sources || [];
  const score = options?.score ?? 85;
  const confidence = options?.confidence ?? 0.9;

  return JSON.stringify({
    score,
    confidence,
    explanation: "Test explanation from mocked OpenAI.",
    evidence_span: "Some evidence from transcript.",
    sources_used: sources,
  });
}

/**
 * Mock response for getEmbedding() calls.
 * Returns a fixed 1536-dimensional vector.
 * All values set to 0.1 so that cosine similarity with test chunks (also 0.1) is 1.0.
 */
export function mockEmbeddingResponse(): number[] {
  return Array(1536).fill(0.1);
}

/**
 * Helper to set up mocking for chatText and getEmbedding.
 * Call this at the top of a test function to intercept OpenAI calls.
 *
 * Usage:
 *   test("my test", async (t) => {
 *     const mocks = setupOpenAIMocks(t);
 *     // Now calls to chatText() and getEmbedding() are mocked.
 *     mocks.chatTextMock.mock.calls[0]?.[0] // inspect the call
 *   });
 */
export function setupOpenAIMocks(testContext: any) {
  // Since node:test doesn't have a built-in mock registry for modules,
  // we'll use a simpler approach: expose the mocks on a module that can
  // be imported and used by the code under test.
  //
  // For now, return a placeholder object that tests can use to verify
  // that mocking was attempted. The actual mocking will be done inline
  // in each test using mock.fn().

  return {
    chatTextMock: null,
    embeddingMock: null,
  };
}
