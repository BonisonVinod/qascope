const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "ogg",
  "wav",
  "webm",
]);

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mpga": "mpga",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function inferAudioFilename(
  rawName: string | null | undefined,
  contentType: string | null | undefined,
): string {
  const name = rawName?.trim() || "recording";
  const clean = name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "recording";
  const ext = clean.includes(".") ? clean.split(".").pop()?.toLowerCase() : null;
  if (ext && SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return clean;

  const fromType = contentType ? CONTENT_TYPE_EXTENSION[contentType.toLowerCase()] : null;
  return `${clean}.${fromType ?? "mp3"}`;
}

export function isSupportedAudioFilename(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return Boolean(ext && SUPPORTED_AUDIO_EXTENSIONS.has(ext));
}

export function normalizeTranscriptResponse(response: unknown): {
  transcript: string;
  metadata: Record<string, unknown>;
} {
  if (typeof response === "string") {
    return { transcript: response.trim(), metadata: {} };
  }
  if (!response || typeof response !== "object") {
    return { transcript: "", metadata: {} };
  }

  const obj = response as {
    text?: unknown;
    duration?: unknown;
    segments?: Array<{ speaker?: unknown; text?: unknown; start?: unknown; end?: unknown }>;
    usage?: unknown;
  };

  if (Array.isArray(obj.segments) && obj.segments.length > 0) {
    const transcript = obj.segments
      .map((segment) => {
        const speaker = typeof segment.speaker === "string" ? segment.speaker : "Speaker";
        const text = typeof segment.text === "string" ? segment.text.trim() : "";
        return text ? `${speaker}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");

    return {
      transcript,
      metadata: {
        duration: obj.duration,
        segments: obj.segments.map((segment) => ({
          speaker: segment.speaker,
          start: segment.start,
          end: segment.end,
          text: segment.text,
        })),
        usage: obj.usage,
      },
    };
  }

  const transcript = typeof obj.text === "string" ? obj.text.trim() : "";
  return {
    transcript,
    metadata: {
      duration: obj.duration,
      usage: obj.usage,
    },
  };
}

