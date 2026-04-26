"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

export type FatalBulkRowResult = {
  rowNumber: number;
  name: string;
  status: "added" | "skipped_duplicate" | "error";
  message?: string;
};

export type FatalBulkUploadState =
  | undefined
  | {
      ok: true;
      added: number;
      skipped: number;
      errors: number;
      results: FatalBulkRowResult[];
    }
  | { ok: false; error: string };

type RawRow = Record<string, string | undefined>;

/**
 * Bulk-add fatal rules from a CSV. Columns: name, description (case-insensitive
 * headers). Each row appends a new active rule. Names that already exist on the
 * rubric are skipped so re-uploading the same file is a no-op.
 */
export async function bulkAddFatalRules(
  _prev: FatalBulkUploadState,
  formData: FormData,
): Promise<FatalBulkUploadState> {
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
    return { ok: false, error: "Only admins and QA managers can bulk-add fatal rules." };
  }

  const rubricId = String(formData.get("rubricId") ?? "").trim();
  if (!rubricId) return { ok: false, error: "Missing rubric id." };

  // Confirm rubric belongs to this workspace.
  const { data: rubric } = await supabase
    .from("qa_rubrics")
    .select("id")
    .eq("id", rubricId)
    .eq("client_id", me.client_id)
    .maybeSingle();
  if (!rubric) return { ok: false, error: "Rubric not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  if (file.size > 500_000) {
    return { ok: false, error: "CSV is too large (max 500 KB)." };
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

  // Pre-load existing rule names for dedupe.
  const { data: existing } = await supabase
    .from("fatal_rules")
    .select("name, sort_order")
    .eq("rubric_id", rubricId);
  const existingNames = new Set(
    (existing ?? []).map((r) => r.name.toLowerCase()),
  );
  const maxOrder = (existing ?? []).reduce(
    (m, r) => Math.max(m, r.sort_order),
    0,
  );

  const results: FatalBulkRowResult[] = [];
  const toInsert: Array<{
    rubric_id: string;
    name: string;
    description: string;
    sort_order: number;
    active: boolean;
  }> = [];

  let nextOrder = maxOrder;
  for (let i = 0; i < parsed.data.length; i += 1) {
    const row = parsed.data[i];
    const rowNumber = i + 2; // header is row 1
    const name = String(row.name ?? "").trim().slice(0, 80);
    const description = String(row.description ?? "").trim().slice(0, 500);

    if (!name) {
      results.push({
        rowNumber,
        name,
        status: "error",
        message: "Missing name.",
      });
      continue;
    }
    if (!description) {
      results.push({
        rowNumber,
        name,
        status: "error",
        message: "Missing description.",
      });
      continue;
    }
    const lower = name.toLowerCase();
    if (existingNames.has(lower)) {
      results.push({
        rowNumber,
        name,
        status: "skipped_duplicate",
        message: "A rule with this name already exists.",
      });
      continue;
    }

    nextOrder += 1;
    toInsert.push({
      rubric_id: rubricId,
      name,
      description,
      sort_order: nextOrder,
      active: true,
    });
    results.push({ rowNumber, name, status: "added" });
    existingNames.add(lower); // dedupe within the same CSV
  }

  let added = 0;
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("fatal_rules")
      .insert(toInsert);
    if (insErr) {
      return { ok: false, error: `Insert failed: ${insErr.message}` };
    }
    added = toInsert.length;
  }

  const skipped = results.filter((r) => r.status === "skipped_duplicate").length;
  const errors = results.filter((r) => r.status === "error").length;

  revalidatePath("/rubrics");
  return { ok: true, added, skipped, errors, results };
}
