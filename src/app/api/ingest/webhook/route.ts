/**
 * POST /api/ingest/webhook?token=<webhook-token>
 *
 * Real-time conversation ingest endpoint.
 * Any CRM (Freshdesk, Zoho, Salesforce) or website can POST a conversation
 * here. QAScope creates a `conversations` row — the existing scoring engine
 * then picks it up and scores it automatically.
 *
 * Expected JSON body:
 * {
 *   "transcript":               string,  // required — full conversation text
 *   "agent_name":               string,  // optional — matched against agents table
 *   "customer_id":              string,  // optional
 *   "order_id":                 string,  // optional — stored in metadata
 *   "call_duration_seconds":    number,  // optional
 *   "channel":                  string,  // optional — "voice_transcript"|"chat"|"email"
 *   "conversation_date":        string,  // optional — ISO date YYYY-MM-DD
 *   "external_id":              string,  // optional — your CRM ticket/call ID
 *   "metadata":                 object   // optional — any extra key-values
 * }
 *
 * Response:
 *   201 { ok: true,  conversation_id: "uuid", message: "Queued for scoring" }
 *   400 { ok: false, error: "..." }
 *   401 { ok: false, error: "Invalid or inactive token" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_CHANNELS = ["chat", "email", "voice_transcript"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

export async function POST(req: NextRequest) {
  // 1. Validate the token query param
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing ?token= parameter" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 2. Look up the token in webhook_tokens
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("webhook_tokens")
    .select("id, client_id, is_active, name")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json(
      { ok: false, error: "Invalid or inactive token" },
      { status: 401 },
    );
  }
  if (!tokenRow.is_active) {
    return NextResponse.json(
      { ok: false, error: "This webhook token has been deactivated" },
      { status: 401 },
    );
  }

  // 3. Parse the body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const transcriptText = (body.transcript as string | undefined)?.trim();
  if (!transcriptText || transcriptText.length < 10) {
    return NextResponse.json(
      { ok: false, error: "transcript is required and must be at least 10 characters" },
      { status: 400 },
    );
  }

  // 4. Resolve channel (default: voice_transcript)
  const rawChannel = body.channel as string | undefined;
  const channel: Channel = VALID_CHANNELS.includes(rawChannel as Channel)
    ? (rawChannel as Channel)
    : "voice_transcript";

  // 5. Resolve agent by name in the agents table for this client
  let agentId: string | null = null;
  const agentName = (body.agent_name as string | undefined)?.trim();
  if (agentName) {
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("client_id", tokenRow.client_id)
      .ilike("agent_name", agentName)
      .maybeSingle();
    if (existingAgent) agentId = existingAgent.id;
  }

  // 6. Parse conversation date (default: today)
  const rawDate = body.conversation_date as string | undefined;
  const conversationDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : new Date().toISOString().slice(0, 10);

  // 7. Build metadata blob
  const metadataJson: Record<string, unknown> = {
    webhook_token_name: tokenRow.name,
    order_id: (body.order_id as string | undefined) ?? null,
    call_duration_seconds: (body.call_duration_seconds as number | undefined) ?? null,
  };
  if (body.metadata && typeof body.metadata === "object") {
    Object.assign(metadataJson, body.metadata);
  }

  // 8. Insert into conversations — scorer picks this up automatically
  const { data: convoRow, error: insertErr } = await supabase
    .from("conversations")
    .insert({
      client_id: tokenRow.client_id,
      agent_id: agentId,
      channel,
      transcript_text: transcriptText,
      conversation_date: conversationDate,
      customer_id: (body.customer_id as string | undefined) ?? null,
      external_conversation_id: (body.external_id as string | undefined) ?? null,
      metadata_json: metadataJson,
    })
    .select("id")
    .single();

  if (insertErr || !convoRow) {
    console.error("[webhook] Insert failed:", insertErr);
    return NextResponse.json(
      { ok: false, error: "Failed to create conversation record" },
      { status: 500 },
    );
  }

  // 9. Update token last_used_at (best-effort)
  await supabase
    .from("webhook_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json(
    {
      ok: true,
      conversation_id: convoRow.id,
      message: "Conversation received and queued for scoring",
    },
    { status: 201 },
  );
}
