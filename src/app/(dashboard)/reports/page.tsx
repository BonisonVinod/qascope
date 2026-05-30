import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";
import { isoWeekRange as computeIsoWeekRange } from "@/lib/reports/iso-week";
import { DateRangePicker } from "../dashboard/date-range-picker";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ week?: string; from?: string; to?: string }>;

/** Parse YYYY-MM-DD; return null if invalid. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Weekly report. Defaults to the current ISO week (Mon..Sun) but accepts
 * ?week=YYYY-MM-DD pointing to any day in the target week.
 *
 * Per the product brief, the report shows:
 *   - Volume and average QA score
 *   - Original vs post-appeal score (appeal correction is the headline KPI)
 *   - Number of cases appealed
 *   - Status mix (final / needs review / compliance fail)
 *   - Per-agent breakdown
 *   - Per-channel breakdown
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  // Three modes:
  //   1) ?from=&to=     → custom range (calendar picker mode)
  //   2) ?week=YYYY-MM-DD → ISO week of that day (back-compat with old links)
  //   3) (nothing)      → current ISO week (default keeps the existing report shape)
  const fromCustom = parseDate(sp.from);
  const toCustom = parseDate(sp.to);
  const customMode = fromCustom !== null && toCustom !== null;

  let start: Date;
  let end: Date;
  let label: string;
  let prevHref: string;
  let nextHref: string;
  let isCurrent: boolean;

  if (customMode) {
    start = fromCustom!;
    // "to" is inclusive on the calendar; query upper-bound is exclusive.
    end = new Date(toCustom!.getTime() + 86400 * 1000);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    label = `${fmt(start)} → ${fmt(toCustom!)} (${days} day${days === 1 ? "" : "s"})`;
    // Shift the window by its own size for the prev/next nav.
    const span = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - span);
    const prevEnd = new Date(end.getTime() - span - 86400 * 1000);
    const nextStart = new Date(start.getTime() + span);
    const nextEnd = new Date(end.getTime() + span - 86400 * 1000);
    prevHref = `/reports?from=${fmt(prevStart)}&to=${fmt(prevEnd)}`;
    nextHref = `/reports?from=${fmt(nextStart)}&to=${fmt(nextEnd)}`;
    isCurrent = false;
  } else {
    const week = sp.week;
    const reference = week ? new Date(week) : new Date();
    if (Number.isNaN(reference.getTime())) {
      return (
        <ErrorWrap>
          <p>Invalid <code>week</code> param. Try YYYY-MM-DD.</p>
        </ErrorWrap>
      );
    }
    const weekRange = isoWeekRange(reference);
    start = weekRange.start;
    end = weekRange.end;
    label = weekRange.label;
    prevHref = weekRange.prevHref;
    nextHref = weekRange.nextHref;
    isCurrent = weekRange.isCurrent;
  }

  const { data: scores } = await supabase
    .from("qa_scores")
    .select(
      "id, total_score, original_total_score, appealed_at, status, conversation_id, created_at",
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .limit(5000);

  const list = scores ?? [];

  const total = list.length;
  const avgCurrent = avg(list.map((s) => s.total_score));
  const avgOriginal = avg(list.map((s) => s.original_total_score));
  const compliance = list.filter((s) => s.status === "critical_fail").length;
  const needsReview = list.filter((s) => s.status === "needs_review").length;
  const finalCount = list.filter((s) => s.status === "final").length;
  const appealed = list.filter((s) => s.appealed_at !== null).length;
  const delta = avgCurrent - avgOriginal;

  // Hydrate conversation -> agent for breakdowns.
  const convIds = [...new Set(list.map((s) => s.conversation_id))];
  const { data: convs } =
    convIds.length > 0
      ? await supabase
          .from("conversations")
          .select("id, agent_id, channel")
          .in("id", convIds)
      : { data: [] };
  const agentIds = [
    ...new Set(
      (convs ?? [])
        .map((c) => c.agent_id)
        .filter((x): x is string => !!x),
    ),
  ];
  const { data: agents } =
    agentIds.length > 0
      ? await supabase
          .from("agents")
          .select("id, agent_name, team_name")
          .in("id", agentIds)
      : { data: [] };

  const convMap = new Map((convs ?? []).map((c) => [c.id, c]));
  const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));

  // Per-agent rollup
  const agentBuckets = new Map<
    string,
    {
      name: string;
      team: string | null;
      n: number;
      sumCurrent: number;
      sumOriginal: number;
      compliance: number;
      appealed: number;
    }
  >();
  for (const s of list) {
    const conv = convMap.get(s.conversation_id);
    if (!conv?.agent_id) continue;
    const ag = agentMap.get(conv.agent_id);
    if (!ag) continue;
    const b = agentBuckets.get(conv.agent_id) ?? {
      name: ag.agent_name,
      team: ag.team_name,
      n: 0,
      sumCurrent: 0,
      sumOriginal: 0,
      compliance: 0,
      appealed: 0,
    };
    b.n += 1;
    b.sumCurrent += s.total_score;
    b.sumOriginal += s.original_total_score;
    if (s.status === "critical_fail") b.compliance += 1;
    if (s.appealed_at !== null) b.appealed += 1;
    agentBuckets.set(conv.agent_id, b);
  }
  const agentRows = [...agentBuckets.values()]
    .map((b) => ({
      ...b,
      avgCurrent: b.sumCurrent / b.n,
      avgOriginal: b.sumOriginal / b.n,
    }))
    .sort((a, b) => b.n - a.n);

  // Per-channel rollup
  const channelBuckets = new Map<
    string,
    { n: number; sumCurrent: number; sumOriginal: number }
  >();
  for (const s of list) {
    const conv = convMap.get(s.conversation_id);
    if (!conv) continue;
    const b = channelBuckets.get(conv.channel) ?? {
      n: 0,
      sumCurrent: 0,
      sumOriginal: 0,
    };
    b.n += 1;
    b.sumCurrent += s.total_score;
    b.sumOriginal += s.original_total_score;
    channelBuckets.set(conv.channel, b);
  }
  const channelRows = [...channelBuckets.entries()]
    .map(([channel, b]) => ({
      channel,
      n: b.n,
      avgCurrent: b.sumCurrent / b.n,
      avgOriginal: b.sumOriginal / b.n,
    }))
    .sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-8 print:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 print:block">
        <div>
          <h1 className="text-2xl font-semibold">QA report</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {label}
            {isCurrent && (
              <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                Current week
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <a
              href="/reports/templates"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Saved templates
            </a>
            <a
              href={prevHref}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              \u2190 Previous
            </a>
            <a
              href={nextHref}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Next \u2192
            </a>
            <a
              href={`/api/export/reports?from=${start.toISOString().slice(0, 10)}&to=${new Date(end.getTime() - 86400 * 1000).toISOString().slice(0, 10)}`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              title="Download this report as CSV"
            >
              Download CSV
            </a>
            <PrintButton />
          </div>
          <DateRangePicker
            basePath="/reports"
            from={start.toISOString().slice(0, 10)}
            to={new Date(end.getTime() - 86400 * 1000).toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No conversations scored in this range.
          </p>
        </div>
      ) : (
        <>
          {/* Headline KPIs */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Conversations scored" value={total.toLocaleString()} />
            <Stat
              label="Average score"
              value={avgCurrent.toFixed(1)}
              hint={`Original QA score ${avgOriginal.toFixed(1)} \u00b7 ${
                delta >= 0 ? "+" : ""
              }${delta.toFixed(2)}`}
            />
            <Stat
              label="Compliance fails"
              value={compliance.toLocaleString()}
              hint={`${pct(compliance, total)}% of week`}
            />
            <Stat
              label="Cases appealed"
              value={appealed.toLocaleString()}
              hint={`${pct(appealed, total)}% had override confirmed`}
            />
          </section>

          {/* Status mix */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Status mix
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Numerical Status Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatusTile
                  label="Final"
                  count={finalCount}
                  total={total}
                  tone="ok"
                />
                <StatusTile
                  label="Needs review"
                  count={needsReview}
                  total={total}
                  tone="warning"
                />
                <StatusTile
                  label="Compliance fail"
                  count={compliance}
                  total={total}
                  tone="danger"
                />
              </div>

              {/* Glowing SVG Donut Chart Visual */}
              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-between gap-6">
                <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background track circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="currentColor"
                      className="text-zinc-100 dark:text-zinc-800/60"
                      strokeWidth="10"
                    />
                    {total > 0 && (() => {
                      const finalPct = finalCount / total;
                      const reviewPct = needsReview / total;
                      const failPct = compliance / total;

                      const circ = 2 * Math.PI * 38; // ~238.76
                      
                      const finalDash = finalPct * circ;
                      const reviewDash = reviewPct * circ;
                      const failDash = failPct * circ;

                      const finalOffset = 0;
                      const reviewOffset = -finalDash;
                      const failOffset = -(finalDash + reviewDash);

                      return (
                        <>
                          {/* Final segment (emerald) */}
                          {finalDash > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="10"
                              strokeDasharray={`${finalDash} ${circ - finalDash}`}
                              strokeDashoffset={finalOffset}
                              strokeLinecap={finalDash === circ ? "butt" : "round"}
                              className="transition-all duration-500 ease-out"
                            />
                          )}
                          {/* Needs Review segment (amber) */}
                          {reviewDash > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f59e0b"
                              strokeWidth="10"
                              strokeDasharray={`${reviewDash} ${circ - reviewDash}`}
                              strokeDashoffset={reviewOffset}
                              strokeLinecap="round"
                              className="transition-all duration-500 ease-out"
                            />
                          )}
                          {/* Compliance Fail segment (rose) */}
                          {failDash > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f43f5e"
                              strokeWidth="10"
                              strokeDasharray={`${failDash} ${circ - failDash}`}
                              strokeDashoffset={failOffset}
                              strokeLinecap="round"
                              className="transition-all duration-500 ease-out"
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                  {/* Center Text overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Total</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white leading-none mt-0.5">{total}</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="flex-1 space-y-2 font-mono text-xs text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Final</span>
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{pct(finalCount, total)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Review</span>
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{pct(needsReview, total)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Fails</span>
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{pct(compliance, total)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* By channel */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              By channel
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2 text-right">Volume</th>
                    <th className="px-4 py-2 text-right">Original QA</th>
                    <th className="px-4 py-2 text-right">Final score</th>
                    <th className="px-4 py-2 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {channelRows.map((r) => (
                    <tr key={r.channel}>
                      <td className="px-4 py-2 capitalize">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.channel.replace("_", " ")}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            ({pct(r.n, total)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                            style={{ width: `${pct(r.n, total)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-500">
                        {r.n.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-500">
                        {r.avgOriginal.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {r.avgCurrent.toFixed(1)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${tone(r.avgCurrent - r.avgOriginal)}`}
                      >
                        {fmtDelta(r.avgCurrent - r.avgOriginal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per-agent breakdown */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Per-agent breakdown
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-2">Agent</th>
                    <th className="px-4 py-2 text-right">Scored</th>
                    <th className="px-4 py-2 text-right">Original QA</th>
                    <th className="px-4 py-2 text-right">Final</th>
                    <th className="px-4 py-2 text-right">Delta</th>
                    <th className="px-4 py-2 text-right">Comp. fails</th>
                    <th className="px-4 py-2 text-right">Appealed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {agentRows.map((a) => (
                    <tr key={a.name + (a.team ?? "")}>
                      <td className="px-4 py-2 font-medium">
                        {a.name}
                        {a.team && (
                          <span className="ml-1 text-xs font-normal text-zinc-500">
                            \u00b7 {a.team}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-500">{a.n}</td>
                      <td className="px-4 py-2 text-right text-zinc-500">
                        {a.avgOriginal.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {a.avgCurrent.toFixed(1)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${tone(a.avgCurrent - a.avgOriginal)}`}
                      >
                        {fmtDelta(a.avgCurrent - a.avgOriginal)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {a.compliance > 0 ? (
                          <span className="rounded bg-red-50 px-1.5 text-red-700 dark:bg-red-950 dark:text-red-400">
                            {a.compliance}
                          </span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-500">
                        {a.appealed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              <strong>Original QA</strong> is the score the QA engine initially produced.{" "}
              <strong>Final</strong> reflects any confirmed overrides from the appeal
              process. Positive delta = humans graded higher than the QA engine.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ---------- helpers ----------

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pct(n: number, total: number): string {
  if (total === 0) return "0";
  return ((n / total) * 100).toFixed(1);
}

function fmtDelta(d: number): string {
  if (Math.abs(d) < 0.05) return "\u2014";
  return (d >= 0 ? "+" : "") + d.toFixed(2);
}

function tone(d: number): string {
  if (Math.abs(d) < 0.05) return "text-zinc-400";
  return d > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

/**
 * Wraps the pure helper from @/lib/reports/iso-week and adds the
 * page-specific navigation hrefs.
 */
function isoWeekRange(ref: Date) {
  const { start, end, label, isCurrent } = computeIsoWeekRange(ref);
  const prevRef = new Date(start);
  prevRef.setUTCDate(prevRef.getUTCDate() - 7);
  const nextRef = new Date(start);
  nextRef.setUTCDate(nextRef.getUTCDate() + 7);
  return {
    start,
    end,
    label,
    prevHref: `/reports?week=${prevRef.toISOString().slice(0, 10)}`,
    nextHref: `/reports?week=${nextRef.toISOString().slice(0, 10)}`,
    isCurrent,
  };
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function StatusTile({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "ok" | "warning" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
        : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950";

  const percent = Number(pct(count, total));
  const barColor =
    tone === "danger"
      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
      : tone === "warning"
        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  const bgBar =
    tone === "danger"
      ? "bg-red-200 dark:bg-red-900/40"
      : tone === "warning"
        ? "bg-amber-200 dark:bg-amber-900/40"
        : "bg-emerald-200 dark:bg-emerald-900/40";

  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{count.toLocaleString()}</p>
      <div className={`mt-2 h-1.5 w-full rounded-full ${bgBar}`}>
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
        {percent.toFixed(1)}% of week
      </p>
    </div>
  );
}

function ErrorWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {children}
    </div>
  );
}

