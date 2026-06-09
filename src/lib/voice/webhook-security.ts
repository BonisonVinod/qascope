import { createHmac, timingSafeEqual } from "crypto";

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

export function createVoiceWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

export function verifyVoiceWebhookSignature(input: {
  secret: string | null;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowMs?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!input.secret) {
    return { ok: false, error: "This webhook token has no signing secret. Create a new secure token." };
  }
  if (!input.timestamp || !input.signature) {
    return {
      ok: false,
      error: "Missing x-qascope-timestamp or x-qascope-signature header.",
    };
  }

  const timestampSeconds = Number(input.timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, error: "Invalid webhook timestamp." };
  }

  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS) {
    return { ok: false, error: "Webhook timestamp is outside the five-minute security window." };
  }

  const expected = createVoiceWebhookSignature(input.secret, input.timestamp, input.rawBody);
  const actualBytes = Buffer.from(input.signature);
  const expectedBytes = Buffer.from(expected);
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return { ok: false, error: "Invalid webhook signature." };
  }
  return { ok: true };
}
