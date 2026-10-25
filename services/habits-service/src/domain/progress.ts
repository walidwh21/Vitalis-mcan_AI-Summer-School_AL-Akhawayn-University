import { addDays } from "./dates.ts";
import type { Entry, Goals } from "./types.ts";

/** A day counts as "complete" when every metric reaches this share of its goal. */
export const COMPLETION_THRESHOLD = 0.75;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Average goal attainment across the three metrics, between 0 and 1. */
export function completionRatio(entry: Entry | undefined, goals: Goals): number {
  if (!entry) return 0;
  const parts = [
    entry.waterGlasses / goals.waterGlasses,
    entry.sleepHours / goals.sleepHours,
    entry.activityMinutes / goals.activityMinutes,
  ].map(clamp01);
  return parts.reduce((sum, p) => sum + p, 0) / parts.length;
}

export function isDayComplete(entry: Entry | undefined, goals: Goals): boolean {
  if (!entry) return false;
  return (
    entry.waterGlasses / goals.waterGlasses >= COMPLETION_THRESHOLD &&
    entry.sleepHours / goals.sleepHours >= COMPLETION_THRESHOLD &&
    entry.activityMinutes / goals.activityMinutes >= COMPLETION_THRESHOLD
  );
}

/**
 * Number of consecutive complete days ending today. If today is not complete
 * yet the streak is measured up to yesterday, so it is not reset before the
 * user has had a chance to log.
 */
export function computeStreak(entries: Entry[], goals: Goals, today: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let cursor = isDayComplete(byDate.get(today), goals) ? today : addDays(today, -1);
  let streak = 0;
  while (isDayComplete(byDate.get(cursor), goals)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
