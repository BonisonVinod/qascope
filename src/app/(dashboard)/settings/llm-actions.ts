"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Save the workspace's QA-engine credentials. Admin-only. clients has
 * SELECT-only RLS for tenant users, so the UPDATE goes through the
 * service-role admin client (same pattern as the Stop button fix).
 *
 * No env-var fallback exists in the rest of the system, so an empty
 * config means scoring will refuse until something is filled in. We let
 * the admin clear the saved config explicitly (all fields blank) — the
 * UI surfaces a clear "configure your QA engine" error when scoring runs.
 */
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
    return { ok: false, error: "Only admins can change the QA engine provider." };
  }

  const providerRaw = String(formData.get("provider") ?? "").trim();
  const provider = VALID_PROVIDERS.includes(providerRaw as LlmProvider)
    ? (providerRaw as LlmProvider)
    : null;

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const embeddingApiKey = String(formData.get("embeddingApiKey") ?? "").trim();
  const embeddingBaseUrl = String(formData.get("embeddingBaseUrl") ?? "").trim();
  const clearEmbeddingKey = String(formData.get("clearEmbeddingKey") ?? "") === "1";

  const admin = createAdminClient();

  // "Clear" intent — empty everything. Scoring will surface a
  // "configure your QA engine" error until the admin sets a new key.
  const isClearing =
    !provider && apiKey.length === 0 && baseUrl.length === 0 && model.length === 0;

  if (isClearing) {
    const { error: updErr } = await admin
      .from("clients")
      .update({
        llm_provider: null,
        llm_api_key: null,
        llm_base_url: null,
        llm_model: null,
        llm_embedding_api_key: null,
        llm_embedding_base_url: null,
      })
      .eq("id", me.client_id);
    if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };
    revalidatePath("/settings");
    revalidatePath("/billing");
    return {
      ok: true,
      message:
        "QA engine config cleared. Scoring will pause until a new key is added.",
    };
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
  if (embeddingApiKey && embeddingApiKey.length > 500) {
    return { ok: false, error: "Embedding API key looks too long; please check it." };
  }
  if (embeddingBaseUrl && !embeddingBaseUrl.startsWith("http")) {
    return { ok: false, error: "Embedding base URL must start with http:// or https://." };
  }

  type ClientsUpdate = {
    llm_provider: typeof provider;
    llm_api_key: string;
    llm_base_url: string | null;
    llm_model: string | null;
    llm_embedding_api_key?: string | null;
    llm_embedding_base_url?: string | null;
  };
  const update: ClientsUpdate = {
    llm_provider: provider,
    llm_api_key: apiKey,
    llm_base_url: baseUrl.length > 0 ? baseUrl : null,
    llm_model: model.length > 0 ? model : null,
  };

  if (clearEmbeddingKey) {
    // Admin unchecked "Use a separate API key for embeddings" — clear both.
    update.llm_embedding_api_key = null;
    update.llm_embedding_base_url = null;
  } else if (embeddingApiKey.length > 0) {
    update.llm_embedding_api_key = embeddingApiKey;
    update.llm_embedding_base_url =
      embeddingBaseUrl.length > 0 ? embeddingBaseUrl : null;
  }
  // else: leave existing embedding fields untouched.

  const { error: updErr } = await admin
    .from("clients")
    .update(update)
    .eq("id", me.client_id);
  if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };

  revalidatePath("/settings");
  revalidatePath("/billing");
  return { ok: true, message: "QA engine provider saved." };
}
