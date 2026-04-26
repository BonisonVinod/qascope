"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

const ROLES: ReadonlyArray<UserRole> = [
  "admin",
  "qa_manager",
  "team_lead",
  "qa_reviewer",
  "viewer",
];

export type BulkRowResult = {
  rowNumber: number;
  email: string;
  status: "created" | "skipped_existing_user" | "skipped_already_invited" | "error";
  message?: string;
  inviteUrl?: string;
};

export type BulkUploadState =
  | undefined
  | {
      ok: true;
      created: number;
      skipped: number;
      errors: number;
      results: BulkRowResult[];
    }
  | { ok: false; error: string };

type RawRow = Record<string, string | undefined>;

/**
 * Parse a CSV of teammates and create invitation rows in bulk. Each row:
 *   email,role,team_name,name
 * email is required; everything else is optional. Role defaults to qa_reviewer.
 */
export async function bulkInviteFromCsv(
  _prev: BulkUploadState,
  formData: FormData,
): Promise<BulkUploadState> {
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
    return { ok: false, error: "Only admins and QA managers can bulk-invite." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  if (file.size > 1_000_000) {
    return { ok: false, error: "CSV is too large (max 1 MB)." };
  }

  const text = await file.text();
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (parsed.errors.length > 0) {
    return {
      ok: false,
      error: `CSV parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row ?? "?"})`,
    };
  }

  // Pre-load existing members + open invites for this client so we can dedupe
  // without N+1 round-trips.
  const { data: members } = await supabase
    .from("users")
    .select("email")
    .eq("client_id", me.client_id);
  const existingEmails = new Set(
    (members ?? []).map((m) => m.email.toLowerCase()),
  );

  const { data: openInvites } = await supabase
    .from("invitations")
    .select("email")
    .eq("client_id", me.client_id)
    .is("accepted_at", null);
  const openInviteEmails = new Set(
    (openInvites ?? []).map((i) => i.email.toLowerCase()),
  );

  const results: BulkRowResult[] = [];
  const toInsert: Array<{
    client_id: string;
    email: string;
    role: UserRole;
    team_name: string | null;
    token: string;
    invited_by: string | null;
  }> = [];

  for (let i = 0; i < parsed.data.length; i += 1) {
    const row = parsed.data[i];
    const rowNumber = i + 2; // header is row 1
    const email = String(row.email ?? "").trim().toLowerCase();
    const roleRaw = String(row.role ?? "qa_reviewer").trim();
    const teamName = String(row.team_name ?? row["team"] ?? "").trim();

    if (!email || !email.includes("@")) {
      results.push({
        rowNumber,
        email,
        status: "error",
        message: "Missing or invalid email.",
      });
      continue;
    }
    if (existingEmails.has(email)) {
      results.push({
        rowNumber,
        email,
        status: "skipped_existing_user",
        message: "Already a member of this workspace.",
      });
      continue;
    }
    if (openInviteEmails.has(email)) {
      results.push({
        rowNumber,
        email,
        status: "skipped_already_invited",
        message: "An open invitation already exists.",
      });
      continue;
    }

    const role = ROLES.includes(roleRaw as UserRole)
      ? (roleRaw as UserRole)
      : "qa_reviewer";
    const token = randomBytes(32).toString("base64url");

    toInsert.push({
      client_id: me.client_id,
      email,
      role,
      team_name: teamName.length > 0 ? teamName : null,
      token,
      invited_by: me.id,
    });

    // Optimistic placeholder; we'll fix the inviteUrl after insert.
    results.push({
      rowNumber,
      email,
      status: "created",
      inviteUrl: `/accept-invite?token=${token}`,
    });

    // Track in the dedupe set so the same email appearing twice in the CSV
    // doesn't create two invitations.
    openInviteEmails.add(email);
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("invitations")
      .insert(toInsert);
    if (insErr) {
      return {
        ok: false,
        error: `Insert failed: ${insErr.message}`,
      };
    }
    created = toInsert.length;
  }

  const skipped = results.filter(
    (r) =>
      r.status === "skipped_existing_user" ||
      r.status === "skipped_already_invited",
  ).length;
  const errors = results.filter((r) => r.status === "error").length;

  revalidatePath("/settings/team");

  return {
    ok: true,
    created,
    skipped,
    errors,
    results,
  };
}
