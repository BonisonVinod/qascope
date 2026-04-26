import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeConfig,
  timeWindowToRange,
  aggregate,
  columnLabel,
  groupByLabel,
  type ScoreInput,
} from "@/lib/reports/template-engine";

export const dynamic = "force-dynamic";

export default async function RunTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();

  const { data: row } = await supabase
    .from("report_templates")
    .select("id, name, description, config, updated_at")
    .eq("id", id)
    .single();
  if (!row) notFound();

  const config = normalizeConfig(row.config);
  const range = timeWindowToRange(config);

  // Fetch every score in the window for this client, plus join data we need
  // for grouping/filtering. RLS already scopes to client_id; we double-filter
  // for safety + a tighter query plan.
  const { data: scores } = me?.client_id
    ? await supabase
        .from("qa_scores")
        .select(
          `
          total_score,
          original_total_score,
          status,
          appealed_at,
          conversations!inner (
            client_id,
            channel,
            agent_id,
            agents (
              agent_name,
              team_name
            )
          )
        `,
        )
        .eq("conversations.client_id", me.client_id)
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString())
        .limit(5000)
    : { data: [] };

  const inputs: ScoreInput[] = (scores ?? []).map((s) => {
    // PostgREST nested-select shape — types are inferred as arrays in some
    // generators but actually return single objects when joined !inner. Cast
    // narrowly here for safety.
    const conv = (s as unknown as {
      conversations: {
        channel: string;
        agent_id: string | null;
        agents: { agent_name: string; team_name: string | null } | null;
      } | null;
    }).conversations;
    return {
      total_score: Number(s.total_score),
      original_total_score:
        s.original_total_score === null ? null : Number(s.original_total_score),
      status: s.status as ScoreInput["status"],
      appealed_at: s.appealed_at,
      agent_id: conv?.agent_id ?? null,
      channel: (conv?.channel ?? "voice_transcript") as ScoreInput["channel"],
      team_name: conv?.agents?.team_name ?? null,
      agent_name: conv?.agents?.agent_name ?? null,
    };
  });

  const reportRows = aggregate(config, inputs);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/reports/templates"
            className="text-xs text-zinc-500 hover:underline"
          >
            ← Back to templates
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{row.name}</h1>
          {row.description && (
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              {row.description}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {range.label} · grouped by {groupByLabel(config.groupBy)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/templates/${row.id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
        </div>
      </div>

      {reportRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No data matches this template in {range.label.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-2 font-medium">
                  {groupByLabel(config.groupBy)}
                </th>
                {config.columns.map((c) => (
                  <th key={c} className="px-4 py-2 font-medium">
                    {columnLabel(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {reportRows.map((r) => (
                <tr key={r.label}>
                  <td className="px-4 py-2">{r.label}</td>
                  {config.columns.map((c) => (
                    <td key={c} className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {c === "fail_rate"
                        ? `${r.cells[c].toFixed(1)}%`
                        : c === "ai_vs_final_delta"
                          ? r.cells[c] > 0
                            ? `+${r.cells[c].toFixed(2)}`
                            : r.cells[c].toFixed(2)
                          : r.cells[c].toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
