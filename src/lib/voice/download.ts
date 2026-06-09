const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^\[?::1\]?$/i,
];

export type DownloadedAudio = {
  bytes: Uint8Array;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
};

function assertDownloadableUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("recording_url must be a valid URL.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("recording_url must use http or https.");
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error("recording_url cannot point to localhost or a private network address.");
  }

  return parsed;
}

function filenameFromUrl(url: URL): string {
  const name = url.pathname.split("/").filter(Boolean).pop();
  return name ? decodeURIComponent(name) : "recording";
}

export async function downloadAudioFromUrl(rawUrl: string): Promise<DownloadedAudio> {
  const url = assertDownloadableUrl(rawUrl);
  const response = await fetch(url, {
    headers: { Accept: "audio/*,video/mp4,video/webm,application/octet-stream" },
  });

  if (!response.ok) {
    throw new Error(`Recording download failed with HTTP ${response.status}.`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_AUDIO_BYTES) {
    throw new Error("Recording is too large. Maximum supported size is 100 MB.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Recording is too large. Maximum supported size is 100 MB.");
  }

  return {
    bytes: new Uint8Array(buffer),
    filename: filenameFromUrl(url),
    contentType,
    sizeBytes: buffer.byteLength,
  };
}

