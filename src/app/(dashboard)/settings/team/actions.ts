"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

export type InviteActionState =
  | undefined
  | { ok: true; message: string; inviteUrl?: string }
  | { ok: false; error: string };

const ROLES: ReadonlyArray<UserRole> = [
  "admin",
  "qa_manager",
  "team_lead",
  "qa_reviewer",
  "viewer",
];

type AdminContext =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      me: { id: string; role: string; client_id: string };
    };

async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: me } = await supabase
    .from("users")
    .select("id, role, client_id")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "Your user record is missing." };
  if (me.role !== "admin" && me.role !== "qa_manager") {
    return {
      ok: false,
      error: "Only admins and QA managers can manage team members.",
    };
  }
  return { ok: true, supabase, me };
}

/**
 * Create an invitation row and return a copy-paste signup URL.
 * The admin shares the URL with the invitee via WhatsApp / email / Slack.
 * No SMTP configuration required for MVP.
 */
export async function inviteMember(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase, me } = ctx;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "qa_reviewer").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please enter a valid email." };
  }
  const role = ROLES.includes(roleRaw as UserRole)
    ? (roleRaw as UserRole)
    : "qa_reviewer";

  // If someone already exists in this workspace with that email, bail.
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("client_id", me.client_id)
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Someone with this email is already in your workspace." };
  }

  // Generate a 32-byte token, URL-safe.
  const token = randomBytes(32).toString("base64url");

  const { error: insErr } = await supabase.from("invitations").insert({
    client_id: me.client_id,
    email,
    role,
    team_name: teamName.length > 0 ? teamName : null,
    token,
    invited_by: me.id,
  });
  if (insErr) {
    return { ok: false, error: `Could not create invitation: ${insErr.message}` };
  }

  revalidatePath("/settings/team");
  // The invitee opens this URL to sign up; we don't have email sending wired up
  // yet, so the admin copies the URL to share manually.
  const inviteUrl = `/accept-invite?token=${token}`;
  return {
    ok: true,
    message: `Invitation created for ${email}. Copy the link below and share it.`,
    inviteUrl,
  };
}

/** Revoke a pending invitation. */
export async function revokeInvite(formData: FormData): Promise<void> {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await supabase
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("client_id", me.client_id);
  revalidatePath("/settings/team");
}

/** Change a member's role. Only admin can do this. */
export async function changeMemberRole(formData: FormData): Promise<void> {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  if (me.role !== "admin") return;

  const id = String(formData.get("id") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  if (!id || !ROLES.includes(roleRaw as UserRole)) return;

  // Prevent the admin from demoting themselves below admin if they are
  // the only admin in the workspace (otherwise the workspace gets locked out).
  if (me.id === id && roleRaw !== "admin") {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("client_id", me.client_id)
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      // Silently skip — the UI also prevents this.
      return;
    }
  }

  await supabase
    .from("users")
    .update({ role: roleRaw as UserRole })
    .eq("id", id)
    .eq("client_id", me.client_id);
  revalidatePath("/settings/team");
}

/** Update a member's team_name. */
export async function changeMemberTeam(formData: FormData): Promise<void> {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  if (!id) return;
  await supabase
    .from("users")
    .update({ team_name: teamName.length > 0 ? teamName : null })
    .eq("id", id)
    .eq("client_id", me.client_id);
  revalidatePath("/settings/team");
}
