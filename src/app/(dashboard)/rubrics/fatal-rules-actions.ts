"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FatalRuleActionState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

type AdminCtx =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      me: { id: string; role: string; client_id: string };
    };

async function requireAdmin(): Promise<AdminCtx> {
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
      error: "Only admins and QA managers can edit fatal rules.",
    };
  }
  return { ok: true, supabase, me };
}

async function ownsRubric(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  rubricId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("qa_rubrics")
    .select("id")
    .eq("id", rubricId)
    .eq("client_id", clientId)
    .maybeSingle();
  return Boolean(data);
}

export async function addFatalRule(
  _prev: FatalRuleActionState,
  formData: FormData,
): Promise<FatalRuleActionState> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase, me } = ctx;

  const rubricId = String(formData.get("rubricId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!rubricId) return { ok: false, error: "Missing rubric id." };
  if (!name || name.length > 80) {
    return { ok: false, error: "Name is required and must be ≤80 chars." };
  }
  if (!description || description.length > 500) {
    return {
      ok: false,
      error: "Description is required and must be ≤500 chars.",
    };
  }
  if (!(await ownsRubric(supabase, me.client_id, rubricId))) {
    return { ok: false, error: "Rubric not found." };
  }

  // Append at the end.
  const { data: existing } = await supabase
    .from("fatal_rules")
    .select("sort_order")
    .eq("rubric_id", rubricId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.sort_order ?? 0) + 1;

  const { error: insErr } = await supabase.from("fatal_rules").insert({
    rubric_id: rubricId,
    name,
    description,
    sort_order: nextOrder,
    active: true,
  });
  if (insErr) {
    return { ok: false, error: `Insert failed: ${insErr.message}` };
  }
  revalidatePath("/rubrics");
  return { ok: true, message: `Added: ${name}` };
}

export async function updateFatalRule(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id) return;
  if (!name || name.length > 80) return;
  if (!description || description.length > 500) return;

  // Ownership check via rubric.
  const { data: rule } = await supabase
    .from("fatal_rules")
    .select("rubric_id")
    .eq("id", id)
    .single();
  if (!rule) return;
  if (!(await ownsRubric(supabase, me.client_id, rule.rubric_id))) return;

  await supabase
    .from("fatal_rules")
    .update({ name, description })
    .eq("id", id);
  revalidatePath("/rubrics");
}

export async function toggleFatalRule(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { data: rule } = await supabase
    .from("fatal_rules")
    .select("active, rubric_id")
    .eq("id", id)
    .single();
  if (!rule) return;
  if (!(await ownsRubric(supabase, me.client_id, rule.rubric_id))) return;

  await supabase
    .from("fatal_rules")
    .update({ active: !rule.active })
    .eq("id", id);
  revalidatePath("/rubrics");
}

export async function deleteFatalRule(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return;
  const { supabase, me } = ctx;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { data: rule } = await supabase
    .from("fatal_rules")
    .select("rubric_id")
    .eq("id", id)
    .single();
  if (!rule) return;
  if (!(await ownsRubric(supabase, me.client_id, rule.rubric_id))) return;

  await supabase.from("fatal_rules").delete().eq("id", id);
  revalidatePath("/rubrics");
}
