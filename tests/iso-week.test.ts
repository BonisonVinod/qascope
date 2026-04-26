import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeekRange } from "../src/lib/reports/iso-week.ts";

test("isoWeekRange: Monday reference returns same Monday as start", () => {
  // 2026-04-20 is a Monday
  const ref = new Date("2026-04-20T15:30:00.000Z");
  const out = isoWeekRange(ref, ref);
  assert.equal(out.start.toISOString(), "2026-04-20T00:00:00.000Z");
  assert.equal(out.end.toISOString(), "2026-04-27T00:00:00.000Z");
  assert.equal(out.isCurrent, true);
});

test("isoWeekRange: Sunday reference rolls back to previous Monday", () => {
  // 2026-04-26 is a Sunday
  const ref = new Date("2026-04-26T22:00:00.000Z");
  const out = isoWeekRange(ref, ref);
  assert.equal(out.start.toISOString(), "2026-04-20T00:00:00.000Z");
  assert.equal(out.end.toISOString(), "2026-04-27T00:00:00.000Z");
});

test("isoWeekRange: midweek reference gets correct week", () => {
  // 2026-04-23 is a Thursday
  const ref = new Date("2026-04-23T08:00:00.000Z");
  const out = isoWeekRange(ref, ref);
  assert.equal(out.start.toISOString(), "2026-04-20T00:00:00.000Z");
  assert.equal(out.end.toISOString(), "2026-04-27T00:00:00.000Z");
});

test("isoWeekRange: end is exclusive (next Monday)", () => {
  const ref = new Date("2026-04-20T00:00:00.000Z");
  const out = isoWeekRange(ref, ref);
  // 7 days later
  assert.equal(out.end.getTime() - out.start.getTime(), 7 * 24 * 3600 * 1000);
});

test("isoWeekRange: isCurrent is false when today is in a different week", () => {
  const ref = new Date("2026-04-20T00:00:00.000Z");
  const today = new Date("2026-04-30T00:00:00.000Z"); // next week
  const out = isoWeekRange(ref, today);
  assert.equal(out.isCurrent, false);
});

test("isoWeekRange: isCurrent is true when today equals start", () => {
  const ref = new Date("2026-04-23T00:00:00.000Z");
  const today = new Date("2026-04-20T00:00:00.000Z"); // Monday of that week
  const out = isoWeekRange(ref, today);
  assert.equal(out.isCurrent, true);
});

test("isoWeekRange: isCurrent is false at exact end (Monday 00:00 of next week)", () => {
  const ref = new Date("2026-04-23T00:00:00.000Z");
  const today = new Date("2026-04-27T00:00:00.000Z"); // exactly the exclusive end
  const out = isoWeekRange(ref, today);
  assert.equal(out.isCurrent, false);
});

test("isoWeekRange: handles year boundary", () => {
  // 2026-01-01 was a Thursday; ISO week starts 2025-12-29 (Monday)
  const ref = new Date("2026-01-01T12:00:00.000Z");
  const out = isoWeekRange(ref, ref);
  assert.equal(out.start.toISOString(), "2025-12-29T00:00:00.000Z");
  assert.equal(out.end.toISOString(), "2026-01-05T00:00:00.000Z");
});

test("isoWeekRange: label is human-readable", () => {
  const ref = new Date("2026-04-23T00:00:00.000Z");
  const out = isoWeekRange(ref, ref);
  // label format is "Apr 20, 2026 – Apr 26, 2026" (en-dash)
  assert.match(out.label, /Apr 20, 2026.*Apr 26, 2026/);
});
