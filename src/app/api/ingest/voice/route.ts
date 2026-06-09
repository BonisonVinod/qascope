import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildVoiceAuditRequestFromJson,
  enqueueVoiceAudit,
  type VoiceAuditRequest,
} from "@/lib/voice/audit";
import { normalizeSourceType } from "@/lib/voice/metadata";
import { inferAudioFilename } from "@/lib/voice/transcription";
import { verifyVoiceWebhookSignature } from "@/lib/voice/webhook-security";

export const runtime = "nodejs";
export const maxDuration = 60;

function tokenFromRequest(req: NextRequest): string | null {
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) return queryToken;
  return req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

async function resolveWebhookToken(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("webhook_tokens")
    .select("id, client_id, is_active, signing_secret, allow_unsigned")
    .eq("token", token)
    .maybeSingle();
  return data?.is_active ? data : null;
}

function bodyRequest(req: NextRequest, rawBody: Uint8Array) {
  return new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: rawBody.buffer as ArrayBuffer,
  });
}

async function requestFromMultipart(
  req: NextRequest,
  rawBody: Uint8Array,
  tokenId: string,
  clientId: string,
): Promise<VoiceAuditRequest> {
  const form = await bodyRequest(req, rawBody).formData();
  const file = form.get("audio");
  if (!(file instanceof File)) throw new Error('Multipart voice ingest requires an "audio" file field.');
  return {
    tokenId,
    clientId,
    externalCallId: String(form.get("external_call_id") || form.get("call_id") || "").trim() || null,
    sourceType: normalizeSourceType(String(form.get("source_type") || "recording_upload")),
    sourceSystem: String(form.get("source_system") || "").trim() || null,
    agentName: String(form.get("agent_name") || "").trim() || null,
    customerId: String(form.get("customer_id") || "").trim() || null,
    campaign: String(form.get("campaign") || "").trim() || null,
    durationSeconds: Number.isFinite(Number(form.get("duration_seconds"))) ? Number(form.get("duration_seconds")) : null,
    language: String(form.get("language") || "").trim() || null,
    conversationDate: String(form.get("conversation_date") || "").trim() || null,
    metadata: {},
    audio: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: inferAudioFilename(file.name, file.type),
      contentType: file.type || null,
    },
  };
}

export async function POST(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing webhook token." }, { status: 401 });
  }
  const tokenRow = await resolveWebhookToken(token);
  if (!tokenRow) {
    return NextResponse.json({ ok: false, error: "Invalid or inactive token." }, { status: 401 });
  }

  // Guard: reject requests larger than 50 MB before reading into memory
  const contentLength = req.headers.get("content-length");
  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
  if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File too large. Maximum upload size is 50 MB." },
      { status: 413 },
    );
  }

  const rawBytes = new Uint8Array(await req.arrayBuffer());
  // Double-check actual body size after read
  if (rawBytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File too large. Maximum upload size is 50 MB." },
      { status: 413 },
    );
  }
  const rawText = new TextDecoder().decode(rawBytes);
  if (!tokenRow.allow_unsigned) {
    const verified = verifyVoiceWebhookSignature({
      secret: tokenRow.signing_secret,
      timestamp: req.headers.get("x-qascope-timestamp"),
      signature: req.headers.get("x-qascope-signature"),
      rawBody: rawText,
    });
    if (!verified.ok) return NextResponse.json(verified, { status: 401 });
  }

  let request: VoiceAuditRequest;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      request = await requestFromMultipart(req, rawBytes, tokenRow.id, tokenRow.client_id);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      request = buildVoiceAuditRequestFromJson(
        Object.fromEntries(new URLSearchParams(rawText)),
        tokenRow.id,
        tokenRow.client_id,
      );
    } else {
      request = buildVoiceAuditRequestFromJson(
        JSON.parse(rawText) as Record<string, unknown>,
        tokenRow.id,
        tokenRow.client_id,
      );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const result = await enqueueVoiceAudit(request);
  const supabase = createAdminClient();
  await supabase.from("webhook_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(
    {
      ok: true,
      voice_audit_job_id: result.jobId,
      status: result.status,
      message: result.message,
    },
    { status: 202 },
  );
}
