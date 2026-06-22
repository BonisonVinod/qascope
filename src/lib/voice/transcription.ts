import OpenAI, { toFile } from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { resolveLlmConfig } from "@/lib/llm/client";
import {
  inferAudioFilename,
  isSupportedAudioFilename,
  normalizeTranscriptResponse,
} from "./transcription-utils";
export {
  inferAudioFilename,
  isSupportedAudioFilename,
  normalizeTranscriptResponse,
} from "./transcription-utils";

export type AudioInput = {
  bytes: Uint8Array;
  filename: string;
  contentType?: string | null;
};

export type TranscriptionResult = {
  transcript: string;
  model: string;
  metadata: Record<string, unknown>;
};

export type TranscriptionContext = {
  supabase: SupabaseClient<Database>;
  clientId: string;
};

function transcriptionModelFromWorkspaceModel(model: string): string {
  const configured = process.env.QASCOPE_TRANSCRIPTION_MODEL;
  if (configured) return configured;
  if (model.includes("transcribe") || model.includes("whisper")) return model;
  return "whisper-1";
}

function audioFormat(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "wav";
}

async function transcribeWithOpenRouter(
  input: AudioInput,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<unknown> {
  const filename = inferAudioFilename(input.filename, input.contentType);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://qascope-sdiz.vercel.app",
      "X-Title": "QAScope",
    },
    body: JSON.stringify({
      input_audio: {
        data: Buffer.from(input.bytes).toString("base64"),
        format: audioFormat(filename),
      },
      model,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error =
      typeof body.error === "object" && body.error && "message" in body.error
        ? String((body.error as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(`OpenRouter transcription failed: ${error}`);
  }
  return body;
}

export async function transcribeAudio(
  input: AudioInput,
  context: TranscriptionContext,
): Promise<TranscriptionResult> {
  const workspaceConfig = await resolveLlmConfig(context.supabase, context.clientId);
  if (!workspaceConfig) {
    throw new Error(
      "QA engine API key is not configured. Add it once in Settings before auditing voice calls.",
    );
  }


  const filename = inferAudioFilename(input.filename, input.contentType);
  if (!isSupportedAudioFilename(filename)) {
    throw new Error("Unsupported audio format. Use flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.");
  }

  const model =
    workspaceConfig.provider === "openrouter"
      ? process.env.QASCOPE_TRANSCRIPTION_MODEL || "openai/whisper-large-v3"
      : transcriptionModelFromWorkspaceModel(workspaceConfig.model);
  let response: unknown;
  if (workspaceConfig.provider === "openrouter") {
    response = await transcribeWithOpenRouter(
      input,
      workspaceConfig.apiKey,
      workspaceConfig.baseUrl,
      model,
    );
  } else {
    const client = new OpenAI({
      apiKey: workspaceConfig.apiKey,
      baseURL: workspaceConfig.baseUrl || undefined,
    });
    const file = await toFile(Buffer.from(input.bytes), filename, {
      type: input.contentType || undefined,
    });
    response = model.includes("diarize")
      ? await client.audio.transcriptions.create({
          file,
          model,
          temperature: 0,
          response_format: "diarized_json",
          chunking_strategy: "auto",
        })
      : await client.audio.transcriptions.create({
          file,
          model,
          temperature: 0,
          prompt:
            "Customer support, sales, or collections call. Preserve important numbers, names, commitments, dates, and compliance disclosures.",
          response_format: "json",
        });
  }

  const normalized = normalizeTranscriptResponse(response);
  if (normalized.transcript.length < 10) {
    throw new Error("Transcription returned too little text to audit.");
  }

  return {
    transcript: normalized.transcript,
    model,
    metadata: normalized.metadata,
  };
}
