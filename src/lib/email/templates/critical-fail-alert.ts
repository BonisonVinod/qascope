/**
 * Critical Fail Alert Email Template
 *
 * Generates urgent HTML for when an audit results in a critical_fail status.
 * Distinct from the yellow low-score alert — this is red and high-priority.
 */

export interface CriticalFailAlertParams {
  agentName: string;
  agentEmail?: string;
  score: number;
  passThreshold: number;
  workspaceName: string;
  conversationDate?: string;
  failedCriteria: string[];
  scoreUrl: string;
}

export function criticalFailAlertHtml(params: CriticalFailAlertParams): string {
  const {
    agentName,
    score,
    passThreshold,
    workspaceName,
    conversationDate,
    failedCriteria,
    scoreUrl,
  } = params;

  const failedList =
    failedCriteria.length > 0
      ? failedCriteria
          .map(
            (c) =>
              `<li style="margin-bottom:6px; padding-left:8px; border-left:3px solid #ef4444;">${c}</li>`,
          )
          .join("")
      : "<li>See full audit report for details.</li>";

  const dateStr = conversationDate ? ` on ${conversationDate}` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🚨 Critical Fail Alert</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0f0f0f;color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #3f3f46;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:28px 32px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:28px;">🚨</span>
                <div>
                  <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#fca5a5;opacity:0.85;">Critical Fail Alert</p>
                  <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${workspaceName}</h1>
                </div>
              </div>
            </td>
          </tr>

          <!-- Score Badge -->
          <tr>
            <td style="padding:28px 32px 0;">
              <div style="background:#2d1010;border:1px solid #7f1d1d;border-radius:10px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <p style="margin:0;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;">Agent</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f4f4f5;">${agentName}</p>
                  ${conversationDate ? `<p style="margin:4px 0 0;font-size:12px;color:#71717a;">Audited${dateStr}</p>` : ""}
                </div>
                <div style="text-align:right;">
                  <p style="margin:0;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;">Score</p>
                  <p style="margin:4px 0 0;font-size:36px;font-weight:800;color:#ef4444;line-height:1;">${score}<span style="font-size:18px;color:#a1a1aa;">/100</span></p>
                  <p style="margin:2px 0 0;font-size:11px;color:#71717a;">Threshold: ${passThreshold}/100</p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Failed Criteria -->
          ${
            failedCriteria.length > 0
              ? `
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#fca5a5;text-transform:uppercase;letter-spacing:1px;">Failed Criteria</p>
              <ul style="margin:0;padding-left:16px;color:#d4d4d8;font-size:14px;line-height:1.6;">
                ${failedList}
              </ul>
            </td>
          </tr>`
              : ""
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding:28px 32px;">
              <a href="${scoreUrl}"
                style="display:inline-block;background:#ef4444;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;letter-spacing:0.3px;">
                View Full Audit Report →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                This is an automated critical fail alert from <strong style="color:#a1a1aa;">QAScope</strong>.
                This email is sent to all workspace managers and admins and cannot be disabled.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
