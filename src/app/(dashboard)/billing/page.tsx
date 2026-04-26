import { createClient } from "@/lib/supabase/server";
import { PLANS, PLAN_ORDER, formatInr, getPlan } from "@/lib/billing/plans";
import { getUsage } from "@/lib/billing/usage";
import { ChangePlanButton } from "./change-plan-button";

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

  const currentPlan = getPlan(client?.active_plan ?? "pilot");
  const seatsOver = Math.max(0, seatsUsed - currentPlan.seatsIncluded);
  const additionalSeatCost =
    seatsOver * (currentPlan.additionalSeatPriceInr ?? 0);

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
          {client?.name ? `${client.name} \u00b7 ` : ""}plan, usage, and history.
        </p>
      </div>

      {/* Current plan + usage + seats */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Current plan
          </p>
          <p className="mt-1 text-2xl font-semibold">{currentPlan.label}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {currentPlan.description}
          </p>
          <p className="mt-3 text-sm">
            <strong>{formatInr(currentPlan.monthlyPriceInr)}</strong>
            {currentPlan.monthlyPriceInr > 0 && (
              <span className="text-zinc-500"> / month</span>
            )}
          </p>
          {additionalSeatCost > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              + {formatInr(additionalSeatCost)} for {seatsOver} extra seat
              {seatsOver === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            This month's usage
          </p>
          {usage ? (
            <>
              <p className="mt-1 text-2xl font-semibold">
                {usage.conversationsThisMonth.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  / {usage.monthlyLimit.toLocaleString()} conversations
                </span>
              </p>
              <UsageBar percent={usage.percentUsed} over={usage.isOverLimit} />
              <p className="mt-2 text-xs text-zinc-500">
                {usage.isOverLimit ? (
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Over limit \u2014 new uploads will be blocked. Upgrade below.
                  </span>
                ) : (
                  <>
                    {usage.remaining.toLocaleString()} conversations remaining this
                    cycle.
                  </>
                )}
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
            {seatsOver > 0 ? (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {seatsOver} over plan ·{" "}
                {currentPlan.additionalSeatPriceInr > 0
                  ? `+${formatInr(currentPlan.additionalSeatPriceInr)}/seat/month`
                  : "free during beta"}
              </span>
            ) : (
              <>
                {Math.max(0, currentPlan.seatsIncluded - seatsUsed)} seats remaining.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Plan picker */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Plans
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((p) => {
            const plan = PLANS[p];
            const isCurrent = client?.active_plan === p;
            return (
              <div
                key={p}
                className={`rounded-lg border p-5 transition ${
                  isCurrent
                    ? "border-emerald-400 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{plan.label}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatInr(plan.monthlyPriceInr)}
                  {plan.monthlyPriceInr > 0 && (
                    <span className="ml-1 text-sm font-normal text-zinc-500">
                      /mo
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{plan.description}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                        \u2713
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      Current plan
                    </button>
                  ) : isAdmin ? (
                    <ChangePlanButton plan={p} label={plan.label} />
                  ) : (
                    <button
                      disabled
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                      title="Only workspace admins can change the plan"
                    >
                      Admin only
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Razorpay checkout integration is staged \u2014 plan switches today are
          recorded directly. Once Razorpay credentials are configured, upgrades
          will route through Razorpay's hosted checkout.
        </p>
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
