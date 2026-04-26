import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeConfig,
  timeWindowToRange,
  aggregate,
  DEFAULT_TEMPLATE_CONFIG,
  type ReportTemplateConfig,
  type ScoreInput,
} from "../src/lib/reports/template-engine.ts";

// ---------- normalizeConfig ----------

test("normalizeConfig: throws on non-object input", () => {
  assert.throws(() => normalizeConfig(null), /must be an object/);
  assert.throws(() => normalizeConfig("foo"), /must be an object/);
});

test("normalizeConfig: defaults bad timeWindow to last_7_days", () => {
  const c = normalizeConfig({ timeWindow: "yesterday" });
  assert.equal(c.timeWindow, "last_7_days");
});

test("normalizeConfig: clamps customDays to 1..365", () => {
  const c = normalizeConfig({ timeWindow: "custom_days", customDays: 9999 });
  assert.equal(c.customDays, 365);
  const c2 = normalizeConfig({ timeWindow: "custom_days", customDays: -5 });
  assert.equal(c2.customDays, 1);
});

test("normalizeConfig: filters out unknown columns and statuses", () => {
  const c = normalizeConfig({
    columns: ["volume", "BOGUS", "fail_rate"],
    filters: { status: ["final", "garbage", "critical_fail"] },
  });
  assert.deepEqual(c.columns, ["volume", "fail_rate"]);
  assert.deepEqual(c.filters.status, ["final", "critical_fail"]);
});

test("normalizeConfig: empty columns falls back to defaults", () => {
  const c = normalizeConfig({ columns: [] });
  assert.deepEqual(c.columns, DEFAULT_TEMPLATE_CONFIG.columns);
});

test("normalizeConfig: clamps minScore/maxScore to 0..100", () => {
  const c = normalizeConfig({ filters: { minScore: -10, maxScore: 250 } });
  assert.equal(c.filters.minScore, 0);
  assert.equal(c.filters.maxScore, 100);
});

// ---------- timeWindowToRange ----------

const NOW = new Date("2026-04-25T12:00:00.000Z"); // Saturday

test("timeWindowToRange: last_7_days from a Saturday", () => {
  const cfg: ReportTemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG, timeWindow: "last_7_days" };
  const r = timeWindowToRange(cfg, NOW);
  // end = midnight tomorrow UTC = 2026-04-26T00:00Z
  assert.equal(r.end.toISOString(), "2026-04-26T00:00:00.000Z");
  assert.equal(r.start.toISOString(), "2026-04-19T00:00:00.000Z");
});

test("timeWindowToRange: last_30_days from a Saturday", () => {
  const cfg: ReportTemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG, timeWindow: "last_30_days" };
  const r = timeWindowToRange(cfg, NOW);
  assert.equal(r.end.toISOString(), "2026-04-26T00:00:00.000Z");
  assert.equal(r.start.toISOString(), "2026-03-27T00:00:00.000Z");
});

test("timeWindowToRange: this_week (Mon-Sun) covers Apr 20..26", () => {
  const cfg: ReportTemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG, timeWindow: "this_week" };
  const r = timeWindowToRange(cfg, NOW);
  assert.equal(r.start.toISOString(), "2026-04-20T00:00:00.000Z");
  assert.equal(r.end.toISOString(), "2026-04-27T00:00:00.000Z");
});

test("timeWindowToRange: last_week is the week before this_week", () => {
  const cfg: ReportTemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG, timeWindow: "last_week" };
  const r = timeWindowToRange(cfg, NOW);
  assert.equal(r.start.toISOString(), "2026-04-13T00:00:00.000Z");
  assert.equal(r.end.toISOString(), "2026-04-20T00:00:00.000Z");
});

test("timeWindowToRange: this_month is the calendar month containing now", () => {
  const cfg: ReportTemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG, timeWindow: "this_month" };
  const r = timeWindowToRange(cfg, NOW);
  assert.equal(r.start.toISOString(), "2026-04-01T00:00:00.000Z");
  assert.equal(r.end.toISOString(), "2026-05-01T00:00:00.000Z");
});

test("timeWindowToRange: custom_days respects customDays", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    timeWindow: "custom_days",
    customDays: 14,
  };
  const r = timeWindowToRange(cfg, NOW);
  assert.equal(r.end.toISOString(), "2026-04-26T00:00:00.000Z");
  assert.equal(r.start.toISOString(), "2026-04-12T00:00:00.000Z");
});

// ---------- aggregate ----------

const mkScore = (
  partial: Partial<ScoreInput> & { total_score: number },
): ScoreInput => ({
  original_total_score: partial.total_score,
  status: "final",
  appealed_at: null,
  agent_id: "agent-1",
  channel: "voice_transcript",
  team_name: "Mumbai-Tier2",
  agent_name: "Ananya Reddy",
  ...partial,
});

test("aggregate: groupBy=agent produces one row per agent_name", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "agent",
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 90, agent_name: "A" }),
    mkScore({ total_score: 80, agent_name: "A" }),
    mkScore({ total_score: 70, agent_name: "B" }),
  ]);
  assert.equal(rows.length, 2);
  const a = rows.find((r) => r.label === "A")!;
  assert.equal(a.cells.volume, 2);
  assert.equal(a.cells.avg_score, 85);
  const b = rows.find((r) => r.label === "B")!;
  assert.equal(b.cells.volume, 1);
  assert.equal(b.cells.avg_score, 70);
});

test("aggregate: groupBy=none collapses everything into 'All conversations'", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "none",
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 100 }),
    mkScore({ total_score: 0, agent_name: "B" }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "All conversations");
  assert.equal(rows[0].cells.volume, 2);
  assert.equal(rows[0].cells.avg_score, 50);
});

test("aggregate: filter status=critical_fail excludes finals", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "team",
    filters: { status: ["critical_fail"] },
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 100, status: "final", team_name: "X" }),
    mkScore({ total_score: 20, status: "critical_fail", team_name: "X" }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.volume, 1);
  assert.equal(rows[0].cells.fail_rate, 100);
});

test("aggregate: minScore filter keeps only rows >= threshold", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "none",
    filters: { minScore: 70 },
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 50 }),
    mkScore({ total_score: 80 }),
    mkScore({ total_score: 95 }),
  ]);
  assert.equal(rows[0].cells.volume, 2);
});

test("aggregate: appealed_count counts rows with appealed_at set", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "none",
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 80, appealed_at: "2026-04-25T00:00:00Z" }),
    mkScore({ total_score: 90, appealed_at: null }),
    mkScore({ total_score: 60, appealed_at: "2026-04-25T00:00:00Z" }),
  ]);
  assert.equal(rows[0].cells.appealed_count, 2);
});

test("aggregate: ai_vs_final_delta is the average of (final - original)", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "none",
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 90, original_total_score: 70 }), // +20
    mkScore({ total_score: 80, original_total_score: 80 }), //  0
    mkScore({ total_score: 50, original_total_score: 60 }), // -10
  ]);
  // mean = (20 + 0 - 10) / 3 = 3.33
  assert.equal(rows[0].cells.ai_vs_final_delta, 3.33);
});

test("aggregate: sortBy avg_score asc puts worst first", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "agent",
    sortBy: { column: "avg_score", direction: "asc" },
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 90, agent_name: "Top" }),
    mkScore({ total_score: 50, agent_name: "Bottom" }),
    mkScore({ total_score: 70, agent_name: "Middle" }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.label),
    ["Bottom", "Middle", "Top"],
  );
});

test("aggregate: rowLimit caps the row count", () => {
  const cfg: ReportTemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    groupBy: "agent",
    rowLimit: 2,
  };
  const rows = aggregate(cfg, [
    mkScore({ total_score: 90, agent_name: "A" }),
    mkScore({ total_score: 80, agent_name: "B" }),
    mkScore({ total_score: 70, agent_name: "C" }),
  ]);
  assert.equal(rows.length, 2);
});
