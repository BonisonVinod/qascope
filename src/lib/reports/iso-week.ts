export type IsoWeek = {
  /** Monday at 00:00 UTC of the ISO week containing `ref`. */
  start: Date;
  /** The following Monday (exclusive end). */
  end: Date;
  /** Pretty label, e.g. "Apr 6, 2026 – Apr 12, 2026". */
  label: string;
  /** Whether the supplied "today" falls inside the returned range. */
  isCurrent: boolean;
};

/**
 * Compute the ISO Mon..Sun week range that contains `ref`. Treated as UTC
 * so timezone wobble doesn't move week boundaries.
 *
 * The optional `today` arg lets callers compute `isCurrent` deterministically
 * (default: real `new Date()`).
 */
export function isoWeekRange(ref: Date, today: Date = new Date()): IsoWeek {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
  const day = d.getUTCDay() || 7; // Sunday=0 -> 7
  d.setUTCDate(d.getUTCDate() - day + 1); // back to Monday
  const start = new Date(d);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 7);

  const fmt = (x: Date) =>
    x.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const label = `${fmt(start)} \u2013 ${fmt(new Date(end.getTime() - 86400 * 1000))}`;
  const isCurrent = today.getTime() >= start.getTime() && today.getTime() < end.getTime();
  return { start, end, label, isCurrent };
}
