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

export function normalizeSourceType(value: unknown): VoiceAuditSourceType {
  return VALID_SOURCE_TYPES.has(value as VoiceAuditSourceType)
    ? (value as VoiceAuditSourceType)
    : "dialer";
}

export function parseConversationDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);
}

