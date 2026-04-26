"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeConfig } from "@/lib/reports/template-engine";

export type TemplateActionState =
  | undefined
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string };

type UserCtx =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      me: { id: string; role: string; client_id: string };
    };

async function requireUser(): Promise<UserCtx> {
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
  return { ok: true, supabase, me };
}

function readConfigFromForm(formData: FormData): Record<string, unknown> {
  // The editor posts a single hidden field "config" carrying JSON. Fallback
  // to building from individual fields for clients without JS.
  const raw = String(formData.get("config") ?? "").trim();
  if (raw.length > 0) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through
    }
  }
  // Best-effort defaults if no config blob:
  return {};
}

export async function createTemplate(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const ctx = await requireUser();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase, me } = ctx;

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "Name is required and must be ≤80 chars." };
  }
  if (description.length > 500) {
    return { ok: false, error: "Description must be ≤500 chars." };
  }

  let normalized;
  try {
    normalized = normalizeConfig(readConfigFromForm(formData));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid config.",
    };
  }

  const { data: row, error: insErr } = await supabase
    .from("report_templates")
    .insert({
      client_id: me.client_id,
      name,
      description: description.length > 0 ? description : null,
      config: normalized as unknown as Record<string, unknown>,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (insErr || !row) {
    return { ok: false, error: `Insert failed: ${insErr?.message}` };
  }

  revalidatePath("/reports/templates");
  redirect(`/reports/templates/${row.id}/run`);
}

export async function updateTemplate(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const ctx = await requireUser();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase, me } = ctx;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "Name is required and must be ≤80 chars." };
  }

  let normalized;
  try {
    normalized = normalizeConfig(readConfigFromForm(formData));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid config.",
    };
  }

  const { error: updErr } = await supabase
    .from("report_templates")
    .update({
      name,
      description: description.length > 0 ? description : null,
      config: normalized as unknown as Record<string, unknown>,
    })
    .eq("id", id)
    .eq("client_id", me.client_id);
  if (updErr) {
    return { ok: false, error: `Update failed: ${updErr.message}` };
  }

  revalidatePath("/reports/templates");
  revalidatePath(`/reports/templates/${id}/run`);
  return { ok: true, message: "Saved.", id };
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const ctx = await requireUser();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await supabase
    .from("report_templates")
    .delete()
    .eq("id", id)
    .eq("client_id", me.client_id);
  revalidatePath("/reports/templates");
}

export async function duplicateTemplate(formData: FormData): Promise<void> {
  const ctx = await requireUser();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { data: src } = await supabase
    .from("report_templates")
    .select("name, description, config")
    .eq("id", id)
    .eq("client_id", me.client_id)
    .single();
  if (!src) return;
  await supabase.from("report_templates").insert({
    client_id: me.client_id,
    name: `${src.name} (copy)`,
    description: src.description,
    config: src.config,
    created_by: me.id,
  });
  revalidatePath("/reports/templates");
}
