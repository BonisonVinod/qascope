export type VoiceAuditSourceType =
  | "dialer"
  | "router"
  | "softphone"
  | "recording_upload";

const VALID_SOURCE_TYPES = new Set<VoiceAuditSourceType>([
  "dialer",
  "router",
  "softphone",
  "recording_upload",
]);

function normalizePayloadSourceType(value: unknown): VoiceAuditSourceType {
  return VALID_SOURCE_TYPES.has(value as VoiceAuditSourceType)
    ? (value as VoiceAuditSourceType)
    : "dialer";
}

export type VoicePayloadFields = {
  externalCallId: string | null;
  sourceType: VoiceAuditSourceType;
  sourceSystem: string | null;
  recordingUrl: string | null;
  agentName: string | null;
  customerId: string | null;
  campaign: string | null;
  durationSeconds: number | null;
  language: string | null;
  conversationDate: string | null;
  metadata: Record<string, unknown>;
};

function numericOrNull(value: unknown): number | null {
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstString(body: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(body: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = numericOrNull(body[key]);
    if (value !== null) return value;
  }
  return null;
}

export function normalizeVoicePayload(body: Record<string, unknown>): VoicePayloadFields {
  return {
    externalCallId: firstString(body, [
      "external_call_id",
      "externalCallId",
      "call_id",
      "callId",
      "CallSid",
      "callSid",
      "uuid",
      "external_id",
      "externalId",
    ]),
    sourceType: normalizePayloadSourceType(firstString(body, ["source_type", "sourceType"])),
    sourceSystem: firstString(body, ["source_system", "sourceSystem", "provider", "dialer"]),
    recordingUrl: firstString(body, [
      "recording_url",
      "recordingUrl",
      "RecordingUrl",
      "recording_link",
      "recordingLink",
      "call_recording_url",
      "callRecordingUrl",
      "audio_url",
      "audioUrl",
      "url",
    ]),
    agentName: firstString(body, ["agent_name", "agentName", "AgentName", "agent", "advisor"]),
    customerId: firstString(body, ["customer_id", "customerId", "CustomerId", "customer", "phone", "msisdn"]),
    campaign: firstString(body, ["campaign", "team_name", "teamName", "team", "queue", "skill"]),
    durationSeconds: firstNumber(body, [
      "duration_seconds",
      "durationSeconds",
      "call_duration_seconds",
      "callDurationSeconds",
      "duration",
      "CallDuration",
    ]),
    language: firstString(body, ["language", "lang"]),
    conversationDate: firstString(body, ["conversation_date", "conversationDate", "call_date", "callDate", "date"]),
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {},
  };
}
