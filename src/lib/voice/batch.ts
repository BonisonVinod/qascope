import Papa from "papaparse";

export type VoiceCsvRow = {
  rowNumber: number;
  callId: string;
  audioFile: string;
  agentName: string | null;
  customerId: string | null;
  campaign: string | null;
  language: string | null;
  conversationDate: string | null;
};

export type VoiceCsvParseResult =
  | { ok: true; rows: VoiceCsvRow[] }
  | { ok: false; error: string };

const CALL_ID_HEADERS = ["call_id", "external_call_id", "conversation_id", "id"];
const AUDIO_FILE_HEADERS = ["audio_file", "recording_file", "filename", "file_name"];
const AGENT_HEADERS = ["agent_name", "agent", "advisor", "associate"];
const CUSTOMER_HEADERS = ["customer_id", "customer", "phone", "msisdn"];
const CAMPAIGN_HEADERS = ["campaign", "team_name", "team", "lob"];
const LANGUAGE_HEADERS = ["language", "lang"];
const DATE_HEADERS = ["date", "conversation_date", "call_date", "created_at"];

function first(row: Record<string, string>, headers: string[]): string {
  for (const header of headers) {
    const value = row[header]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeVoiceDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

export function parseVoiceCsv(text: string): VoiceCsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s\-]+/g, "_"),
  });

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      error: `CSV parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row ?? "?"})`,
    };
  }

  const rawRows = parsed.data ?? [];
  if (rawRows.length === 0) return { ok: false, error: "CSV has no data rows." };
  if (rawRows.length > 100) {
    return { ok: false, error: "Too many voice rows. Max 100 per batch for now." };
  }

  const rows: VoiceCsvRow[] = [];
  for (const [index, row] of rawRows.entries()) {
    const rowNumber = index + 2;
    const callId = first(row, CALL_ID_HEADERS);
    const audioFile = first(row, AUDIO_FILE_HEADERS);

    if (!callId) return { ok: false, error: `Row ${rowNumber}: call_id is required.` };
    if (!audioFile) return { ok: false, error: `Row ${rowNumber}: audio_file is required.` };

    const rawDate = first(row, DATE_HEADERS);
    rows.push({
      rowNumber,
      callId,
      audioFile,
      agentName: first(row, AGENT_HEADERS) || null,
      customerId: first(row, CUSTOMER_HEADERS) || null,
      campaign: first(row, CAMPAIGN_HEADERS) || null,
      language: first(row, LANGUAGE_HEADERS) || null,
      conversationDate: rawDate ? normalizeVoiceDate(rawDate) ?? rawDate : null,
    });
  }

  return { ok: true, rows };
}

export function buildAudioFileIndex(files: File[]): Map<string, File> {
  const index = new Map<string, File>();
  for (const file of files) {
    index.set(file.name.toLowerCase(), file);
  }
  return index;
}
