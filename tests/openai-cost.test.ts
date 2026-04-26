import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimateCostMicroInr,
  formatMicroInr,
  formatTokens,
  USD_TO_INR,
} from "../src/lib/billing/openai-cost.ts";

// ---------- estimateCostMicroInr ----------

test("estimateCostMicroInr: zero tokens = zero cost", () => {
  assert.equal(estimateCostMicroInr("gpt-4o-mini", 0, 0), 0);
});

test("estimateCostMicroInr: gpt-4o-mini 1M prompt tokens = $0.15 = ₹12.6", () => {
  // 1_000_000 prompt tokens × $0.15/1M × 84 INR/USD = $0.15 × 84 = ₹12.60
  // = 12_600_000 micro-INR
  const result = estimateCostMicroInr("gpt-4o-mini", 1_000_000, 0);
  assert.equal(result, 12_600_000);
});

test("estimateCostMicroInr: gpt-4o-mini 1M completion tokens = $0.60 = ₹50.4", () => {
  // 1_000_000 completion × $0.60/1M × 84 = ₹50.40 = 50_400_000 micro-INR
  const result = estimateCostMicroInr("gpt-4o-mini", 0, 1_000_000);
  assert.equal(result, 50_400_000);
});

test("estimateCostMicroInr: typical scoring run (~10K prompt, ~1.5K completion)", () => {
  // 10K prompt × $0.15/1M = $0.0015
  // 1.5K completion × $0.60/1M = $0.0009
  // total $0.0024 × 84 = ₹0.2016 = ~201_600 micro-INR
  const result = estimateCostMicroInr("gpt-4o-mini", 10_000, 1_500);
  assert.ok(result > 0 && result < 1_000_000, `got ${result}`);
  // Sanity: should round to ~₹0.20
  assert.ok(Math.abs(result - 201_600) < 50_000);
});

test("estimateCostMicroInr: unknown model falls back to default pricing", () => {
  const known = estimateCostMicroInr("gpt-4o-mini", 1_000_000, 0);
  const unknown = estimateCostMicroInr("definitely-not-a-real-model", 1_000_000, 0);
  assert.equal(known, unknown);
});

test("estimateCostMicroInr: gpt-4o is more expensive than gpt-4o-mini", () => {
  const cheap = estimateCostMicroInr("gpt-4o-mini", 100_000, 100_000);
  const pricey = estimateCostMicroInr("gpt-4o", 100_000, 100_000);
  assert.ok(pricey > cheap * 5, `expected gpt-4o to be at least 5× pricier than mini`);
});

// ---------- formatMicroInr ----------

test("formatMicroInr: very small amounts show '<₹0.01'", () => {
  assert.equal(formatMicroInr(5_000), "<₹0.01"); // ₹0.005
});

test("formatMicroInr: sub-rupee amounts use 2 decimals", () => {
  assert.equal(formatMicroInr(250_000), "₹0.25");
  assert.equal(formatMicroInr(990_000), "₹0.99");
});

test("formatMicroInr: rupee amounts use Indian grouping", () => {
  assert.equal(formatMicroInr(1_000_000), "₹1");
  assert.equal(formatMicroInr(50_400_000), "₹50.4");
  assert.equal(formatMicroInr(100_000_000_000), "₹1,00,000");
});

// ---------- formatTokens ----------

test("formatTokens: small number unchanged", () => {
  assert.equal(formatTokens(42), "42");
});

test("formatTokens: thousands grouped en-IN style", () => {
  assert.equal(formatTokens(1_234), "1,234");
  assert.equal(formatTokens(100_000), "1,00,000");
});

// ---------- USD_TO_INR sanity ----------

test("USD_TO_INR is in a plausible range (60..120)", () => {
  assert.ok(USD_TO_INR >= 60 && USD_TO_INR <= 120, `got ${USD_TO_INR}`);
});
