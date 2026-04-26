import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCriterionJson,
  computeScoreTotals,
  deriveStatus,
  LOW_CONFIDENCE_THRESHOLD,
  type ScoredCriterion,
} from "../src/lib/scoring/scoring-math.ts";

// ---------- parseCriterionJson ----------

test("parseCriterionJson: parses a well-formed payload", () => {
  const out = parseCriterionJson(
    JSON.stringify({
      score: 2,
      confidence: 0.9,
      explanation: "good greeting",
      evidence: "Hi! How can I help?",
    }),
  );
  assert.equal(out.score, 2);
  assert.equal(out.confidence, 0.9);
  assert.equal(out.explanation, "good greeting");
  assert.equal(out.evidence, "Hi! How can I help?");
});

test("parseCriterionJson: clamps invalid score to 0", () => {
  const out = parseCriterionJson(
    JSON.stringify({ score: 5, confidence: 0.5, explanation: "x", evidence: "y" }),
  );
  assert.equal(out.score, 0);
});

test("parseCriterionJson: clamps confidence above 1 to 1", () => {
  const out = parseCriterionJson(
    JSON.stringify({ score: 1, confidence: 1.7, explanation: "", evidence: "" }),
  );
  assert.equal(out.confidence, 1);
});

test("parseCriterionJson: clamps negative confidence to 0", () => {
  const out = parseCriterionJson(
    JSON.stringify({ score: 1, confidence: -0.5, explanation: "", evidence: "" }),
  );
  assert.equal(out.confidence, 0);
});

test("parseCriterionJson: defaults missing strings to empty string", () => {
  const out = parseCriterionJson(JSON.stringify({ score: 1, confidence: 0.5 }));
  assert.equal(out.explanation, "");
  assert.equal(out.evidence, "");
});

test("parseCriterionJson: throws on invalid JSON", () => {
  assert.throws(() => parseCriterionJson("not json"), /valid JSON/);
});

test("parseCriterionJson: arrays treated as objects (no .score field) -> defaults", () => {
  const out = parseCriterionJson("[1,2,3]");
  assert.equal(out.score, 0);
  assert.equal(out.confidence, 0);
  assert.equal(out.explanation, "");
  assert.equal(out.evidence, "");
});

test("parseCriterionJson: throws on null", () => {
  assert.throws(() => parseCriterionJson("null"), /non-object/);
});

// ---------- computeScoreTotals ----------

const mkCrit = (
  score: 0 | 1 | 2,
  confidence: number,
  weight: number,
  critical = false,
): ScoredCriterion => ({
  weight,
  critical_fail_boolean: critical,
  result: { score, confidence, explanation: "", evidence: "" },
});

test("computeScoreTotals: all 2s on equal weights = 100", () => {
  const out = computeScoreTotals([
    mkCrit(2, 1, 25),
    mkCrit(2, 1, 25),
    mkCrit(2, 1, 25),
    mkCrit(2, 1, 25),
  ]);
  assert.equal(out.totalScore, 100);
  assert.equal(out.overallConfidence, 1);
  assert.equal(out.criticalFail, false);
});

test("computeScoreTotals: all 0s = 0", () => {
  const out = computeScoreTotals([mkCrit(0, 1, 50), mkCrit(0, 1, 50)]);
  assert.equal(out.totalScore, 0);
});

test("computeScoreTotals: all 1s on equal weights = 50", () => {
  const out = computeScoreTotals([
    mkCrit(1, 1, 25),
    mkCrit(1, 1, 25),
    mkCrit(1, 1, 25),
    mkCrit(1, 1, 25),
  ]);
  assert.equal(out.totalScore, 50);
});

test("computeScoreTotals: weighted average reflects unequal weights", () => {
  const out = computeScoreTotals([mkCrit(2, 1, 80), mkCrit(0, 1, 20)]);
  assert.equal(out.totalScore, 80);
});

test("computeScoreTotals: confidence is weight-weighted average", () => {
  // 0.4 * 75 + 1.0 * 25 = 55, /100 = 0.55
  const out = computeScoreTotals([mkCrit(2, 0.4, 75), mkCrit(2, 1.0, 25)]);
  assert.ok(Math.abs(out.overallConfidence - 0.55) < 1e-9);
});

test("computeScoreTotals: critical fail flag set when critical criterion gets 0", () => {
  const out = computeScoreTotals([
    mkCrit(2, 1, 50),
    mkCrit(0, 1, 50, true),
  ]);
  assert.equal(out.criticalFail, true);
});

test("computeScoreTotals: critical criterion scoring 1 does NOT trigger critical fail", () => {
  const out = computeScoreTotals([mkCrit(1, 1, 50, true), mkCrit(2, 1, 50)]);
  assert.equal(out.criticalFail, false);
});

test("computeScoreTotals: empty list returns zeros without dividing by zero", () => {
  const out = computeScoreTotals([]);
  assert.equal(out.totalScore, 0);
  assert.equal(out.overallConfidence, 0);
  assert.equal(out.criticalFail, false);
});

// ---------- deriveStatus ----------

test("deriveStatus: critical fail wins over confidence", () => {
  assert.equal(deriveStatus(true, 1.0), "critical_fail");
  assert.equal(deriveStatus(true, 0.0), "critical_fail");
});

test("deriveStatus: low confidence -> needs_review", () => {
  assert.equal(deriveStatus(false, LOW_CONFIDENCE_THRESHOLD - 0.01), "needs_review");
  assert.equal(deriveStatus(false, 0), "needs_review");
});

test("deriveStatus: at-or-above confidence threshold -> final", () => {
  assert.equal(deriveStatus(false, LOW_CONFIDENCE_THRESHOLD), "final");
  assert.equal(deriveStatus(false, 1.0), "final");
});
