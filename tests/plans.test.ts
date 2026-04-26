import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, PLAN_ORDER, getPlan, formatInr } from "../src/lib/billing/plans.ts";

test("PLAN_ORDER lists pilot, growth, pro in that order", () => {
  assert.deepEqual(PLAN_ORDER, ["pilot", "growth", "pro"]);
});

test("PLANS has expected limits", () => {
  assert.equal(PLANS.pilot.monthlyLimit, 500);
  assert.equal(PLANS.growth.monthlyLimit, 5_000);
  assert.equal(PLANS.pro.monthlyLimit, 25_000);
});

test("PLANS has expected pricing", () => {
  assert.equal(PLANS.pilot.monthlyPriceInr, 0);
  assert.equal(PLANS.growth.monthlyPriceInr, 9_999);
  assert.equal(PLANS.pro.monthlyPriceInr, 24_999);
});

test("getPlan returns the requested plan", () => {
  assert.equal(getPlan("growth").name, "growth");
  assert.equal(getPlan("pro").name, "pro");
});

test("getPlan defaults to pilot when name is null", () => {
  assert.equal(getPlan(null).name, "pilot");
});

test("getPlan defaults to pilot when name is undefined", () => {
  assert.equal(getPlan(undefined).name, "pilot");
});

test("formatInr: zero -> 'Free'", () => {
  assert.equal(formatInr(0), "Free");
});

test("formatInr: small amount", () => {
  // en-IN locale formats "999" without grouping
  assert.equal(formatInr(999), "\u20b9999");
});

test("formatInr: thousands use Indian grouping", () => {
  // 9999 -> "9,999" in en-IN
  assert.equal(formatInr(9_999), "\u20b99,999");
});

test("formatInr: lakhs use Indian grouping", () => {
  // 100000 -> "1,00,000" in en-IN
  assert.equal(formatInr(100_000), "\u20b91,00,000");
});

test("plans all have non-empty feature lists", () => {
  for (const name of PLAN_ORDER) {
    assert.ok(PLANS[name].features.length > 0, `${name} should have features`);
  }
});
