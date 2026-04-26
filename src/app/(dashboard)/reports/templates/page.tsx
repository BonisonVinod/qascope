import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteTemplate, duplicateTemplate } from "./actions";
import {
  normalizeConfig,
  groupByLabel,
  type ReportTemplateConfig,
} from "@/lib/reports/template-engine";

export const dynamic = "force-dynamic";

export default async function TemplatesListPage() {
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

  const { data: rows } = me?.client_id
    ? await supabase
        .from("report_templates")
        .select("id, name, description, config, created_at, updated_at")
        .eq("client_id", me.client_id)
        .order("updated_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Link
            href="/reports"
            className="text-xs text-zinc-500 hover:underline"
          >
            ← Back to reports
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Saved report templates</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Build a report once; run it whenever. Templates execute directly
            from your data — no LLM call per run.
          </p>
        </div>
        <Link
          href="/reports/templates/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + New template
        </Link>
      </div>

      {rows && rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Window</th>
                <th className="px-4 py-2 font-medium">Group by</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => {
                let cfg: ReportTemplateConfig | null = null;
                try {
                  cfg = normalizeConfig(r.config);
                } catch {
                  cfg = null;
                }
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/reports/templates/${r.id}/run`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.description && (
                        <p className="text-xs text-zinc-500">{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {cfg
                        ? cfg.timeWindow === "custom_days"
                          ? `Last ${cfg.customDays ?? 30} days`
                          : cfg.timeWindow.replace(/_/g, " ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {cfg ? groupByLabel(cfg.groupBy) : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(r.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/reports/templates/${r.id}/run`}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Run
                        </Link>
                        <Link
                          href={`/reports/templates/${r.id}/edit`}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </Link>
                        <form action={duplicateTemplate}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Duplicate
                          </button>
                        </form>
                        <form action={deleteTemplate}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No templates yet. Create your first one — it&rsquo;ll be reusable
            forever after that.
          </p>
        </div>
      )}
    </div>
  );
}
