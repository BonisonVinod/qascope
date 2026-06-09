import test from "node:test";
import assert from "node:assert/strict";
import {
  inferAudioFilename,
  isSupportedAudioFilename,
  normalizeTranscriptResponse,
} from "../src/lib/voice/transcription-utils.ts";
import { normalizeSourceType, parseConversationDate } from "../src/lib/voice/metadata.ts";
import { downloadAudioFromUrl } from "../src/lib/voice/download.ts";
import { parseVoiceCsv } from "../src/lib/voice/batch.ts";
import { normalizeVoicePayload } from "../src/lib/voice/payload.ts";
import {
  createVoiceWebhookSignature,
  verifyVoiceWebhookSignature,
} from "../src/lib/voice/webhook-security.ts";

test("voice transcription: infers supported filename from content type", () => {
  assert.equal(inferAudioFilename("call-recording", "audio/webm"), "call-recording.webm");
  assert.equal(inferAudioFilename("call.wav", "audio/mpeg"), "call.wav");
  assert.equal(isSupportedAudioFilename("call.exe"), false);
  assert.equal(isSupportedAudioFilename("call.mp3"), true);
});

test("voice transcription: normalizes diarized speaker segments", () => {
  const normalized = normalizeTranscriptResponse({
    text: "Hello I need help",
    duration: 12,
    segments: [
      { speaker: "Agent", start: 0, end: 3, text: "Good morning, how may I help?" },
      { speaker: "Customer", start: 4, end: 8, text: "I need help with my loan." },
    ],
    usage: { type: "duration", seconds: 12 },
  });

  assert.equal(
    normalized.transcript,
    "Agent: Good morning, how may I help?\nCustomer: I need help with my loan.",
  );
  assert.equal(normalized.metadata.duration, 12);
});

test("voice audit: defaults unknown source/date safely", () => {
  assert.equal(normalizeSourceType("softphone"), "softphone");
  assert.equal(normalizeSourceType("unknown"), "dialer");
  assert.equal(parseConversationDate("2026-05-31"), "2026-05-31");
  assert.match(parseConversationDate("31-05-2026"), /^\d{4}-\d{2}-\d{2}$/);
});

test("voice download: blocks private localhost recording URLs before fetch", async () => {
  await assert.rejects(
    () => downloadAudioFromUrl("http://127.0.0.1/private.wav"),
    /private network/,
  );
});

test("voice batch: parses required CSV fields and optional metadata", () => {
  const parsed = parseVoiceCsv(
    "call_id,audio_file,agent_name,customer_id,campaign,language,date\nCALL1,CALL1.mp3,Rahul,CUST1,Sales,en,03/06/2026",
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.rows[0].callId, "CALL1");
  assert.equal(parsed.rows[0].audioFile, "CALL1.mp3");
  assert.equal(parsed.rows[0].conversationDate, "2026-06-03");
});

test("voice batch: rejects missing audio_file", () => {
  const parsed = parseVoiceCsv("call_id,agent_name\nCALL1,Rahul");
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /audio_file/);
});

test("voice webhook: accepts common dialer payload aliases", () => {
  const request = normalizeVoicePayload(
    {
      CallSid: "CA123",
      RecordingUrl: "https://dialer.example/CA123.mp3",
      AgentName: "Rahul",
      CustomerId: "CUST1",
      CallDuration: "92",
      sourceSystem: "twilio",
    },
  );

  assert.equal(request.externalCallId, "CA123");
  assert.equal(request.recordingUrl, "https://dialer.example/CA123.mp3");
  assert.equal(request.agentName, "Rahul");
  assert.equal(request.customerId, "CUST1");
  assert.equal(request.durationSeconds, 92);
  assert.equal(request.sourceSystem, "twilio");
});

test("voice webhook: verifies signed requests and rejects stale replays", () => {
  const timestamp = "1780626600";
  const rawBody = '{"call_id":"CALL1"}';
  const signature = createVoiceWebhookSignature("secret", timestamp, rawBody);

  assert.deepEqual(
    verifyVoiceWebhookSignature({
      secret: "secret",
      timestamp,
      signature,
      rawBody,
      nowMs: Number(timestamp) * 1000,
    }),
    { ok: true },
  );
  assert.equal(
    verifyVoiceWebhookSignature({
      secret: "secret",
      timestamp,
      signature,
      rawBody,
      nowMs: (Number(timestamp) + 301) * 1000,
    }).ok,
    false,
  );
});
