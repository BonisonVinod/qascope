"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROVIDER_INFO, type LlmProvider } from "@/lib/llm/client";
import { inferAudioFilename } from "@/lib/voice/transcription-utils";

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
  "bedrock",
  "custom",
];

type AdminUserResult =
  | { ok: true; clientId: string }
  | { ok: false; error: string };

async function loadAdminUser(): Promise<AdminUserResult> {
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
  return { ok: true, clientId: me.client_id };
}

function readProvider(formData: FormData): LlmProvider | null {
  const providerRaw = String(formData.get("provider") ?? "").trim();
  return VALID_PROVIDERS.includes(providerRaw as LlmProvider)
    ? (providerRaw as LlmProvider)
    : null;
}

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
  const adminUser = await loadAdminUser();
  if (!adminUser.ok) return { ok: false, error: adminUser.error };

  const provider = readProvider(formData);

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const embeddingApiKey = String(formData.get("embeddingApiKey") ?? "").trim();
  const embeddingBaseUrl = String(formData.get("embeddingBaseUrl") ?? "").trim();
  const clearEmbeddingKey = String(formData.get("clearEmbeddingKey") ?? "") === "1";

  const admin = createAdminClient();
  const { data: existingClient } = await admin
    .from("clients")
    .select("llm_api_key")
    .eq("id", adminUser.clientId)
    .single();

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
      .eq("id", adminUser.clientId);
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
  if (!apiKey && !existingClient?.llm_api_key) {
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
  if (provider !== "bedrock" && baseUrl && !baseUrl.startsWith("http")) {
    return { ok: false, error: "Base URL must start with http:// or https://." };
  }
  if (provider === "bedrock" && !baseUrl) {
    return {
      ok: false,
      error: "AWS region is required for Bedrock (e.g. us-east-1).",
    };
  }
  if (embeddingApiKey && embeddingApiKey.length > 500) {
    return { ok: false, error: "Embedding API key looks too long; please check it." };
  }
  if (embeddingBaseUrl && !embeddingBaseUrl.startsWith("http")) {
    return { ok: false, error: "Embedding base URL must start with http:// or https://." };
  }

  type ClientsUpdate = {
    llm_provider: typeof provider;
    llm_api_key?: string;
    llm_base_url: string | null;
    llm_model: string | null;
    llm_embedding_api_key?: string | null;
    llm_embedding_base_url?: string | null;
  };
  const update: ClientsUpdate = {
    llm_provider: provider,
    llm_base_url: baseUrl.length > 0 ? baseUrl : null,
    llm_model: model.length > 0 ? model : null,
  };
  if (apiKey.length > 0) update.llm_api_key = apiKey;

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
    .eq("id", adminUser.clientId);
  if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };

  revalidatePath("/settings");
  revalidatePath("/billing");
  return { ok: true, message: "QA engine provider saved." };
}

export async function testLlmSettings(
  _prev: LlmSettingsState,
  formData: FormData,
): Promise<LlmSettingsState> {
  const adminUser = await loadAdminUser();
  if (!adminUser.ok) return { ok: false, error: adminUser.error };

  const provider = readProvider(formData);
  if (!provider) return { ok: false, error: "Pick a provider first." };

  const admin = createAdminClient();
  const { data: existingClient } = await admin
    .from("clients")
    .select("llm_api_key")
    .eq("id", adminUser.clientId)
    .single();

  const apiKey =
    String(formData.get("apiKey") ?? "").trim() || existingClient?.llm_api_key || "";
  const baseUrl =
    String(formData.get("baseUrl") ?? "").trim() ||
    PROVIDER_INFO[provider].defaultBaseUrl;
  const model =
    String(formData.get("model") ?? "").trim() ||
    PROVIDER_INFO[provider].defaultModel;

  if (!apiKey) return { ok: false, error: "API key is required." };
  if (!model) return { ok: false, error: "Model is required for this provider." };
  if ((provider === "custom" || provider === "azure") && !baseUrl) {
    return { ok: false, error: `${provider} requires a base URL.` };
  }
  if (provider !== "bedrock" && baseUrl && !baseUrl.startsWith("http")) {
    return { ok: false, error: "Base URL must start with http:// or https://." };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || undefined,
      timeout: 30_000,
      maxRetries: 0,
    });
    const resp = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 160,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return only JSON with keys score, confidence, explanation, evidence, sources_used.",
        },
        {
          role: "user",
          content:
            'Return {"score":2,"confidence":0.9,"explanation":"ok","evidence":"","sources_used":[]}.',
        },
      ],
    });
    const content = resp.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const valid =
      (parsed.score === 0 || parsed.score === 1 || parsed.score === 2) &&
      typeof parsed.confidence === "number" &&
      typeof parsed.explanation === "string" &&
      typeof parsed.evidence === "string" &&
      Array.isArray(parsed.sources_used);
    if (!valid) {
      return {
        ok: false,
        error:
          "Provider responded, but not with QAScope scoring JSON. Use a stricter model or provider before scoring.",
      };
    }
    return {
      ok: true,
      message: `Provider test passed for ${model}. Chat and scoring JSON are compatible.`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Provider test failed: ${message}` };
  }
}

function tinySilentWav(): Buffer {
  const sampleRate = 8000;
  const seconds = 1;
  const samples = sampleRate * seconds;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

export async function testVoiceTranscriptionSettings(
  _prev: LlmSettingsState,
  formData: FormData,
): Promise<LlmSettingsState> {
  const adminUser = await loadAdminUser();
  if (!adminUser.ok) return { ok: false, error: adminUser.error };

  const provider = readProvider(formData);
  if (!provider) return { ok: false, error: "Pick a provider first." };
  if (provider === "bedrock") {
    return {
      ok: false,
      error: "Bedrock is not supported for voice transcription in this version.",
    };
  }

  const admin = createAdminClient();
  const { data: existingClient } = await admin
    .from("clients")
    .select("llm_api_key")
    .eq("id", adminUser.clientId)
    .single();

  const apiKey =
    String(formData.get("apiKey") ?? "").trim() || existingClient?.llm_api_key || "";
  const baseUrl =
    String(formData.get("baseUrl") ?? "").trim() ||
    PROVIDER_INFO[provider].defaultBaseUrl;
  const configuredModel =
    String(formData.get("model") ?? "").trim() ||
    PROVIDER_INFO[provider].defaultModel;
  const model =
    provider === "openrouter"
      ? "openai/whisper-large-v3"
      : configuredModel.includes("transcribe") || configuredModel.includes("whisper")
        ? configuredModel
        : "gpt-4o-mini-transcribe";

  if (!apiKey) return { ok: false, error: "API key is required." };
  if (!baseUrl && (provider === "custom" || provider === "azure")) {
    return { ok: false, error: `${provider} requires a base URL.` };
  }

  try {
    if (provider === "openrouter") {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://qascope-sdiz.vercel.app",
          "X-Title": "QAScope",
        },
        body: JSON.stringify({
          input_audio: { data: tinySilentWav().toString("base64"), format: "wav" },
          model,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
      }
      return { ok: true, message: `Voice transcription test passed for ${model}.` };
    }

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || undefined,
      timeout: 30_000,
      maxRetries: 0,
    });
    const file = await OpenAI.toFile(tinySilentWav(), inferAudioFilename("voice-capability", "audio/wav"), {
      type: "audio/wav",
    });
    await client.audio.transcriptions.create({
      model,
      file,
      response_format: "json",
      temperature: 0,
    });

    return {
      ok: true,
      message: `Voice transcription test passed for ${model}.`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Voice transcription test failed: ${message}`,
    };
  }
}
