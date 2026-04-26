import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlaDeadline, isExpired, formatTimeLeft } from "../src/lib/scoring/sla.ts";

const NOW = new Date("2026-04-25T12:00:00.000Z");

test("computeSlaDeadline: 24h from a fixed clock", () => {
  const out = computeSlaDeadline(24, NOW);
  assert.equal(out.toISOString(), "2026-04-26T12:00:00.000Z");
});

test("computeSlaDeadline: 48h from a fixed clock", () => {
  const out = computeSlaDeadline(48, NOW);
  assert.equal(out.toISOString(), "2026-04-27T12:00:00.000Z");
});

test("computeSlaDeadline: half-hour", () => {
  const out = computeSlaDeadline(0.5, NOW);
  assert.equal(out.toISOString(), "2026-04-25T12:30:00.000Z");
});

test("computeSlaDeadline: throws on zero", () => {
  assert.throws(() => computeSlaDeadline(0, NOW), /Invalid slaHours/);
});

test("computeSlaDeadline: throws on negative", () => {
  assert.throws(() => computeSlaDeadline(-1, NOW), /Invalid slaHours/);
});

test("computeSlaDeadline: throws on NaN", () => {
  assert.throws(() => computeSlaDeadline(NaN, NOW), /Invalid slaHours/);
});

test("isExpired: true when deadline is in the past", () => {
  const past = new Date(NOW.getTime() - 1000);
  assert.equal(isExpired(past, NOW), true);
});

test("isExpired: true at exact deadline (inclusive)", () => {
  assert.equal(isExpired(NOW, NOW), true);
});

test("isExpired: false when deadline is in the future", () => {
  const future = new Date(NOW.getTime() + 1000);
  assert.equal(isExpired(future, NOW), false);
});

test("formatTimeLeft: 'overdue' once expired", () => {
  const past = new Date(NOW.getTime() - 60_000);
  assert.equal(formatTimeLeft(past, NOW), "overdue");
});

test("formatTimeLeft: minutes when <1h left", () => {
  const in30m = new Date(NOW.getTime() + 30 * 60_000);
  assert.equal(formatTimeLeft(in30m, NOW), "30m left");
});

test("formatTimeLeft: hours.tenths when <24h", () => {
  const in5h30m = new Date(NOW.getTime() + 5.5 * 3600_000);
  assert.equal(formatTimeLeft(in5h30m, NOW), "5.5h left");
});

test("formatTimeLeft: days+hours when >24h", () => {
  const in2d3h = new Date(NOW.getTime() + (2 * 24 + 3) * 3600_000);
  assert.equal(formatTimeLeft(in2d3h, NOW), "2d 3h left");
});

test("formatTimeLeft: integration with computeSlaDeadline", () => {
  const deadline = computeSlaDeadline(48, NOW);
  // immediately after creation, almost-full 48h left -> "2d 0h left"
  assert.equal(formatTimeLeft(deadline, NOW), "2d 0h left");
});
