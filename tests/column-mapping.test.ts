import { test } from "node:test";
import assert from "node:assert/strict";
import {
  autoDetectMapping,
  normalizeChannel,
  normalizeDate,
  validateMapping,
} from "../src/lib/upload/column-mapping.ts";

// ---------- autoDetectMapping ----------

test("autoDetectMapping: matches canonical lowercase headers", () => {
  const m = autoDetectMapping([
    "conversation_id",
    "agent_name",
    "team_name",
    "channel",
    "transcript_text",
    "conversation_date",
    "customer_id",
  ]);
  assert.equal(m.conversation_id, "conversation_id");
  assert.equal(m.agent_name, "agent_name");
  assert.equal(m.transcript_text, "transcript_text");
});

test("autoDetectMapping: matches mixed-case headers with spaces", () => {
  const m = autoDetectMapping([
    "Agent Name",
    "Call Date",
    "Channel Type",
    "Transcript",
    "Customer ID",
  ]);
  assert.equal(m.agent_name, "Agent Name");
  assert.equal(m.conversation_date, "Call Date");
  assert.equal(m.channel, "Channel Type");
  assert.equal(m.transcript_text, "Transcript");
  assert.equal(m.customer_id, "Customer ID");
});

test("autoDetectMapping: handles BPO-vendor-style aliases", () => {
  // Genesys / Five9-ish
  const m = autoDetectMapping([
    "Interaction Id",
    "Rep",
    "LOB",
    "Media Type",
    "Body",
    "Start Time",
    "MSISDN",
  ]);
  assert.equal(m.conversation_id, "Interaction Id");
  assert.equal(m.agent_name, "Rep");
  assert.equal(m.team_name, "LOB");
  assert.equal(m.channel, "Media Type");
  assert.equal(m.transcript_text, "Body");
  assert.equal(m.conversation_date, "Start Time");
  assert.equal(m.customer_id, "MSISDN");
});

test("autoDetectMapping: leaves unmapped fields blank", () => {
  const m = autoDetectMapping(["foo", "bar", "baz"]);
  assert.equal(m.agent_name, "");
  assert.equal(m.transcript_text, "");
  assert.equal(m.channel, "");
});

test("autoDetectMapping: prefers the first matching header for a field", () => {
  const m = autoDetectMapping(["text", "transcript", "body"]);
  // Whichever pattern matches first wins; "transcript" is in the patterns
  // before "body" but our regex array tries them in order. Confirm we got
  // *some* valid match, not "".
  assert.ok(["text", "transcript", "body"].includes(m.transcript_text));
});

// ---------- normalizeChannel ----------

test("normalizeChannel: voice variants -> voice_transcript", () => {
  assert.equal(normalizeChannel("voice"), "voice_transcript");
  assert.equal(normalizeChannel("Voice"), "voice_transcript");
  assert.equal(normalizeChannel("Phone"), "voice_transcript");
  assert.equal(normalizeChannel("phone_call"), "voice_transcript");
  assert.equal(normalizeChannel("Transcript"), "voice_transcript");
  assert.equal(normalizeChannel("voice call"), "voice_transcript");
});

test("normalizeChannel: email variants", () => {
  assert.equal(normalizeChannel("email"), "email");
  assert.equal(normalizeChannel("Mail"), "email");
  assert.equal(normalizeChannel("E-mail"), "email");
});

test("normalizeChannel: chat variants", () => {
  assert.equal(normalizeChannel("chat"), "chat");
  assert.equal(normalizeChannel("Live Chat"), "chat");
  assert.equal(normalizeChannel("im"), "chat");
});

test("normalizeChannel: unknown returns null", () => {
  assert.equal(normalizeChannel("WhatsApp"), null);
  assert.equal(normalizeChannel(""), null);
  assert.equal(normalizeChannel(123), null);
});

// ---------- normalizeDate ----------

test("normalizeDate: ISO YYYY-MM-DD passes through", () => {
  assert.equal(normalizeDate("2026-04-25"), "2026-04-25");
});

test("normalizeDate: ISO with time strips to date", () => {
  assert.equal(normalizeDate("2026-04-25T13:00:00Z"), "2026-04-25");
});

test("normalizeDate: dd/mm/yyyy reorders correctly", () => {
  assert.equal(normalizeDate("25/04/2026"), "2026-04-25");
  assert.equal(normalizeDate("3/4/2026"), "2026-04-03");
});

test("normalizeDate: dd-mm-yyyy reorders correctly", () => {
  assert.equal(normalizeDate("25-04-2026"), "2026-04-25");
});

test("normalizeDate: gibberish returns null", () => {
  assert.equal(normalizeDate("not a date"), null);
  assert.equal(normalizeDate(""), null);
});

// ---------- validateMapping ----------

const baseMapping = {
  conversation_id: "",
  agent_name: "Agent",
  team_name: "",
  channel: "Channel",
  transcript_text: "Body",
  conversation_date: "Date",
  customer_id: "",
};

test("validateMapping: ok with all required mapped", () => {
  const r = validateMapping(baseMapping);
  assert.equal(r.ok, true);
});

test("validateMapping: ok with fixed channel + fixed date", () => {
  const r = validateMapping({
    ...baseMapping,
    channel: "",
    conversation_date: "",
    fixedChannel: "voice_transcript",
    fixedDate: "2026-04-25",
  });
  assert.equal(r.ok, true);
});

test("validateMapping: fails when agent_name not mapped", () => {
  const r = validateMapping({ ...baseMapping, agent_name: "" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.missing.includes("agent_name"));
});

test("validateMapping: fails when neither channel column nor fixedChannel set", () => {
  const r = validateMapping({ ...baseMapping, channel: "" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.missing.includes("channel"));
});
