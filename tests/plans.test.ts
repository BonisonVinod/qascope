import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, PLAN_ORDER, getPlan, formatInr } from "../src/lib/billing/plans.ts";

test("PLAN_ORDER lists the 4 tiers in order", () => {
  assert.deepEqual(PLAN_ORDER, ["pilot", "starter", "team", "pro"]);
});

test("PLANS has expected conversation caps", () => {
  assert.equal(PLANS.pilot.monthlyLimit, 500);
  assert.ok(PLANS.starter.monthlyLimit >= 1_000_000, "Starter should be unlimited");
  assert.ok(PLANS.team.monthlyLimit >= 1_000_000);
  assert.ok(PLANS.pro.monthlyLimit >= 1_000_000);
});

test("PLANS has expected pricing", () => {
  assert.equal(PLANS.pilot.pricePerSeatUsd, 0);
  assert.equal(PLANS.starter.pricePerSeatUsd, 1600);
  assert.equal(PLANS.team.pricePerSeatUsd, 1450);
  assert.equal(PLANS.pro.pricePerSeatUsd, 1300);
});

test("PLANS has expected seat counts", () => {
  assert.equal(PLANS.pilot.seatsIncluded, 1);
  assert.equal(PLANS.starter.seatsIncluded, 1);
  assert.equal(PLANS.team.seatsIncluded, 50);
  assert.equal(PLANS.pro.seatsIncluded, 100);
});

test("Pilot is hosted-OpenAI; paid tiers are BYO key", () => {
  assert.equal(PLANS.pilot.byoOpenAiKey, false);
  assert.equal(PLANS.starter.byoOpenAiKey, true);
  assert.equal(PLANS.team.byoOpenAiKey, true);
  assert.equal(PLANS.pro.byoOpenAiKey, true);
});

test("getPlan returns the requested plan", () => {
  assert.equal(getPlan("starter").name, "starter");
  assert.equal(getPlan("pro").name, "pro");
});

test("getPlan defaults to pilot when name is null/undefined", () => {
  assert.equal(getPlan(null).name, "pilot");
  assert.equal(getPlan(undefined).name, "pilot");
});

test("getPlan: legacy 'growth' maps to 'team' for backward compat", () => {
  assert.equal(getPlan("growth").name, "team");
});

test("formatInr: zero -> 'Free'", () => {
  assert.equal(formatInr(0), "Free");
});

test("formatInr: small amount", () => {
  assert.equal(formatInr(999), "₹999");
});

test("formatInr: thousands use Indian grouping", () => {
  assert.equal(formatInr(9_999), "₹9,999");
});

test("formatInr: lakhs use Indian grouping", () => {
  assert.equal(formatInr(100_000), "₹1,00,000");
});

test("plans all have non-empty feature lists", () => {
  for (const name of PLAN_ORDER) {
    assert.ok(PLANS[name].features.length > 0, `${name} should have features`);
  }
});
