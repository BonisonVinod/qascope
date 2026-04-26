/**
 * Compute an absolute SLA deadline from a duration in hours and a "now"
 * reference. Pure helper so tests can pin the clock.
 */
export function computeSlaDeadline(slaHours: number, now: Date = new Date()): Date {
  if (!Number.isFinite(slaHours) || slaHours <= 0) {
    throw new Error(`Invalid slaHours: ${slaHours}`);
  }
  return new Date(now.getTime() + slaHours * 3600 * 1000);
}

/**
 * Returns whether the deadline is in the past relative to now.
 */
export function isExpired(deadline: Date, now: Date = new Date()): boolean {
  return deadline.getTime() <= now.getTime();
}

/**
 * Human-friendly remaining-time label used in the review queue badges.
 *   - 0 or negative -> "overdue"
 *   - <1h -> "Xm left"
 *   - <24h -> "X.Yh left"
 *   - else -> "Xd Yh left"
 */
export function formatTimeLeft(deadline: Date, now: Date = new Date()): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "overdue";
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)}m left`;
  if (hours < 24) return `${hours.toFixed(1)}h left`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h left`;
}
