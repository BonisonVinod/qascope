import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ScoreStatus } from "@/lib/database.types";
import { DateRangePicker } from "./date-range-picker";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 30;

/** Parse YYYY-MM-DD; return null if invalid. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  // Resolve [from, to). Defaults: last 30 days. Both inclusive on the calendar
  // but exclusive on the upper bound at query time (we add a day to the
  // user-picked "to" so the chosen day is included end-of-day).
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const defaultFrom = new Date(todayUtc.getTime() - DEFAULT_DAYS * 86400 * 1000);
  const fromDate = parseDate(sp.from) ?? defaultFrom;
  const toDateRaw = parseDate(sp.to) ?? todayUtc;
  const toDateExclusive = new Date(toDateRaw.getTime() + 86400 * 1000);
  const windowDays = Math.max(
    1,
    Math.round((toDateExclusive.getTime() - fromDate.getTime()) / 86400000),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appUser } = await supabase
    .from("users")
    .select("name, client_id")
    .eq("id", user!.id)
    .single();

  const clientId = appUser?.client_id ?? "";

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  // Pull all scored items from the window — RLS keeps it client-scoped.
  const { data: scores } = await supabase
    .from("qa_scores")
    .select(
      "id, total_score, original_total_score, appealed_at, status, created_at, conversation_id",
    )
    .gte("created_at", fromDate.toISOString())
    .lt("created_at", toDateExclusive.toISOString())
    .limit(5000);

  const scoreList = scores ?? [];

  // Look up conversations -> agents for the agent leaderboard.
  const convIds = [...new Set(scoreList.map((s) => s.conversation_id))];
  const { data: convs } =
    convIds.length > 0
      ? await supabase
          .from("conversations")
          .select("id, agent_id, channel, conversation_date")
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

  // KPIs
  const total = scoreList.length;
  const avgCurrent = avg(scoreList.map((s) => s.total_score));
  const avgOriginal = avg(scoreList.map((s) => s.original_total_score));
  const compliance = scoreList.filter((s) => s.status === "critical_fail").length;
  const compliancePct = total > 0 ? (compliance / total) * 100 : 0;
  const appealed = scoreList.filter((s) => s.appealed_at !== null).length;
  const appealedPct = total > 0 ? (appealed / total) * 100 : 0;

  // Pending across the queue (not just window-scoped — actionable now)
  const { count: pendingFirst } = await supabase
    .from("review_queue")
    .select("id", { count: "exact", head: true })
    .eq("state", "pending_first");
  const { count: pendingSecond } = await supabase
    .from("review_queue")
    .select("id", { count: "exact", head: true })
    .eq("state", "pending_second");

  // Agent leaderboard: avg score by agent (top 5 / bottom 5)
  const agentBuckets = new Map<
    string,
    { name: string; team: string | null; n: number; sum: number }
  >();
  for (const s of scoreList) {
    const conv = convMap.get(s.conversation_id);
    if (!conv?.agent_id) continue;
    const agent = agentMap.get(conv.agent_id);
    if (!agent) continue;
    const b = agentBuckets.get(conv.agent_id) ?? {
      name: agent.agent_name,
      team: agent.team_name,
      n: 0,
      sum: 0,
    };
    b.n += 1;
    b.sum += s.total_score;
    agentBuckets.set(conv.agent_id, b);
  }
  const agentRows = [...agentBuckets.values()]
    .filter((b) => b.n >= 3) // need a minimum sample
    .map((b) => ({ ...b, avg: b.sum / b.n }))
    .sort((a, b) => b.avg - a.avg);
  const top5 = agentRows.slice(0, 5);
  const bottom5 = [...agentRows].sort((a, b) => a.avg - b.avg).slice(0, 5);

  // Team rollup: avg score, volume, and fail/critical rate per team_name.
  // Conversations whose agent has no team_name go into "(unassigned)".
  type TeamBucket = {
    team: string;
    n: number;
    sum: number;
    fails: number;
    appealed: number;
  };
  const teamBuckets = new Map<string, TeamBucket>();
  for (const s of scoreList) {
    const conv = convMap.get(s.conversation_id);
    if (!conv?.agent_id) continue;
    const agent = agentMap.get(conv.agent_id);
    const teamKey = agent?.team_name ?? "(unassigned)";
    const b =
      teamBuckets.get(teamKey) ??
      { team: teamKey, n: 0, sum: 0, fails: 0, appealed: 0 };
    b.n += 1;
    b.sum += s.total_score;
    if (s.status === "critical_fail") b.fails += 1;
    if (s.appealed_at) b.appealed += 1;
    teamBuckets.set(teamKey, b);
  }
  const teamRows = [...teamBuckets.values()]
    .map((b) => ({
      ...b,
      avg: b.n > 0 ? b.sum / b.n : 0,
      failRate: b.n > 0 ? (b.fails / b.n) * 100 : 0,
    }))
    .sort((a, b) => b.n - a.n); // largest team first

  // Channel split
  const channelBuckets = new Map<string, { n: number; sum: number }>();
  for (const s of scoreList) {
    const conv = convMap.get(s.conversation_id);
    if (!conv) continue;
    const b = channelBuckets.get(conv.channel) ?? { n: 0, sum: 0 };
    b.n += 1;
    b.sum += s.total_score;
    channelBuckets.set(conv.channel, b);
  }
  const channelRows = [...channelBuckets.entries()]
    .map(([channel, b]) => ({ channel, n: b.n, avg: b.sum / b.n }))
    .sort((a, b) => b.n - a.n);

  // Status mix
  const statusCounts: Record<ScoreStatus, number> = {
    final: 0,
    needs_review: 0,
    critical_fail: 0,
  };
  for (const s of scoreList) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDateRaw.toISOString().slice(0, 10);

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Welcome back, {appUser?.name ?? "there"}.
            {client?.name && (
              <> Workspace: <strong>{client.name}</strong>.</>
            )}{" "}
            Showing {windowDays} day{windowDays === 1 ? "" : "s"}: {fromIso} &rarr; {toIso}.
          </p>
        </div>
        <DateRangePicker from={fromIso} to={toIso} />
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No scored conversations in this date range.{" "}
            <Link href="/upload" className="font-medium underline-offset-2 hover:underline">
              Upload a batch
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Conversations scored"
              value={total.toLocaleString()}
              hint={`${windowDays}d window`}
            />
            <Kpi
              label="Average score"
              value={avgCurrent.toFixed(1)}
              hint={
                Math.abs(avgCurrent - avgOriginal) > 0.05
                  ? `Original QA score ${avgOriginal.toFixed(1)}`
                  : "matches original QA score"
              }
            />
            <Kpi
              label="Compliance fails"
              value={compliance.toLocaleString()}
              hint={`${compliancePct.toFixed(1)}% of scored`}
              tone={compliancePct > 5 ? "danger" : compliancePct > 2 ? "warning" : "ok"}
            />
            <Kpi
              label="Appealed"
              value={appealed.toLocaleString()}
              hint={`${appealedPct.toFixed(1)}% had override confirmed`}
            />
          </section>

          {/* Queue + status breakdown */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QueueCard
              label="Pending first review"
              count={pendingFirst ?? 0}
              href="/review-queue"
            />
            <QueueCard
              label="Pending second review"
              count={pendingSecond ?? 0}
              href="/review-queue"
            />
            <StatusMixCard counts={statusCounts} total={total} />
          </section>

          {/* Team rollup */}
          <section>
            <Panel title="By team">
              {teamRows.length === 0 ? (
                <Empty>
                  No team data yet — set team_name on your agents (in the CSV) so
                  scores roll up here.
                </Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-1.5">Team</th>
                      <th className="py-1.5">Volume</th>
                      <th className="py-1.5 text-right">Avg score</th>
                      <th className="py-1.5 text-right">Fail rate</th>
                      <th className="py-1.5 text-right">Appealed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {teamRows.map((r) => (
                      <tr key={r.team}>
                        <td className="py-1.5">{r.team}</td>
                        <td className="py-1.5 text-zinc-500">
                          {r.n.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          {r.avg.toFixed(1)}
                        </td>
                        <td
                          className={`py-1.5 text-right font-medium ${
                            r.failRate >= 10
                              ? "text-red-600 dark:text-red-400"
                              : r.failRate >= 5
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {r.failRate.toFixed(1)}%
                        </td>
                        <td className="py-1.5 text-right text-zinc-500">
                          {r.appealed.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </section>

          {/* Channel + leaderboards */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="By channel">
              {channelRows.length === 0 ? (
                <Empty>No channel data yet.</Empty>
              ) : (
                <Table
                  rows={channelRows.map((r) => ({
                    a: r.channel.replace("_", " "),
                    b: r.n.toLocaleString(),
                    c: r.avg.toFixed(1),
                  }))}
                  headers={["Channel", "Volume", "Avg score"]}
                />
              )}
            </Panel>

            <Panel title="Top performers (min. 3 scored)">
              {top5.length === 0 ? (
                <Empty>Not enough volume per agent yet.</Empty>
              ) : (
                <Table
                  rows={top5.map((a) => ({
                    a: a.name + (a.team ? ` · ${a.team}` : ""),
                    b: a.n.toLocaleString(),
                    c: a.avg.toFixed(1),
                  }))}
                  headers={["Agent", "Scored", "Avg"]}
                />
              )}
            </Panel>

            <Panel title="Needs coaching (min. 3 scored)">
              {bottom5.length === 0 ? (
                <Empty>Not enough volume per agent yet.</Empty>
              ) : (
                <Table
                  rows={bottom5.map((a) => ({
                    a: a.name + (a.team ? ` · ${a.team}` : ""),
                    b: a.n.toLocaleString(),
                    c: a.avg.toFixed(1),
                  }))}
                  headers={["Agent", "Scored", "Avg"]}
                />
              )}
            </Panel>

            <Panel title="Quick links">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/results" className="hover:underline">
                    \u2192 All results
                  </Link>
                </li>
                <li>
                  <Link href="/review-queue" className="hover:underline">
                    \u2192 Review queue
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="hover:underline">
                    \u2192 Weekly reports
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="hover:underline">
                    \u2192 Upload conversations
                  </Link>
                </li>
              </ul>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warning" | "danger";
}) {
  const valueClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-semibold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function QueueCard({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold">{count}</p>
      <p className="mt-1 text-xs text-zinc-500">View queue \u2192</p>
    </Link>
  );
}

function StatusMixCard({
  counts,
  total,
}: {
  counts: Record<ScoreStatus, number>;
  total: number;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Status mix
      </p>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="bg-emerald-500"
          style={{ width: `${pct(counts.final)}%` }}
          title={`Final ${counts.final}`}
        />
        <div
          className="bg-amber-500"
          style={{ width: `${pct(counts.needs_review)}%` }}
          title={`Needs review ${counts.needs_review}`}
        />
        <div
          className="bg-red-500"
          style={{ width: `${pct(counts.critical_fail)}%` }}
          title={`Compliance fail ${counts.critical_fail}`}
        />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <li>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Final:{" "}
          {counts.final} ({pct(counts.final).toFixed(0)}%)
        </li>
        <li>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Needs
          review: {counts.needs_review} ({pct(counts.needs_review).toFixed(0)}%)
        </li>
        <li>
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Compliance
          fail: {counts.critical_fail} ({pct(counts.critical_fail).toFixed(0)}%)
        </li>
      </ul>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: [string, string, string];
  rows: { a: string; b: string; c: string }[];
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
        <tr>
          <th className="py-1.5">{headers[0]}</th>
          <th className="py-1.5">{headers[1]}</th>
          <th className="py-1.5 text-right">{headers[2]}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="py-1.5">{r.a}</td>
            <td className="py-1.5 text-zinc-500">{r.b}</td>
            <td className="py-1.5 text-right font-medium">{r.c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500">{children}</p>;
}
