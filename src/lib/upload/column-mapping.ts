import type { ChannelType } from "@/lib/database.types";

/**
 * Canonical fields QAScope needs from any CSV. The caller provides a
 * ColumnMapping that says, for each canonical field, which CSV header
 * carries the value (or, for channel/date, a fixed value to apply to
 * every row).
 */
export type CanonicalField =
  | "conversation_id"
  | "agent_name"
  | "team_name"
  | "channel"
  | "transcript_text"
  | "conversation_date"
  | "customer_id";

export type ColumnMapping = {
  /** CSV header name; "" means not mapped. */
  conversation_id: string;
  agent_name: string;
  team_name: string;
  channel: string;
  transcript_text: string;
  conversation_date: string;
  customer_id: string;
  /** Used when channel column is "" — applied to every row. */
  fixedChannel?: ChannelType;
  /** Used when conversation_date column is "" — applied to every row, ISO YYYY-MM-DD. */
  fixedDate?: string;
};

/** Heuristics for auto-detecting which CSV header maps to which canonical field. */
const FIELD_PATTERNS: Record<CanonicalField, RegExp[]> = {
  conversation_id: [
    /^conversation_?id$/,
    /^conv_?id$/,
    /^interaction_?id$/,
    /^case_?id$/,
    /^ticket_?id$/,
    /^call_?id$/,
    /^id$/,
  ],
  agent_name: [
    /^agent_?name$/,
    /^agent$/,
    /^rep_?name$/,
    /^rep$/,
    /^advisor$/,
    /^associate$/,
    /^csr$/,
  ],
  team_name: [
    /^team_?name$/,
    /^team$/,
    /^queue$/,
    /^lob$/,
    /^line_?of_?business$/,
    /^skill$/,
    /^skill_?group$/,
    /^campaign$/,
  ],
  channel: [
    /^channel$/,
    /^channel_?type$/,
    /^media$/,
    /^media_?type$/,
    /^source$/,
    /^contact_?type$/,
    /^interaction_?type$/,
  ],
  transcript_text: [
    /^transcript$/,
    /^transcript_?text$/,
    /^conversation$/,
    /^body$/,
    /^text$/,
    /^content$/,
    /^message$/,
    /^dialog$/,
    /^dialogue$/,
  ],
  conversation_date: [
    /^conversation_?date$/,
    /^date$/,
    /^call_?date$/,
    /^contact_?date$/,
    /^created_?at$/,
    /^timestamp$/,
    /^when$/,
    /^start_?time$/,
  ],
  customer_id: [
    /^customer_?id$/,
    /^customer$/,
    /^caller_?id$/,
    /^msisdn$/,
    /^phone$/,
    /^email$/,
    /^account_?id$/,
  ],
};

/**
 * Given a list of CSV headers, suggest a default mapping by matching against
 * the regex patterns above. Headers are compared case-insensitively, with
 * spaces/hyphens normalised to underscores. Returns the first match per field.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const norm = (h: string) =>
    h.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
  const candidates = headers.map((h) => ({ orig: h, norm: norm(h) }));

  const pickFor = (field: CanonicalField): string => {
    for (const pat of FIELD_PATTERNS[field]) {
      const hit = candidates.find((c) => pat.test(c.norm));
      if (hit) return hit.orig;
    }
    return "";
  };

  return {
    conversation_id: pickFor("conversation_id"),
    agent_name: pickFor("agent_name"),
    team_name: pickFor("team_name"),
    channel: pickFor("channel"),
    transcript_text: pickFor("transcript_text"),
    conversation_date: pickFor("conversation_date"),
    customer_id: pickFor("customer_id"),
  };
}

/**
 * Convert a free-form channel value into the canonical enum. Returns null
 * if the value can't be mapped — caller surfaces a row-level error.
 */
export function normalizeChannel(raw: unknown): ChannelType | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v.length === 0) return null;
  if (
    v === "voice" ||
    v === "voice_transcript" ||
    v === "call" ||
    v === "phone" ||
    v === "phone_call" ||
    v === "transcript" ||
    v === "voice call"
  ) {
    return "voice_transcript";
  }
  if (v === "email" || v === "mail" || v === "e-mail") return "email";
  if (v === "chat" || v === "live_chat" || v === "live chat" || v === "im") {
    return "chat";
  }
  return null;
}

/**
 * Convert various date formats into the canonical YYYY-MM-DD string.
 * Returns null if not parseable.
 */
export function normalizeDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  // Already canonical?
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // ISO with time?
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // mm/dd/yyyy ambiguous — try parsing via Date as a last resort
  const t = Date.parse(v);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

export type MappingValidation =
  | { ok: true }
  | { ok: false; missing: CanonicalField[]; reasons: string[] };

/**
 * Confirm that the mapping is sufficient to ingest the CSV. agent_name and
 * transcript_text MUST be mapped to a column. channel and conversation_date
 * either must be mapped or have a fixed value. The rest are optional.
 */
export function validateMapping(m: ColumnMapping): MappingValidation {
  const missing: CanonicalField[] = [];
  const reasons: string[] = [];
  if (!m.agent_name) {
    missing.push("agent_name");
    reasons.push("agent_name must map to a CSV column.");
  }
  if (!m.transcript_text) {
    missing.push("transcript_text");
    reasons.push("transcript_text must map to a CSV column.");
  }
  if (!m.channel && !m.fixedChannel) {
    missing.push("channel");
    reasons.push(
      "channel must either map to a CSV column or have a fixed value (voice / email / chat).",
    );
  }
  if (!m.conversation_date && !m.fixedDate) {
    missing.push("conversation_date");
    reasons.push(
      "conversation_date must either map to a CSV column or have a fixed value (YYYY-MM-DD).",
    );
  }
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing, reasons };
}
