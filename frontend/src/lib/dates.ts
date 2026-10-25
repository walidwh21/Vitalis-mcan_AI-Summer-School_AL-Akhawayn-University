/**
 * Calendar helpers on local `YYYY-MM-DD` strings. The browser decides what "today" is
 * for the user and sends it to the API explicitly, avoiding UTC/local day mismatches.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

/** Parse a `YYYY-MM-DD` string as a local date (midday avoids DST edge cases). */
export function fromISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
}

export function addDays(value: string, days: number): string {
  const d = fromISODate(value);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing `value`. */
export function startOfWeek(value: string): string {
  const dow = fromISODate(value).getDay(); // 0 = Sunday
  return addDays(value, dow === 0 ? -6 : 1 - dow);
}
