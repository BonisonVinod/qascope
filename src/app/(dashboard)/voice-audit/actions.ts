"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  processVoiceAudit,
  retryVoiceAuditJob,
  type VoiceAuditResult,
} from "@/lib/voice/audit";
import { inferAudioFilename } from "@/lib/voice/transcription";
import { buildAudioFileIndex, parseVoiceCsv } from "@/lib/voice/batch";

export type VoiceAuditState =
  | undefined
  | (VoiceAuditResult & { mode?: "recording_url" | "upload" })
  | {
      ok: true;
      mode: "sample";
      jobId: "sample";
      conversationId: string;
      qaScoreId: string;
      totalScore: number;
      status: string;
    };

export type BulkVoiceAuditState =
  | undefined
  | {
      ok: true;
      totalRows: number;
      successCount: number;
      failCount: number;
      errors: { row: number; callId?: string; message: string }[];
    }
  | { ok: false; error: string };

const SAMPLE_TRANSCRIPT = `Agent: Good morning, this is Rahul from FastCash Finance. Am I speaking with Priya Sharma?
Customer: Yes, speaking.
Agent: I am calling about your overdue loan payment of 45500 rupees. Before we continue, can you please confirm your registered mobile number ending with 2198?
Customer: Yes, that is correct.
Agent: Thank you. Your payment is overdue by 12 days. I can help you understand the pending amount and payment options. I cannot offer any unauthorized discount, but I can explain the official late fee policy.
Customer: Can I pay tomorrow?
Agent: Yes, you can pay tomorrow through the official payment link. Please do not share OTP or card PIN with anyone. I will also send the details by SMS.
Customer: Okay.
Agent: Thank you for your time. Is there anything else I can help you with today?`;

async function getWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, clientId: null as string | null, error: "Not signed in." };

  const { data: appUser, error } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();

  if (error || !appUser) {
    return { supabase, clientId: null, error: "Could not load your workspace." };
  }

  return { supabase, clientId: appUser.client_id, error: null };
}

function value(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function auditVoiceRecording(
  _previous: VoiceAuditState,
  formData: FormData,
): Promise<VoiceAuditState> {
  const { supabase, clientId, error } = await getWorkspace();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  const mode = value(formData, "mode") ?? "recording_url";
  const common = {
    clientId,
    externalCallId: value(formData, "external_call_id") ?? `manual-${crypto.randomUUID()}`,
    sourceSystem: value(formData, "source_system") ?? "manual-test",
    agentName: value(formData, "agent_name"),
    customerId: value(formData, "customer_id"),
    campaign: value(formData, "campaign"),
    durationSeconds: null,
    language: value(formData, "language"),
    conversationDate: value(formData, "conversation_date"),
    metadata: { submitted_from: "voice_audit_ui" },
  };

  if (mode === "sample") {
    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        client_id: clientId,
        channel: "voice_transcript",
        transcript_text: SAMPLE_TRANSCRIPT,
        conversation_date: new Date().toISOString().slice(0, 10),
        customer_id: "SAMPLE-CUSTOMER",
        external_conversation_id: `sample-voice-${crypto.randomUUID()}`,
        metadata_json: {
          voice_source_type: "sample",
          submitted_from: "voice_audit_ui",
        },
      })
      .select("id")
      .single();

    if (insertError || !conversation) {
      return { ok: false, error: `Failed to create sample: ${insertError?.message}` };
    }

    const { scoreConversation } = await import("@/lib/scoring/score-conversation");
    const scored = await scoreConversation(supabase, conversation.id);
    if (!scored.ok) return { ok: false, error: scored.error };

    revalidatePath("/voice-audit");
    revalidatePath("/results");
    revalidatePath("/review-queue");
    revalidatePath("/dashboard");

    return {
      ok: true,
      mode: "sample",
      jobId: "sample",
      conversationId: conversation.id,
      qaScoreId: scored.qaScoreId,
      totalScore: scored.totalScore,
      status: scored.status,
    };
  }

  if (mode === "upload") {
    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an audio recording file first." };
    }

    const result = await processVoiceAudit({
      ...common,
      sourceType: "recording_upload",
      audio: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        filename: inferAudioFilename(file.name, file.type),
        contentType: file.type || null,
      },
    });

    revalidatePath("/voice-audit");
    revalidatePath("/results");
    revalidatePath("/review-queue");
    revalidatePath("/dashboard");
    return { ...result, mode: "upload" };
  }

  const recordingUrl = value(formData, "recording_url");
  if (!recordingUrl) return { ok: false, error: "Paste a recording URL or choose Upload/Sample." };

  const result = await processVoiceAudit({
    ...common,
    sourceType: "dialer",
    sourceSystem: common.sourceSystem ?? "recording-url-test",
    recordingUrl,
  });

  revalidatePath("/voice-audit");
  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");
  return { ...result, mode: "recording_url" };
}

export async function retryVoiceAudit(
  formData: FormData,
): Promise<void> {
  const { clientId, error } = await getWorkspace();
  if (error || !clientId) return;

  const jobId = value(formData, "job_id");
  if (!jobId) return;

  await retryVoiceAuditJob(jobId, clientId);

  revalidatePath("/voice-audit");
  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");
}

export async function bulkAuditVoiceRecordings(
  _previous: BulkVoiceAuditState,
  formData: FormData,
): Promise<BulkVoiceAuditState> {
  const { clientId, error } = await getWorkspace();
  if (error || !clientId) return { ok: false, error: error ?? "Unknown error" };

  const csv = formData.get("metadata_csv");
  if (!(csv instanceof File) || csv.size === 0) {
    return { ok: false, error: "Choose a metadata CSV file." };
  }
  if (csv.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Metadata CSV is too large. Max 2 MB." };
  }

  const audioFiles = formData
    .getAll("audio_files")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (audioFiles.length === 0) {
    return { ok: false, error: "Choose at least one audio recording." };
  }
  if (audioFiles.length > 100) {
    return { ok: false, error: "Too many audio files. Max 100 per batch for now." };
  }

  const parsed = parseVoiceCsv(await csv.text());
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const fileByName = buildAudioFileIndex(audioFiles);
  const errors: { row: number; callId?: string; message: string }[] = [];
  let successCount = 0;

  for (const row of parsed.rows) {
    const audio = fileByName.get(row.audioFile.toLowerCase());
    if (!audio) {
      errors.push({
        row: row.rowNumber,
        callId: row.callId,
        message: `No uploaded audio file named ${row.audioFile}.`,
      });
      continue;
    }

    const result = await processVoiceAudit({
      clientId,
      externalCallId: row.callId,
      sourceType: "recording_upload",
      sourceSystem: "bulk-upload",
      agentName: row.agentName,
      customerId: row.customerId,
      campaign: row.campaign,
      language: row.language,
      conversationDate: row.conversationDate,
      metadata: {
        submitted_from: "bulk_voice_upload",
        csv_row: row.rowNumber,
        audio_file: row.audioFile,
      },
      audio: {
        bytes: new Uint8Array(await audio.arrayBuffer()),
        filename: inferAudioFilename(audio.name, audio.type),
        contentType: audio.type || null,
      },
    });

    if (result.ok) {
      successCount += 1;
    } else {
      errors.push({
        row: row.rowNumber,
        callId: row.callId,
        message: result.error,
      });
    }
  }

  revalidatePath("/voice-audit");
  revalidatePath("/results");
  revalidatePath("/review-queue");
  revalidatePath("/dashboard");

  return {
    ok: true,
    totalRows: parsed.rows.length,
    successCount,
    failCount: errors.length,
    errors: errors.slice(0, 50),
  };
}
