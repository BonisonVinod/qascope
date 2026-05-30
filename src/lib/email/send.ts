/**
 * Email sender — thin wrapper around Resend v4.
 *
 * Uses plain HTML strings instead of React Email components to avoid
 * React version conflicts. Templates return HTML strings directly.
 *
 * Required env vars:
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 *   FROM_EMAIL      — optional; defaults to Resend's free shared domain
 *                     (onboarding@resend.dev) while you don't have a
 *                     verified domain yet.
 *
 * If RESEND_API_KEY is missing the function warns and skips silently —
 * email failures never break the scoring pipeline.
 */

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
export const fromEmail =
  process.env.FROM_EMAIL?.trim() || "QAScope <onboarding@resend.dev>";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email sending disabled.");
    return null;
  }
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** Full HTML body string. Use the template helpers in ./templates/. */
  html: string;
  /** Plain-text fallback. Defaults to the subject line if omitted. */
  text?: string;
}

/**
 * Send an email. Returns silently if Resend is not configured.
 * Never throws — email errors are logged but do not propagate.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { error } = await client.emails.send({
    from: fromEmail,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.subject,
  });

  if (error) {
    console.error("[email] Send failed:", error);
  }
}
