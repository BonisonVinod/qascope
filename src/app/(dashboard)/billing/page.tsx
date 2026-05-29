import { createClient } from "@/lib/supabase/server";
import { PLANS, PLAN_ORDER, formatUsd, getPlan } from "@/lib/billing/plans";
import { getUsage } from "@/lib/billing/usage";
import { formatMicroInr, formatTokens } from "@/lib/billing/openai-cost";
import { PlanPicker } from "@/app/(dashboard)/billing/plan-picker";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user!.id)
    .single();
  const isAdmin = me?.role === "admin";
  const clientId = me?.client_id;

  const { data: client } = clientId
    ? await supabase
        .from("clients")
        .select("name, active_plan")
        .eq("id", clientId)
        .single()
    : { data: null };

  const usage = clientId
    ? await getUsage(supabase, clientId)
    : null;

  // Seat count: every active member of this workspace + any unaccepted invites.
  // (Pending invites are counted because they will become seats once accepted.)
  const { count: memberCount } = clientId
    ? await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
    : { count: 0 };
  const { count: openInviteCount } = clientId
    ? await supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .is("accepted_at", null)
    : { count: 0 };
  const seatsUsed = (memberCount ?? 0) + (openInviteCount ?? 0);

  // OpenAI usage this month — pulled from openai_usage rows we logged on
  // every chatText call. Aggregated in JS to avoid an extra SQL view.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: usageRows } = clientId
    ? await supabase
        .from("openai_usage")
        .select("feature, prompt_tokens, completion_tokens, cost_inr_micro")
        .eq("client_id", clientId)
        .gte("called_at", monthStart.toISOString())
        .limit(50_000)
    : { data: [] };

  type UsageBucket = {
    feature: string;
    calls: number;
    promptTokens: number;
    completionTokens: number;
    costMicro: number;
  };
  const usageByFeature = new Map<string, UsageBucket>();
  let totalCalls = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCostMicro = 0;
  for (const r of usageRows ?? []) {
    totalCalls += 1;
    totalPromptTokens += r.prompt_tokens ?? 0;
    totalCompletionTokens += r.completion_tokens ?? 0;
    totalCostMicro += r.cost_inr_micro ?? 0;
    const b =
      usageByFeature.get(r.feature) ??
      { feature: r.feature, calls: 0, promptTokens: 0, completionTokens: 0, costMicro: 0 };
    b.calls += 1;
    b.promptTokens += r.prompt_tokens ?? 0;
    b.completionTokens += r.completion_tokens ?? 0;
    b.costMicro += r.cost_inr_micro ?? 0;
    usageByFeature.set(r.feature, b);
  }
  const usageByFeatureRows = [...usageByFeature.values()].sort(
    (a, b) => b.costMicro - a.costMicro,
  );

  const currentPlan = getPlan(client?.active_plan ?? "pilot");
  // Estimated monthly bill = seats × per-seat price (USD)
  const estimatedMonthlyUsd = seatsUsed * currentPlan.pricePerSeatUsd;

  // Subscription history (last 5)
  const { data: history } = clientId
    ? await supabase
        .from("subscriptions")
        .select("plan_name, monthly_limit, status, billing_cycle_start, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {client?.name ? `${client.name} · ` : ""}plan, usage, and history.
        </p>
      </div>

      {/* Current plan + usage + seats */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Current plan
          </p>
          <p className="mt-1 text-2xl font-semibold">{currentPlan.label}</p>
          <p className="mt-1 text-xs text-zinc-400">{currentPlan.seatRange}</p>
          <p className="mt-1 text-sm text-zinc-500">{currentPlan.description}</p>
          {currentPlan.pricePerSeatUsd > 0 ? (
            <>
              <p className="mt-3 text-sm">
                <strong className="text-lg">
                  {formatUsd(currentPlan.pricePerSeatUsd)}
                </strong>
                <span className="text-zinc-500"> / seat / month</span>
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                ≈ {formatUsd(estimatedMonthlyUsd)} / month
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  ({seatsUsed} seat{seatsUsed === 1 ? "" : "s"})
                </span>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Free trial
            </p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            This month&rsquo;s volume
          </p>
          {usage ? (
            <>
              <p className="mt-1 text-2xl font-semibold">
                {usage.conversationsThisMonth.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  conversations
                </span>
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Every plan includes unlimited conversations &mdash; this number
                is for your reference. Plans differ on features (see the
                comparison below), not volume. You pay your own QA-engine
                provider for the underlying API calls.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">No client associated.</p>
          )}
        </div>

        {/* Seats card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Team seats
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {seatsUsed.toLocaleString()}
            <span className="ml-2 text-sm font-normal text-zinc-500">
              / {currentPlan.seatsIncluded.toLocaleString()} included
            </span>
          </p>
          <UsageBar
            percent={
              currentPlan.seatsIncluded > 0
                ? (seatsUsed / currentPlan.seatsIncluded) * 100
                : 100
            }
            over={seatsUsed > currentPlan.seatsIncluded}
          />
          <p className="mt-2 text-xs text-zinc-500">
            {seatsUsed > currentPlan.seatsIncluded ? (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {seatsUsed - currentPlan.seatsIncluded} over included seats ·{" "}
                {currentPlan.pricePerSeatUsd > 0
                  ? `+${formatUsd(currentPlan.pricePerSeatUsd)}/seat/month`
                  : "free during trial"}
              </span>
            ) : (
              <>
                {Math.max(0, currentPlan.seatsIncluded - seatsUsed)} seats remaining.
              </>
            )}
          </p>
        </div>
      </section>

      {/* QA engine usage this month — what they owe their QA engine provider directly when on a BYO-key tier. */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          QA engine usage · this month
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-zinc-500">
          {currentPlan.byoOpenAiKey
            ? "You bring your own QA engine key on this plan, so your provider bills you directly. The numbers below are an estimate based on tokens consumed."
            : "On the Pilot plan, QAScope covers the QA engine cost. The numbers below are what you'd be paying if you upgrade — useful to budget. You pay the QA engine provider directly; QAScope just shows the receipt."}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Estimated cost
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatMicroInr(totalCostMicro)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">at current provider rates</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              API calls
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {totalCalls.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Prompt tokens
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatTokens(totalPromptTokens)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Completion tokens
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatTokens(totalCompletionTokens)}
            </p>
          </div>
        </div>

        {usageByFeatureRows.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-2 font-medium">Feature</th>
                  <th className="px-4 py-2 font-medium">Calls</th>
                  <th className="px-4 py-2 font-medium">Prompt tokens</th>
                  <th className="px-4 py-2 font-medium">Completion tokens</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {usageByFeatureRows.map((b) => (
                  <tr key={b.feature}>
                    <td className="px-4 py-2 font-medium">
                      {b.feature.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {b.calls.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {formatTokens(b.promptTokens)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {formatTokens(b.completionTokens)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatMicroInr(b.costMicro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {usageByFeatureRows.length === 0 && (
          <p className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
            No LLM calls yet this month. Upload a CSV and score it to see usage here.
          </p>
        )}
      </section>

      {/* Plan picker */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-1">
          Plans & Pricing
        </h2>
        <p className="max-w-2xl text-xs text-zinc-500 mb-6">
          Pricing is a <strong className="text-zinc-700 dark:text-zinc-300">retroactive volume discount</strong> — the
          rate you qualify for applies to <em>every</em> seat from seat 1, not
          just the extra ones. Upgrading to the next tier actually lowers your
          total bill. Use the dynamic seat selector below to see total pricing and upgrades.
        </p>
        <PlanPicker
          currentPlanName={client?.active_plan ?? "pilot"}
          seatsUsed={seatsUsed}
          isAdmin={isAdmin}
        />
      </section>

      {/* History */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          History
        </h2>
        {(history ?? []).length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            No subscription changes yet.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2 text-right">Limit</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Cycle start</th>
                  <th className="px-4 py-2">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(history ?? []).map((h, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 capitalize">{h.plan_name}</td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {h.monthly_limit.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 capitalize text-zinc-500">
                      {h.status.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {h.billing_cycle_start}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function UsageBar({ percent, over }: { percent: number; over: boolean }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color = over
    ? "bg-red-500"
    : clamped > 80
      ? "bg-amber-500"
      : "bg-emerald-500";
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
