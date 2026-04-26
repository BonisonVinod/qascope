"use server";

import { createClient } from "@/lib/supabase/server";
import { nlToConfig } from "@/lib/reports/nl-to-config";
import type { ReportTemplateConfig } from "@/lib/reports/template-engine";

export type NlGenerateState =
  | undefined
  | { ok: true; config: ReportTemplateConfig; description: string }
  | { ok: false; error: string };

/**
 * One-shot LLM call that converts a plain-English description of a report
 * into a structured template config. The result is fed back into the editor
 * so the manager can tweak before saving. After they save, runs are LLM-free.
 */
export async function generateConfigFromDescription(
  _prev: NlGenerateState,
  formData: FormData,
): Promise<NlGenerateState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return { ok: false, error: "Type what you want the report to show." };
  }

  const result = await nlToConfig(description);
  if (!result.ok) return result;
  return { ok: true, config: result.config, description };
}
