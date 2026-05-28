import { getAllClients, getPlatformStats } from "./admin-actions";
import { ChangePlanDropdown } from "./change-plan-dropdown";
import type { PlanName } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  pilot: "Pilot",
  starter: "Starter",
  team: "Growth",
  pro: "Scale",
};

const PLAN_COLORS: Record<string, string> = {
  pilot:   "bg-zinc-700 text-zinc-300",
  starter: "bg-blue-900 text-blue-300",
  team:    "bg-purple-900 text-purple-300",
  pro:     "bg-emerald-900 text-emerald-300",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  active:    "text-emerald-400",
  trialing:  "text-blue-400",
  past_due:  "text-amber-400",
  canceled:  "text-red-400",
};

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function AdminPage() {
  const clients = await getAllClients();
  const stats = await getPlatformStats(clients);

  // Sort: paying first, then by MRR desc
  const sorted = [...clients].sort((a, b) => {
    if (a.mrr_usd !== b.mrr_usd) return b.mrr_usd - a.mrr_usd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Health flags: inactive > 14 days
  const inactive = clients.filter(
    (c) => !c.last_active || Date.now() - new Date(c.last_active).getTime() > 14 * 86400000,
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">
          All customers · real-time data · admin-only
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total clients", value: fmt(stats.total_clients) },
          { label: "Monthly MRR", value: fmtUsd(stats.total_mrr_usd), highlight: true },
          { label: "Total seats", value: fmt(stats.total_seats) },
          { label: "Convs this month", value: fmt(stats.total_convs_this_month) },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-xl border p-5 ${
              highlight
                ? "border-emerald-700 bg-emerald-950/40"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(stats.clients_by_plan).map(([plan, count]) => (
          <div key={plan} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2">
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${PLAN_COLORS[plan] ?? "bg-zinc-700 text-zinc-300"}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
            <span className="ml-2 text-sm font-semibold text-white">{count}</span>
            <span className="ml-1 text-xs text-zinc-500">client{count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>

      {/* Health alert */}
      {inactive.length > 0 && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-semibold text-amber-400">
            ⚠ {inactive.length} client{inactive.length !== 1 ? "s" : ""} inactive for 14+ days
          </p>
          <p className="mt-1 text-xs text-amber-500/80">
            {inactive.map((c) => c.name).join(", ")}
          </p>
        </div>
      )}

      {/* Client table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          All Clients ({clients.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Seats</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Convs / mo</th>
                <th className="px-4 py-3 font-medium">Last active</th>
                <th className="px-4 py-3 font-medium">Sub status</th>
                <th className="px-4 py-3 font-medium">Change plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950">
              {sorted.map((c) => (
                <tr key={c.id} className="transition hover:bg-zinc-900/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{c.name}</p>
                    {c.industry && (
                      <p className="text-[11px] text-zinc-500">{c.industry}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${PLAN_COLORS[c.active_plan ?? "pilot"]}`}>
                      {PLAN_LABELS[c.active_plan ?? "pilot"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{fmt(c.seat_count)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-400">
                    {c.mrr_usd > 0 ? fmtUsd(c.mrr_usd) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{fmt(c.conv_this_month)}</td>
                  <td className="px-4 py-3 text-zinc-400">{timeAgo(c.last_active)}</td>
                  <td className="px-4 py-3">
                    {c.subscription_status ? (
                      <span className={`text-xs font-medium ${SUB_STATUS_COLORS[c.subscription_status] ?? "text-zinc-400"}`}>
                        {c.subscription_status}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChangePlanDropdown
                      clientId={c.id}
                      currentPlan={c.active_plan as PlanName}
                      clientName={c.name}
                    />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-600">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
