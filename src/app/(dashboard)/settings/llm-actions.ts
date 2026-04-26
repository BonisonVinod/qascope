"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LlmProvider } from "@/lib/llm/client";

export type LlmSettingsState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

const VALID_PROVIDERS: ReadonlyArray<LlmProvider> = [
  "openai",
  "openrouter",
  "together",
  "groq",
  "azure",
  "custom",
];

export async function saveLlmSettings(
  _prev: LlmSettingsState,
  formData: FormData,
): Promise<LlmSettingsState> {
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
  if (!me) return { ok: false, error: "Your user record is missing." };
  if (me.role !== "admin") {
    return { ok: false, error: "Only admins can change the LLM provider." };
  }

  const providerRaw = String(formData.get("provider") ?? "").trim();
  const provider = VALID_PROVIDERS.includes(providerRaw as LlmProvider)
    ? (providerRaw as LlmProvider)
    : null;

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  // "Clear" intent — empty everything to fall back to hosted.
  const isClearing =
    !provider && apiKey.length === 0 && baseUrl.length === 0 && model.length === 0;

  if (isClearing) {
    const { error: updErr } = await supabase
      .from("clients")
      .update({
        llm_provider: null,
        llm_api_key: null,
        llm_base_url: null,
        llm_model: null,
      })
      .eq("id", me.client_id);
    if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };
    revalidatePath("/settings");
    revalidatePath("/billing");
    return { ok: true, message: "LLM config cleared. Falling back to hosted (Pilot)." };
  }

  if (!provider) {
    return { ok: false, error: "Pick a provider (or leave all fields blank to clear)." };
  }
  if (!apiKey) {
    return { ok: false, error: "API key is required." };
  }
  if ((provider === "azure" || provider === "custom") && !baseUrl) {
    return {
      ok: false,
      error: `${provider} requires a base URL — set it explicitly.`,
    };
  }
  if (apiKey.length > 500) {
    return { ok: false, error: "API key looks too long; please check it." };
  }
  if (baseUrl && !baseUrl.startsWith("http")) {
    return { ok: false, error: "Base URL must start with http:// or https://." };
  }

  const { error: updErr } = await supabase
    .from("clients")
    .update({
      llm_provider: provider,
      llm_api_key: apiKey,
      llm_base_url: baseUrl.length > 0 ? baseUrl : null,
      llm_model: model.length > 0 ? model : null,
    })
    .eq("id", me.client_id);
  if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };

  revalidatePath("/settings");
  revalidatePath("/billing");
  return { ok: true, message: "LLM provider saved." };
}
