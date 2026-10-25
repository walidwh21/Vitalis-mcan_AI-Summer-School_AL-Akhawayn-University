import { addDays } from "./dates.ts";
import { completionRatio } from "./progress.ts";
import { MOODS } from "./types.ts";
import type { Entry, Goals, Mood } from "./types.ts";

export interface WeekDay {
  date: string;
  entry: Entry | null;
  completion: number;
}

export interface WeekSummary {
  weekStart: string;
  days: WeekDay[];
  loggedDays: number;
  averages: { waterGlasses: number; sleepHours: number; activityMinutes: number };
  moodCounts: Record<Mood, number>;
  goals: Goals;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Build a Monday-to-Sunday summary. Averages only include days that were logged. */
export function buildWeekSummary(weekStart: string, entries: Entry[], goals: Goals): WeekSummary {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const entry = byDate.get(date) ?? null;
    return { date, entry, completion: round1(completionRatio(entry ?? undefined, goals) * 100) / 100 };
  });

  const logged = days.filter((d) => d.entry !== null).map((d) => d.entry as Entry);
  const avg = (pick: (e: Entry) => number) =>
    logged.length === 0 ? 0 : round1(logged.reduce((s, e) => s + pick(e), 0) / logged.length);

  const moodCounts = Object.fromEntries(MOODS.map((m) => [m, 0])) as Record<Mood, number>;
  for (const e of logged) if (e.mood) moodCounts[e.mood] += 1;

  return {
    weekStart,
    days,
    loggedDays: logged.length,
    averages: {
      waterGlasses: avg((e) => e.waterGlasses),
      sleepHours: avg((e) => e.sleepHours),
      activityMinutes: avg((e) => e.activityMinutes),
    },
    moodCounts,
    goals,
  };
}
