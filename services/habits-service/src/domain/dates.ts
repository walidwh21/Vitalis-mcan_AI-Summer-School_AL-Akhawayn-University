/**
 * Calendar-date helpers working on plain `YYYY-MM-DD` strings.
 *
 * All arithmetic is done in UTC so results never depend on the server's
 * timezone. The client decides what "today" means for the user and sends it
 * explicitly; the server only does calendar maths.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(value: string, days: number): string {
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `value`. */
export function startOfWeek(value: string): string {
  const dow = new Date(`${value}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(value, dow === 0 ? -6 : 1 - dow);
}

export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
