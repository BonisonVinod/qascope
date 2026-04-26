"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RubricActionState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Save edits to the default rubric's criteria. We support tweaking name,
 * description, weight, and the critical_fail flag. We deliberately don't
 * allow inserting or deleting criteria from the UI — the AI prompt library
 * is keyed on sort_order, so the 7 baseline criteria are fixed for MVP.
 *
 * Validation:
 *   - weights must each be 0..100
 *   - weights must sum to exactly 100
 *   - name required, max 80 chars
 *   - description max 500 chars
 */
export async function saveRubric(
  _prev: RubricActionState,
  formData: FormData,
): Promise<RubricActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "User record missing." };
  if (me.role !== "admin" && me.role !== "qa_manager") {
    return { ok: false, error: "Only admins and QA managers can edit rubrics." };
  }
  if (!me.client_id) return { ok: false, error: "No client associated." };

  const rubricId = String(formData.get("rubricId") ?? "");
  if (!rubricId) return { ok: false, error: "Missing rubric id." };

  // Confirm the rubric belongs to this client.
  const { data: rubric } = await supabase
    .from("qa_rubrics")
    .select("id, client_id")
    .eq("id", rubricId)
    .single();
  if (!rubric || rubric.client_id !== me.client_id) {
    return { ok: false, error: "Rubric not found in this workspace." };
  }

  // Parse criteria from the form. We expect entries keyed by id:
  //   crit-<id>-name, crit-<id>-description, crit-<id>-weight, crit-<id>-critical
  const ids = new Set<string>();
  for (const key of formData.keys()) {
    const m = key.match(/^crit-([^-]+)-/);
    if (m) ids.add(m[1]);
  }
  if (ids.size === 0) return { ok: false, error: "No criteria submitted." };

  type Update = {
    id: string;
    name: string;
    description: string | null;
    weight: number;
    critical_fail_boolean: boolean;
  };
  const updates: Update[] = [];
  let weightSum = 0;
  for (const id of ids) {
    const name = String(formData.get(`crit-${id}-name`) ?? "").trim();
    const desc = String(formData.get(`crit-${id}-description`) ?? "").trim();
    const weightStr = String(formData.get(`crit-${id}-weight`) ?? "");
    const critical = formData.get(`crit-${id}-critical`) === "on";

    if (name.length === 0) {
      return { ok: false, error: `Criterion name is required.` };
    }
    if (name.length > 80) {
      return { ok: false, error: `"${name}" is too long (max 80 chars).` };
    }
    if (desc.length > 500) {
      return { ok: false, error: `Description for "${name}" is too long (max 500).` };
    }
    const weight = Number(weightStr);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      return { ok: false, error: `"${name}" weight must be 0..100.` };
    }
    weightSum += weight;
    updates.push({
      id,
      name,
      description: desc.length === 0 ? null : desc,
      weight,
      critical_fail_boolean: critical,
    });
  }

  if (Math.abs(weightSum - 100) > 0.01) {
    return {
      ok: false,
      error: `Weights must sum to 100 (got ${weightSum.toFixed(1)}).`,
    };
  }

  // Verify each id belongs to this rubric — defensive against tampered form ids.
  const { data: existing } = await supabase
    .from("qa_criteria")
    .select("id")
    .eq("rubric_id", rubricId);
  const validIds = new Set((existing ?? []).map((r) => r.id));
  for (const u of updates) {
    if (!validIds.has(u.id)) {
      return { ok: false, error: "Submitted a criterion that doesn't belong to this rubric." };
    }
  }

  // Apply updates one at a time. Small N (≤ 10), so this is fine.
  for (const u of updates) {
    const { error } = await supabase
      .from("qa_criteria")
      .update({
        name: u.name,
        description: u.description,
        weight: u.weight,
        critical_fail_boolean: u.critical_fail_boolean,
      })
      .eq("id", u.id);
    if (error) return { ok: false, error: `Update failed: ${error.message}` };
  }

  // Bump rubric version so historical scores remain pinned to the old definition.
  const { data: r } = await supabase
    .from("qa_rubrics")
    .select("version")
    .eq("id", rubricId)
    .single();
  if (r) {
    await supabase
      .from("qa_rubrics")
      .update({ version: (r.version ?? 1) + 1 })
      .eq("id", rubricId);
  }

  revalidatePath("/rubrics");
  return { ok: true, message: "Rubric saved." };
}
