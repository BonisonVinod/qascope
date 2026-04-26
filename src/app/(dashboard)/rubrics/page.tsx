import { createClient } from "@/lib/supabase/server";
import { RubricForm } from "./rubric-form";
import { FatalRulesPanel } from "./fatal-rules-panel";

export const dynamic = "force-dynamic";

export default async function RubricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appUser } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user!.id)
    .single();
  const canEdit = appUser?.role === "admin" || appUser?.role === "qa_manager";

  const { data: rubric } = appUser?.client_id
    ? await supabase
        .from("qa_rubrics")
        .select("id, name, version, is_default")
        .eq("client_id", appUser.client_id)
        .eq("is_default", true)
        .single()
    : { data: null };

  const { data: criteria } = rubric
    ? await supabase
        .from("qa_criteria")
        .select(
          "id, name, description, weight, critical_fail_boolean, sort_order",
        )
        .eq("rubric_id", rubric.id)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const list = criteria ?? [];
  const totalWeight = list.reduce((a, b) => a + b.weight, 0);

  const { data: fatalRules } = rubric
    ? await supabase
        .from("fatal_rules")
        .select("id, name, description, sort_order, active")
        .eq("rubric_id", rubric.id)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const rules = fatalRules ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">QA rubrics</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The weighted criteria each conversation is scored against. Weights must
          sum to 100. Marking a criterion as <em>critical</em> means a 0 score on
          it flags the entire conversation as a compliance failure (and routes it
          to review).
        </p>
        {rubric && (
          <p className="mt-1 text-xs text-zinc-400">
            Active rubric: <strong>{rubric.name}</strong> &middot; version{" "}
            {rubric.version}
          </p>
        )}
      </div>

      {!rubric ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No default rubric configured for this workspace yet.
          </p>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            This rubric has no criteria.
          </p>
        </div>
      ) : canEdit ? (
        <RubricForm rubricId={rubric.id} criteria={list} />
      ) : (
        <ReadOnlyView criteria={list} totalWeight={totalWeight} />
      )}

      {rubric && (
        <FatalRulesPanel
          rubricId={rubric.id}
          rules={rules}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function ReadOnlyView({
  criteria,
  totalWeight,
}: {
  criteria: {
    id: string;
    name: string;
    description: string | null;
    weight: number;
    critical_fail_boolean: boolean;
    sort_order: number;
  }[];
  totalWeight: number;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Criterion</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Weight</th>
              <th className="px-4 py-2 text-center">Critical</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {criteria.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-zinc-500">{c.sort_order}</td>
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2 text-xs text-zinc-500">
                  {c.description ?? "\u2014"}
                </td>
                <td className="px-4 py-2 text-right">{c.weight}</td>
                <td className="px-4 py-2 text-center">
                  {c.critical_fail_boolean ? (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                      Yes
                    </span>
                  ) : (
                    <span className="text-zinc-400">\u2014</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 dark:border-zinc-800">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-xs uppercase text-zinc-500">
                Total weight
              </td>
              <td className="px-4 py-2 text-right font-semibold">
                {totalWeight}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950">
        Only admins and QA managers can edit the rubric.
      </p>
    </div>
  );
}
