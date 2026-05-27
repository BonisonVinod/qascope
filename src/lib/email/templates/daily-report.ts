/**
 * Email template — Day-end Manager Report
 *
 * Sent once per day at the configured time (default 6 PM IST).
 * Recipients: all QA Managers on the workspace.
 */

export interface DailyReportData {
  workspaceName: string;
  reportDate: string; // e.g. "Monday, 25 May 2025"
  totalScored: number;
  passRate: number;        // 0–100
  passRateDelta?: number;  // change vs yesterday, +/-
  avgScore: number;
  bottomAgents: Array<{ name: string; score: number; count: number }>;
  topFailedCriteria: Array<{ criterion: string; failCount: number }>;
  reportUrl: string;
}

export function dailyReportHtml(d: DailyReportData): string {
  const passColor = d.passRate >= 80 ? "#16a34a" : d.passRate >= 60 ? "#d97706" : "#dc2626";
  const deltaText =
    d.passRateDelta !== undefined
      ? d.passRateDelta > 0
        ? `<span style="color:#16a34a;">▲ ${d.passRateDelta.toFixed(1)}% vs yesterday</span>`
        : d.passRateDelta < 0
          ? `<span style="color:#dc2626;">▼ ${Math.abs(d.passRateDelta).toFixed(1)}% vs yesterday</span>`
          : `<span style="color:#6b7280;">→ No change vs yesterday</span>`
      : "";

  const agentRows = d.bottomAgents
    .slice(0, 5)
    .map(
      (a) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#18181b;">${escHtml(a.name)}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${a.score < 70 ? "#dc2626" : "#d97706"};text-align:center;">${a.score.toFixed(1)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center;">${a.count} call${a.count === 1 ? "" : "s"}</td>
      </tr>`,
    )
    .join("");

  const criteriaRows = d.topFailedCriteria
    .slice(0, 5)
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#18181b;">${escHtml(c.criterion)}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#dc2626;text-align:right;">${c.failCount} failure${c.failCount === 1 ? "" : "s"}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#18181b;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">QAScope</p>
          <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Daily QA Report · ${escHtml(d.reportDate)}</p>
        </td></tr>

        <!-- Headline stats -->
        <tr><td style="padding:28px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:0 8px;">
                <p style="margin:0;font-size:36px;font-weight:800;color:#18181b;">${d.totalScored}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Conversations Scored</p>
              </td>
              <td width="33%" style="text-align:center;padding:0 8px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
                <p style="margin:0;font-size:36px;font-weight:800;color:${passColor};">${d.passRate.toFixed(1)}%</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Pass Rate</p>
                <p style="margin:4px 0 0;font-size:11px;">${deltaText}</p>
              </td>
              <td width="33%" style="text-align:center;padding:0 8px;">
                <p style="margin:0;font-size:36px;font-weight:800;color:#18181b;">${d.avgScore.toFixed(1)}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Avg Score</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Bottom agents -->
        ${d.bottomAgents.length > 0 ? `
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#18181b;">⚠ Agents needing attention</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;">Agent</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;">Avg Score</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;">Audits</th>
              </tr>
            </thead>
            <tbody style="border-top:1px solid #e4e4e7;">
              ${agentRows}
            </tbody>
          </table>
        </td></tr>` : ""}

        <!-- Top failed criteria -->
        ${d.topFailedCriteria.length > 0 ? `
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#18181b;">📋 Most failed criteria today</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            <tbody>
              ${criteriaRows}
            </tbody>
          </table>
        </td></tr>` : ""}

        <!-- CTA -->
        <tr><td style="padding:28px 32px;">
          <a href="${d.reportUrl}"
             style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
            Open Full Report →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            ${escHtml(d.workspaceName)} · QAScope Daily Digest · Sent at 6 PM IST
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
