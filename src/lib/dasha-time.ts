/**
 * Dasha period arithmetic for display: dates, calendar spans, and which
 * period is running. `now` is always passed in, so views and reports read the
 * same injected clock and tests can pin it.
 */
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "1987-05-26T17:41:00.000Z" -> "26 May 1987" (UTC, no time of day). */
export function formatDashaDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Calendar-aware span like "10Y", "1Y 4M", "1Y 4M 12D", "18D". */
export function formatDashaDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0),
    ).getUTCDate();
    // A start day the previous month lacks (31 Jan before 1 Mar) counts from
    // that month's last day, so the span never goes negative.
    days =
      end.getUTCDate() +
      prevMonthDays -
      Math.min(start.getUTCDate(), prevMonthDays);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0 || (years === 0 && months === 0 && days <= 0)) {
    return "";
  }
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years}Y`);
  }
  if (months > 0) {
    parts.push(`${months}M`);
  }
  if (days > 0) {
    parts.push(`${days}D`);
  }
  return parts.join(" ");
}

/** Index of the period covering `nowIso`, or -1. */
export function findCurrentPeriodIndex(
  periods: readonly { start: string; end: string }[],
  nowIso: string,
): number {
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(now)) {
    return -1;
  }
  return periods.findIndex((period) => {
    const start = new Date(period.start).getTime();
    const end = new Date(period.end).getTime();
    return (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= now &&
      now < end
    );
  });
}
