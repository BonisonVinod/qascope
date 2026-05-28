"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanName } from "@/lib/database.types";

/**
 * Verify current user is a super admin.
 * Throws if not authenticated or not super admin.
 */
async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: me } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_super_admin) throw new Error("Forbidden: super admin only");
  return supabase;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  active_plan: PlanName | null;
  created_at: string;
  seat_count: number;
  conv_this_month: number;
  mrr_usd: number;
  last_active: string | null;
  subscription_status: string | null;
};

export type PlatformStats = {
  total_clients: number;
  total_mrr_usd: number;
  total_seats: number;
  total_convs_this_month: number;
  clients_by_plan: Record<string, number>;
};

const PLAN_PRICE: Record<string, number> = {
  pilot: 0,
  starter: 20,
  team: 18,    // Growth
  pro: 16,     // Scale
  growth: 18,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Load all clients with seat count, MRR, conversation volume, last activity.
 */
export async function getAllClients(): Promise<ClientRow[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  // All clients
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, industry, active_plan, created_at")
    .order("created_at", { ascending: false });

  if (!clients?.length) return [];

  // Seat counts per client
  const { data: seatCounts } = await admin
    .from("users")
    .select("client_id")
    .in("client_id", clients.map((c) => c.id));

  const seatMap = new Map<string, number>();
  for (const row of seatCounts ?? []) {
    seatMap.set(row.client_id, (seatMap.get(row.client_id) ?? 0) + 1);
  }

  // Conversation counts this month per client
  const { data: convCounts } = await admin
    .from("conversations")
    .select("client_id")
    .in("client_id", clients.map((c) => c.id))
    .gte("created_at", monthStart.toISOString());

  const convMap = new Map<string, number>();
  for (const row of convCounts ?? []) {
    convMap.set(row.client_id, (convMap.get(row.client_id) ?? 0) + 1);
  }

  // Latest conversation date per client (last_active proxy)
  const { data: latestConv } = await admin
    .from("conversations")
    .select("client_id, created_at")
    .in("client_id", clients.map((c) => c.id))
    .order("created_at", { ascending: false });

  const lastActiveMap = new Map<string, string>();
  for (const row of latestConv ?? []) {
    if (!lastActiveMap.has(row.client_id)) {
      lastActiveMap.set(row.client_id, row.created_at);
    }
  }

  // Subscription statuses
  const { data: subs } = await admin
    .from("subscriptions")
    .select("client_id, status")
    .in("client_id", clients.map((c) => c.id))
    .order("created_at", { ascending: false });

  const subMap = new Map<string, string>();
  for (const row of subs ?? []) {
    if (!subMap.has(row.client_id)) subMap.set(row.client_id, row.status);
  }

  return clients.map((c) => {
    const seats = seatMap.get(c.id) ?? 0;
    const pricePerSeat = PLAN_PRICE[c.active_plan ?? "pilot"] ?? 0;
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      active_plan: c.active_plan,
      created_at: c.created_at,
      seat_count: seats,
      conv_this_month: convMap.get(c.id) ?? 0,
      mrr_usd: seats * pricePerSeat,
      last_active: lastActiveMap.get(c.id) ?? null,
      subscription_status: subMap.get(c.id) ?? null,
    };
  });
}

/**
 * Aggregate platform-level stats for the header cards.
 */
export async function getPlatformStats(clients: ClientRow[]): Promise<PlatformStats> {
  const total_clients = clients.length;
  const total_mrr_usd = clients.reduce((s, c) => s + c.mrr_usd, 0);
  const total_seats = clients.reduce((s, c) => s + c.seat_count, 0);
  const total_convs_this_month = clients.reduce((s, c) => s + c.conv_this_month, 0);

  const clients_by_plan: Record<string, number> = {};
  for (const c of clients) {
    const plan = c.active_plan ?? "pilot";
    clients_by_plan[plan] = (clients_by_plan[plan] ?? 0) + 1;
  }

  return { total_clients, total_mrr_usd, total_seats, total_convs_this_month, clients_by_plan };
}

/**
 * Manually change a client's plan (super admin override).
 */
export async function setClientPlan(
  clientId: string,
  plan: PlanName,
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("clients")
      .update({ active_plan: plan })
      .eq("id", clientId);

    if (error) return { error: error.message };

    // Also update subscription row if exists
    await admin
      .from("subscriptions")
      .update({ plan_name: plan, status: "active" })
      .eq("client_id", clientId);

    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
