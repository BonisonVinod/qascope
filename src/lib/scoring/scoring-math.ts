import type { ScoreStatus } from "@/lib/database.types";

export type SourceCitation = {
  document_id: string;
  document_title: string;
  chunk_id: string;
};

export type CriterionScore = {
  score: 0 | 1 | 2;
  confidence: number;
  explanation: string;
  evidence: string;
  sources_used?: SourceCitation[];
};

export type ScoredCriterion = {
  weight: number;
  critical_fail_boolean: boolean;
  result: CriterionScore;
};

export type ScoreTotals = {
  totalScore: number; // 0-100
  overallConfidence: number; // 0-1
  criticalFail: boolean;
};

export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Pure-JSON parser for the model's per-criterion response. Throws on
 * non-JSON or non-object payloads. Out-of-range scores get clamped to 0;
 * out-of-range confidence gets clamped to [0, 1].
 */
export function parseCriterionJson(raw: string): CriterionScore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model returned non-object JSON.");
  }
  const p = parsed as Record<string, unknown>;

  const scoreNum = Number(p.score);
  const score: 0 | 1 | 2 =
    scoreNum === 0 || scoreNum === 1 || scoreNum === 2 ? (scoreNum as 0 | 1 | 2) : 0;

  const confNum = Number(p.confidence);
  const confidence = Number.isFinite(confNum)
    ? Math.max(0, Math.min(1, confNum))
    : 0;

  const explanation = typeof p.explanation === "string" ? p.explanation : "";
  const evidence = typeof p.evidence === "string" ? p.evidence : "";

  // Parse sources_used if present
  const sources_used = Array.isArray(p.sources_used)
    ? (p.sources_used as SourceCitation[])
    : undefined;

  return { score, confidence, explanation, evidence, sources_used };
}

/**
 * Compute weighted total (0-100), overall confidence (0-1) and critical-fail
 * flag from a set of scored criteria. Pure function — easy to test.
 *
 * Each criterion contributes (score/2) * weight points. Total possible is
 * the sum of weights. We normalise to a 0-100 scale.
 *
 * Confidence is a weight-weighted average across criteria.
 *
 * criticalFail = ANY critical criterion received a 0.
 */
export function computeScoreTotals(scored: ScoredCriterion[]): ScoreTotals {
  let totalWeight = 0;
  let earnedPoints = 0;
  let confSum = 0;
  let confWeight = 0;
  let criticalFail = false;

  for (const r of scored) {
    totalWeight += r.weight;
    earnedPoints += (r.result.score / 2) * r.weight;
    confSum += r.result.confidence * r.weight;
    confWeight += r.weight;
    if (r.critical_fail_boolean && r.result.score === 0) {
      criticalFail = true;
    }
  }

  return {
    totalScore: totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0,
    overallConfidence: confWeight > 0 ? confSum / confWeight : 0,
    criticalFail,
  };
}

/**
 * Map (criticalFail, confidence) to the canonical ScoreStatus.
 *   - Any critical fail wins.
 *   - Below confidence threshold -> needs_review.
 *   - Otherwise final.
 *
 * The threshold is workspace-configurable (clients.review_confidence_threshold).
 * Pass the workspace value as fraction 0-1; falls back to LOW_CONFIDENCE_THRESHOLD.
 */
export function deriveStatus(
  criticalFail: boolean,
  overallConfidence: number,
  threshold: number = LOW_CONFIDENCE_THRESHOLD,
): ScoreStatus {
  if (criticalFail) return "critical_fail";
  if (overallConfidence < threshold) return "needs_review";
  return "final";
}
