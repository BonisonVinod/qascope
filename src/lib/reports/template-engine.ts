import type { ScoreStatus, ChannelType } from "@/lib/database.types";

/**
 * The shape of a saved report template's config. Persisted as JSONB in the
 * report_templates.config column. Pure data — no functions, no derived state.
 */
export type TimeWindow =
  | "last_7_days"
  | "last_30_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom_days";

export type GroupBy = "agent" | "team" | "channel" | "none";

export type Column =
  | "volume"
  | "avg_score"
  | "fail_rate"
  | "appealed_count"
  | "ai_vs_final_delta";

export type ReportTemplateConfig = {
  timeWindow: TimeWindow;
  /** Required when timeWindow === "custom_days". 1..365. */
  customDays?: number;
  groupBy: GroupBy;
  filters: {
    /** Empty / undefined = all statuses. */
    status?: ScoreStatus[];
    /** Inclusive 0..100. */
    minScore?: number;
    /** Inclusive 0..100. */
    maxScore?: number;
    /** Optional team_name filter (exact match). */
    team?: string;
    /** Optional channel filter. */
    channel?: ChannelType;
  };
  /** Columns to include, in order. */
  columns: Column[];
  /** Sort by one of the visible columns. */
  sortBy?: { column: Column | "label"; direction: "asc" | "desc" };
  /** Hard cap on rows returned (default 100). */
  rowLimit?: number;
};

/** Default config used when creating a new template. */
export const DEFAULT_TEMPLATE_CONFIG: ReportTemplateConfig = {
  timeWindow: "last_7_days",
  groupBy: "agent",
  filters: {},
  columns: ["volume", "avg_score", "fail_rate", "appealed_count"],
  sortBy: { column: "avg_score", direction: "asc" },
  rowLimit: 50,
};

/**
 * Validate / clamp a config. Throws on hard errors (unknown groupBy etc.);
 * silently clamps numeric ranges. Always returns a config the engine can run.
 */
export function normalizeConfig(input: unknown): ReportTemplateConfig {
  if (!input || typeof input !== "object") {
    throw new Error("Template config must be an object.");
  }
  const c = input as Record<string, unknown>;

  const validWindows: TimeWindow[] = [
    "last_7_days",
    "last_30_days",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
    "custom_days",
  ];
  const timeWindow = validWindows.includes(c.timeWindow as TimeWindow)
    ? (c.timeWindow as TimeWindow)
    : "last_7_days";

  const customDaysRaw = Number(c.customDays);
  const customDays =
    timeWindow === "custom_days" && Number.isFinite(customDaysRaw)
      ? Math.max(1, Math.min(365, Math.round(customDaysRaw)))
      : undefined;

  const validGroupBys: GroupBy[] = ["agent", "team", "channel", "none"];
  const groupBy = validGroupBys.includes(c.groupBy as GroupBy)
    ? (c.groupBy as GroupBy)
    : "agent";

  const filtersIn =
    typeof c.filters === "object" && c.filters !== null
      ? (c.filters as Record<string, unknown>)
      : {};
  const validStatuses: ScoreStatus[] = [
    "final",
    "needs_review",
    "critical_fail",
  ];
  const status = Array.isArray(filtersIn.status)
    ? (filtersIn.status as unknown[]).filter((s): s is ScoreStatus =>
        validStatuses.includes(s as ScoreStatus),
      )
    : undefined;
  const minScore = Number.isFinite(Number(filtersIn.minScore))
    ? Math.max(0, Math.min(100, Number(filtersIn.minScore)))
    : undefined;
  const maxScore = Number.isFinite(Number(filtersIn.maxScore))
    ? Math.max(0, Math.min(100, Number(filtersIn.maxScore)))
    : undefined;
  const team =
    typeof filtersIn.team === "string" && filtersIn.team.trim().length > 0
      ? String(filtersIn.team).trim()
      : undefined;
  const validChannels: ChannelType[] = ["voice_transcript", "email", "chat"];
  const channel = validChannels.includes(filtersIn.channel as ChannelType)
    ? (filtersIn.channel as ChannelType)
    : undefined;

  const validColumns: Column[] = [
    "volume",
    "avg_score",
    "fail_rate",
    "appealed_count",
    "ai_vs_final_delta",
  ];
  const columnsIn = Array.isArray(c.columns) ? (c.columns as unknown[]) : [];
  const columns = columnsIn
    .filter((col): col is Column => validColumns.includes(col as Column))
    .slice(0, validColumns.length);
  const finalColumns = columns.length > 0 ? columns : DEFAULT_TEMPLATE_CONFIG.columns;

  let sortBy: ReportTemplateConfig["sortBy"];
  if (c.sortBy && typeof c.sortBy === "object") {
    const sb = c.sortBy as Record<string, unknown>;
    const dir = sb.direction === "asc" ? "asc" : "desc";
    const col = sb.column;
    if (typeof col === "string" && (col === "label" || validColumns.includes(col as Column))) {
      sortBy = { column: col as Column | "label", direction: dir };
    }
  }

  const rowLimitRaw = Number(c.rowLimit);
  const rowLimit = Number.isFinite(rowLimitRaw)
    ? Math.max(1, Math.min(500, Math.round(rowLimitRaw)))
    : 100;

  return {
    timeWindow,
    customDays,
    groupBy,
    filters: { status, minScore, maxScore, team, channel },
    columns: finalColumns,
    sortBy,
    rowLimit,
  };
}

/**
 * Resolve a TimeWindow into a [start, end) range relative to `now`. End is
 * exclusive. Pure function so tests can pin the clock.
 */
export function timeWindowToRange(
  config: ReportTemplateConfig,
  now: Date = new Date(),
): { start: Date; end: Date; label: string } {
  const utc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfTodayUtc = utc;
  const startOfTomorrowUtc = new Date(utc.getTime() + 86400 * 1000);

  switch (config.timeWindow) {
    case "last_7_days": {
      const start = new Date(startOfTomorrowUtc.getTime() - 7 * 86400 * 1000);
      return { start, end: startOfTomorrowUtc, label: "Last 7 days" };
    }
    case "last_30_days": {
      const start = new Date(startOfTomorrowUtc.getTime() - 30 * 86400 * 1000);
      return { start, end: startOfTomorrowUtc, label: "Last 30 days" };
    }
    case "this_week": {
      const day = utc.getUTCDay() || 7;
      const start = new Date(utc);
      start.setUTCDate(utc.getUTCDate() - day + 1);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      return { start, end, label: "This week (Mon–Sun)" };
    }
    case "last_week": {
      const day = utc.getUTCDay() || 7;
      const thisMon = new Date(utc);
      thisMon.setUTCDate(utc.getUTCDate() - day + 1);
      const start = new Date(thisMon);
      start.setUTCDate(thisMon.getUTCDate() - 7);
      const end = thisMon;
      return { start, end, label: "Last week" };
    }
    case "this_month": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      return { start, end, label: "This month" };
    }
    case "last_month": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      return { start, end, label: "Last month" };
    }
    case "custom_days": {
      const days = Math.max(1, Math.min(365, config.customDays ?? 30));
      const start = new Date(startOfTomorrowUtc.getTime() - days * 86400 * 1000);
      return { start, end: startOfTomorrowUtc, label: `Last ${days} days` };
    }
  }
  // exhaustiveness fallback
  const start = new Date(startOfTodayUtc.getTime() - 7 * 86400 * 1000);
  return { start, end: startOfTomorrowUtc, label: "Last 7 days" };
}

/**
 * Aggregate scored conversations into rows according to the template config.
 * Pure: takes already-fetched data, returns the table rows. The caller is
 * responsible for the SELECT (which is just "score rows in [start,end) for
 * client_id" — every filter beyond date/client is applied here in JS).
 */
export type ScoreInput = {
  total_score: number;
  original_total_score: number | null;
  status: ScoreStatus;
  appealed_at: string | null;
  agent_id: string | null;
  channel: ChannelType;
  team_name: string | null;
  agent_name: string | null;
};

export type ReportRow = {
  /** Group label (agent name, team, channel, or "All" for groupBy=none). */
  label: string;
  /** Rendered cells, keyed by column name. Stringified numbers preserved as numbers for charting later. */
  cells: Record<Column, number>;
};

export function aggregate(
  config: ReportTemplateConfig,
  rows: ScoreInput[],
): ReportRow[] {
  // Apply post-fetch filters that aren't expressible in the SELECT.
  const filtered = rows.filter((r) => {
    const f = config.filters;
    if (f.status && f.status.length > 0 && !f.status.includes(r.status)) return false;
    if (f.minScore !== undefined && r.total_score < f.minScore) return false;
    if (f.maxScore !== undefined && r.total_score > f.maxScore) return false;
    if (f.team !== undefined && (r.team_name ?? "") !== f.team) return false;
    if (f.channel !== undefined && r.channel !== f.channel) return false;
    return true;
  });

  // Group key fn
  const keyOf = (r: ScoreInput): string => {
    switch (config.groupBy) {
      case "agent":
        return r.agent_name ?? "(unknown agent)";
      case "team":
        return r.team_name ?? "(unassigned)";
      case "channel":
        return r.channel;
      case "none":
        return "All conversations";
    }
  };

  type Bucket = {
    label: string;
    n: number;
    sum: number;
    fails: number;
    appealed: number;
    deltaSum: number;
    deltaCount: number;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of filtered) {
    const key = keyOf(r);
    const b = buckets.get(key) ?? {
      label: key,
      n: 0,
      sum: 0,
      fails: 0,
      appealed: 0,
      deltaSum: 0,
      deltaCount: 0,
    };
    b.n += 1;
    b.sum += r.total_score;
    if (r.status === "critical_fail") b.fails += 1;
    if (r.appealed_at) b.appealed += 1;
    if (r.original_total_score !== null) {
      b.deltaSum += r.total_score - r.original_total_score;
      b.deltaCount += 1;
    }
    buckets.set(key, b);
  }

  const all: ReportRow[] = [...buckets.values()].map((b) => ({
    label: b.label,
    cells: {
      volume: b.n,
      avg_score: b.n > 0 ? round1(b.sum / b.n) : 0,
      fail_rate: b.n > 0 ? round1((b.fails / b.n) * 100) : 0,
      appealed_count: b.appealed,
      ai_vs_final_delta:
        b.deltaCount > 0 ? round2(b.deltaSum / b.deltaCount) : 0,
    },
  }));

  // Sort
  const sortBy = config.sortBy;
  if (sortBy) {
    const dir = sortBy.direction === "asc" ? 1 : -1;
    all.sort((a, b) => {
      if (sortBy.column === "label") {
        return a.label.localeCompare(b.label) * dir;
      }
      return (a.cells[sortBy.column] - b.cells[sortBy.column]) * dir;
    });
  } else {
    all.sort((a, b) => b.cells.volume - a.cells.volume); // default: largest first
  }

  return all.slice(0, config.rowLimit ?? 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human-readable column label. */
export function columnLabel(c: Column): string {
  switch (c) {
    case "volume":
      return "Volume";
    case "avg_score":
      return "Avg score";
    case "fail_rate":
      return "Fail rate";
    case "appealed_count":
      return "Appealed";
    case "ai_vs_final_delta":
      return "AI→Final Δ";
  }
}

/** Human-readable group-by label. */
export function groupByLabel(g: GroupBy): string {
  switch (g) {
    case "agent":
      return "Agent";
    case "team":
      return "Team";
    case "channel":
      return "Channel";
    case "none":
      return "Overall";
  }
}
