import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPlanLimit } from "../src/lib/billing/limits.ts";

test("checkPlanLimit: well under limit returns ok", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 100,
    incoming: 50,
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.remainingAfter, 350);
});

test("checkPlanLimit: lands exactly on the limit", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 450,
    incoming: 50,
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.remainingAfter, 0);
});

test("checkPlanLimit: already over (used >= limit) blocks before incoming", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 500,
    incoming: 1,
  });
  assert.equal(out.ok, false);
  if (!out.ok) {
    assert.equal(out.reason, "already_over");
    if (out.reason === "already_over") {
      assert.equal(out.used, 500);
      assert.equal(out.limit, 500);
    }
  }
});

test("checkPlanLimit: would-exceed reports overage", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 480,
    incoming: 50,
  });
  assert.equal(out.ok, false);
  if (!out.ok) {
    assert.equal(out.reason, "would_exceed");
    if (out.reason === "would_exceed") {
      assert.equal(out.over, 30);
      assert.equal(out.used, 480);
    }
  }
});

test("checkPlanLimit: zero incoming on a fresh plan", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 0,
    incoming: 0,
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.remainingAfter, 500);
});

test("checkPlanLimit: incoming larger than entire plan from zero usage", () => {
  const out = checkPlanLimit({
    monthlyLimit: 500,
    conversationsThisMonth: 0,
    incoming: 600,
  });
  assert.equal(out.ok, false);
  if (!out.ok && out.reason === "would_exceed") {
    assert.equal(out.over, 100);
  }
});
