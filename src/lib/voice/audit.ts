import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreConversation } from "@/lib/scoring/score-conversation";
import { downloadAudioFromUrl, type DownloadedAudio } from "./download";
import {
  normalizeSourceType,
  parseConversationDate,
  type VoiceAuditSourceType,
} from "./metadata";
import { normalizeVoicePayload } from "./payload";
import { inferAudioFilename, transcribeAudio, type AudioInput } from "./transcription";

type SB = SupabaseClient<Database>;
type VoiceJob = Database["public"]["Tables"]["voice_audit_jobs"]["Row"];
const VOICE_BUCKET = "voice-recordings";

export type VoiceAuditRequest = {
  tokenId?: string | null;
  clientId: string;
  externalCallId?: string | null;
  sourceType: VoiceAuditSourceType;
  sourceSystem?: string | null;
  recordingUrl?: string | null;
  audio?: AudioInput | null;
  agentName?: string | null;
  customerId?: string | null;
  campaign?: string | null;
  durationSeconds?: number | null;
  language?: string | null;
  conversationDate?: string | null;
  metadata?: Record<string, unknown>;
};

export type VoiceAuditResult =
  | { ok: true; jobId: string; status: string; message: string }
  | { ok: false; jobId?: string; error: string };

async function addEvent(
  supabase: SB,
  job: Pick<VoiceJob, "id" | "client_id">,
  eventType: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  await supabase.from("voice_audit_events").insert({
    job_id: job.id,
    client_id: job.client_id,
    event_type: eventType,
    message,
    details_json: details,
  });
}

async function uploadAudio(supabase: SB, clientId: string, audio: AudioInput) {
  const filename = inferAudioFilename(audio.filename, audio.contentType);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${clientId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(VOICE_BUCKET).upload(storagePath, audio.bytes, {
    contentType: audio.contentType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Failed to securely store recording: ${error.message}`);
  return { storagePath, filename };
}

export async function enqueueVoiceAudit(request: VoiceAuditRequest): Promise<VoiceAuditResult> {
  const supabase = createAdminClient();
  let stored: { storagePath: string; filename: string } | null = null;

  try {
    if (!request.audio && !request.recordingUrl) {
      throw new Error("Provide either recording_url or an audio file.");
    }
    if (request.audio) stored = await uploadAudio(supabase, request.clientId, request.audio);

    const { data, error } = await supabase
      .from("voice_audit_jobs")
      .insert({
        client_id: request.clientId,
        webhook_token_id: request.tokenId ?? null,
        external_call_id: request.externalCallId ?? null,
        source_type: request.sourceType,
        source_system: request.sourceSystem ?? null,
        recording_url: request.recordingUrl ?? null,
        storage_path: stored?.storagePath ?? null,
        audio_filename: stored?.filename ?? (request.audio ? inferAudioFilename(request.audio.filename, request.audio.contentType) : null),
        audio_content_type: request.audio?.contentType ?? null,
        audio_size_bytes: request.audio?.bytes.byteLength ?? null,
        duration_seconds: request.durationSeconds ?? null,
        language: request.language ?? null,
        status: "queued",
        metadata_json: {
          ...(request.metadata ?? {}),
          agent_name: request.agentName ?? null,
          customer_id: request.customerId ?? null,
          campaign: request.campaign ?? null,
          conversation_date: request.conversationDate ?? null,
        },
      })
      .select("id, client_id")
      .single();

    if (error || !data) {
      if (stored) await supabase.storage.from(VOICE_BUCKET).remove([stored.storagePath]);
      const duplicate = error?.code === "23505";
      throw new Error(
        duplicate
          ? "A voice audit already exists for this external_call_id."
          : `Failed to queue voice audit: ${error?.message}`,
      );
    }

    await addEvent(supabase, data, "queued", "Recording accepted and queued for processing.");
    return {
      ok: true,
      jobId: data.id,
      status: "queued",
      message: "Recording accepted. QAScope will transcribe and audit it in the background.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function resolveAgentId(supabase: SB, clientId: string, agentName?: string | null) {
  if (!agentName?.trim()) return null;
  const { data } = await supabase
    .from("agents")
    .select("id")
    .eq("client_id", clientId)
    .ilike("agent_name", agentName.trim())
    .maybeSingle();
  return data?.id ?? null;
}

function requestFromJob(job: VoiceJob): VoiceAuditRequest {
  const metadata = job.metadata_json && typeof job.metadata_json === "object" ? job.metadata_json : {};
  return {
    clientId: job.client_id,
    tokenId: job.webhook_token_id,
    externalCallId: job.external_call_id,
    sourceType: normalizeSourceType(job.source_type),
    sourceSystem: job.source_system,
    recordingUrl: job.recording_url,
    agentName: typeof metadata.agent_name === "string" ? metadata.agent_name : null,
    customerId: typeof metadata.customer_id === "string" ? metadata.customer_id : null,
    campaign: typeof metadata.campaign === "string" ? metadata.campaign : null,
    conversationDate: typeof metadata.conversation_date === "string" ? metadata.conversation_date : null,
    durationSeconds: job.duration_seconds,
    language: job.language,
    metadata,
  };
}

async function loadAudio(supabase: SB, job: VoiceJob): Promise<DownloadedAudio | AudioInput> {
  if (job.storage_path) {
    const { data, error } = await supabase.storage.from(VOICE_BUCKET).download(job.storage_path);
    if (error || !data) throw new Error(`Stored recording could not be downloaded: ${error?.message}`);
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      filename: job.audio_filename ?? "recording",
      contentType: job.audio_content_type,
      sizeBytes: data.size,
    };
  }
  if (!job.recording_url) throw new Error("No recording is available for this voice audit.");
  return downloadAudioFromUrl(job.recording_url);
}

async function completeJob(supabase: SB, job: VoiceJob, transcript: string, model: string) {
  const request = requestFromJob(job);
  let conversationId = job.conversation_id;
  if (!conversationId) {
    const agentId = await resolveAgentId(supabase, job.client_id, request.agentName);
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        client_id: job.client_id,
        agent_id: agentId,
        channel: "voice_transcript",
        transcript_text: transcript,
        conversation_date: parseConversationDate(request.conversationDate),
        customer_id: request.customerId ?? null,
        external_conversation_id: job.external_call_id,
        metadata_json: {
          ...request.metadata,
          voice_audit_job_id: job.id,
          voice_source_type: job.source_type,
          voice_source_system: job.source_system,
          campaign: request.campaign,
          duration_seconds: job.duration_seconds,
          language: job.language,
          transcription_model: model,
        },
      })
      .select("id")
      .single();
    if (error || !conversation) throw new Error(`Failed to create conversation: ${error?.message}`);
    conversationId = conversation.id;
  }

  await supabase.from("voice_audit_jobs").update({
    status: "scoring",
    conversation_id: conversationId,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  await addEvent(supabase, job, "scoring_started", "Transcript sent to the QA scoring engine.");

  const score = await scoreConversation(supabase, conversationId);
  if (!score.ok) throw new Error(`Scoring failed: ${score.error}`);

  await supabase.from("voice_audit_jobs").update({
    status: "completed",
    scored_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    locked_at: null,
    locked_by: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  await addEvent(supabase, job, "completed", "Voice audit completed.", {
    total_score: score.totalScore,
    qa_score_id: score.qaScoreId,
  });
}

async function processClaimedJob(supabase: SB, job: VoiceJob) {
  try {
    await addEvent(supabase, job, "processing_started", `Processing attempt ${job.attempt_count}.`);
    let transcript = job.transcript_text;
    let model = job.transcription_model;
    if (!transcript || !model) {
      const audio = await loadAudio(supabase, job);
      const transcription = await transcribeAudio(audio, { supabase, clientId: job.client_id });
      transcript = transcription.transcript;
      model = transcription.model;
      await supabase.from("voice_audit_jobs").update({
        status: "transcribed",
        transcript_text: transcript,
        transcription_model: model,
        transcription_metadata: transcription.metadata,
        transcribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      await addEvent(supabase, job, "transcribed", "Recording transcription completed.");
    }
    await completeJob(supabase, job, transcript, model);
    return { jobId: job.id, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = job.attempt_count >= job.max_attempts;
    const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attempt_count - 1));
    await supabase.from("voice_audit_jobs").update({
      status: exhausted ? "failed" : "retrying",
      error_message: message.slice(0, 2000),
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    await addEvent(
      supabase,
      job,
      exhausted ? "failed" : "retry_scheduled",
      exhausted ? "Voice audit failed after all retry attempts." : `Temporary failure. Retrying in ${delayMinutes} minute(s).`,
      { error: message, attempt: job.attempt_count },
    );
    return { jobId: job.id, ok: false, error: message };
  }
}

export async function processQueuedVoiceAudits(limit = 5) {
  const supabase = createAdminClient();
  const workerId = `voice-worker-${crypto.randomUUID()}`;
  const { data: jobs, error } = await supabase.rpc("claim_voice_audit_jobs", {
    p_worker_id: workerId,
    p_limit: limit,
  });
  if (error) throw new Error(`Could not claim voice jobs: ${error.message}`);
  const settled = await Promise.allSettled(
    (jobs ?? []).map((job) => processClaimedJob(supabase, job)),
  );
  return settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { jobId: undefined as string | undefined, ok: false, error: String(r.reason) },
  );
}

export async function cleanupExpiredVoiceRecordings(limit = 100) {
  const supabase = createAdminClient();
  const { data: jobs, error } = await supabase
    .from("voice_audit_jobs")
    .select("id, client_id, storage_path")
    .lte("recording_delete_after", new Date().toISOString())
    .or("storage_path.not.is.null,recording_url.not.is.null")
    .limit(limit);
  if (error) throw new Error(`Could not find expired recordings: ${error.message}`);

  for (const job of jobs ?? []) {
    if (job.storage_path) await supabase.storage.from(VOICE_BUCKET).remove([job.storage_path]);
    await supabase.from("voice_audit_jobs").update({
      storage_path: null,
      recording_url: null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    await addEvent(supabase, job, "recording_deleted", "Recording deleted after the 30-day retention period.");
  }
  return jobs?.length ?? 0;
}

export async function retryVoiceAuditJob(jobId: string, clientId: string): Promise<VoiceAuditResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("voice_audit_jobs")
    .update({
      status: "queued",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("client_id", clientId)
    .eq("status", "failed")
    .select("id, client_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Failed voice job not found." };
  await addEvent(supabase, data, "manually_requeued", "Voice audit manually queued for another attempt.");
  return { ok: true, jobId, status: "queued", message: "Voice audit queued for retry." };
}

export function buildVoiceAuditRequestFromJson(
  body: Record<string, unknown>,
  tokenId: string,
  clientId: string,
): VoiceAuditRequest {
  const normalized = normalizeVoicePayload(body);
  return {
    tokenId,
    clientId,
    externalCallId: normalized.externalCallId,
    sourceType: normalized.sourceType,
    sourceSystem: normalized.sourceSystem,
    recordingUrl: normalized.recordingUrl,
    agentName: normalized.agentName,
    customerId: normalized.customerId,
    campaign: normalized.campaign,
    durationSeconds: normalized.durationSeconds,
    language: normalized.language,
    conversationDate: normalized.conversationDate,
    metadata: normalized.metadata,
  };
}

export const processVoiceAudit = enqueueVoiceAudit;
