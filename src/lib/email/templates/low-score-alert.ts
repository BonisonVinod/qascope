/**
 * Email template — Low Score Alert
 *
 * Sent in real-time when a conversation is scored below the pass threshold.
 * Recipients: all QA Managers and Team Leads on that client workspace.
 */

export interface LowScoreAlertData {
  agentName: string;
  agentEmail?: string;
  score: number;
  passThreshold: number;
  campaign?: string;
  conversationDate?: string;
  failedCriteria?: string[];
  scoreUrl: string;
  workspaceName: string;
}

export function lowScoreAlertHtml(d: LowScoreAlertData): string {
  const scoreColor = d.score < 50 ? "#dc2626" : "#d97706";
  const failedList =
    d.failedCriteria && d.failedCriteria.length > 0
      ? d.failedCriteria
          .slice(0, 3)
          .map((c) => `<li style="margin:4px 0;">${escHtml(c)}</li>`)
          .join("")
      : "<li style='margin:4px 0; color:#6b7280;'>See full report for details.</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#18181b;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">QAScope</p>
          <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Low Score Alert</p>
        </td></tr>

        <!-- Score badge -->
        <tr><td style="padding:28px 32px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${scoreColor}1a;border:2px solid ${scoreColor};border-radius:8px;padding:12px 20px;text-align:center;">
                <p style="margin:0;color:${scoreColor};font-size:36px;font-weight:800;line-height:1;">${d.score}</p>
                <p style="margin:2px 0 0;color:${scoreColor};font-size:12px;font-weight:600;">out of 100</p>
              </td>
              <td style="padding-left:20px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#18181b;">${escHtml(d.agentName)}</p>
                ${d.agentEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${escHtml(d.agentEmail)}</p>` : ""}
                ${d.campaign ? `<p style="margin:6px 0 0;font-size:12px;background:#f4f4f5;display:inline-block;padding:2px 8px;border-radius:4px;color:#52525b;">${escHtml(d.campaign)}</p>` : ""}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;">
            <tr>
              <td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Pass threshold</td>
              <td style="font-size:12px;color:#6b7280;padding-bottom:4px;text-align:right;">Shortfall</td>
            </tr>
            <tr>
              <td style="font-size:16px;font-weight:700;color:#18181b;">${d.passThreshold} / 100</td>
              <td style="font-size:16px;font-weight:700;color:${scoreColor};text-align:right;">−${d.passThreshold - d.score} pts</td>
            </tr>
          </table>
        </td></tr>

        <!-- Failed criteria -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b;">Top issues flagged</p>
          <ul style="margin:0;padding-left:20px;color:#3f3f46;font-size:13px;line-height:1.6;">
            ${failedList}
          </ul>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;">
          <a href="${d.scoreUrl}"
             style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
            View Full Score Report →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            ${escHtml(d.workspaceName)} · QAScope · You received this because you are a QA Manager or Team Lead on this workspace.
            ${d.conversationDate ? `· Scored on ${escHtml(d.conversationDate)}` : ""}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
