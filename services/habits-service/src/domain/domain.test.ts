import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysBetween, isValidISODate, startOfWeek } from "./dates.ts";
import { completionRatio, computeStreak, isDayComplete } from "./progress.ts";
import { buildWeekSummary } from "./weekly.ts";
import { DEFAULT_GOALS } from "./types.ts";
import type { Entry } from "./types.ts";

const entry = (date: string, water = 8, sleep = 8, activity = 60, mood: Entry["mood"] = "good"): Entry => ({
  date,
  mood,
  waterGlasses: water,
  sleepHours: sleep,
  activityMinutes: activity,
});

test("isValidISODate rejects malformed and impossible dates", () => {
  assert.equal(isValidISODate("2026-02-28"), true);
  assert.equal(isValidISODate("2026-02-30"), false);
  assert.equal(isValidISODate("2026-2-3"), false);
  assert.equal(isValidISODate("not-a-date"), false);
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // leap year
});

test("startOfWeek returns the Monday, treating Sunday as the last day", () => {
  assert.equal(startOfWeek("2026-10-24"), "2026-10-19"); // Saturday
  assert.equal(startOfWeek("2026-10-25"), "2026-10-19"); // Sunday
  assert.equal(startOfWeek("2026-10-19"), "2026-10-19"); // Monday
});

test("daysBetween is signed and inclusive of month changes", () => {
  assert.equal(daysBetween("2026-10-01", "2026-11-01"), 31);
  assert.equal(daysBetween("2026-10-05", "2026-10-01"), -4);
});

test("completionRatio caps each metric at its goal", () => {
  assert.equal(completionRatio(entry("2026-10-24", 16, 16, 120), DEFAULT_GOALS), 1);
  assert.equal(completionRatio(undefined, DEFAULT_GOALS), 0);
  assert.equal(completionRatio(entry("2026-10-24", 4, 4, 30), DEFAULT_GOALS), 0.5);
});

test("isDayComplete needs every metric at 75% of goal", () => {
  assert.equal(isDayComplete(entry("d", 6, 6, 45), DEFAULT_GOALS), true);
  assert.equal(isDayComplete(entry("d", 6, 6, 44), DEFAULT_GOALS), false);
});

test("computeStreak counts back from today when today is complete", () => {
  const entries = [entry("2026-10-24"), entry("2026-10-23"), entry("2026-10-22")];
  assert.equal(computeStreak(entries, DEFAULT_GOALS, "2026-10-24"), 3);
});

test("computeStreak does not reset while today is still unlogged", () => {
  const entries = [entry("2026-10-23"), entry("2026-10-22")];
  assert.equal(computeStreak(entries, DEFAULT_GOALS, "2026-10-24"), 2);
});

test("computeStreak stops at the first gap or incomplete day", () => {
  const entries = [entry("2026-10-24"), entry("2026-10-23", 1, 1, 1), entry("2026-10-22")];
  assert.equal(computeStreak(entries, DEFAULT_GOALS, "2026-10-24"), 1);
  assert.equal(computeStreak([], DEFAULT_GOALS, "2026-10-24"), 0);
});

test("buildWeekSummary returns 7 days and averages only logged days", () => {
  const week = buildWeekSummary(
    "2026-10-19",
    [entry("2026-10-19", 8, 7, 60, "great"), entry("2026-10-21", 4, 5, 20, "low")],
    DEFAULT_GOALS,
  );
  assert.equal(week.days.length, 7);
  assert.equal(week.days[0]?.date, "2026-10-19");
  assert.equal(week.days[6]?.date, "2026-10-25");
  assert.equal(week.loggedDays, 2);
  assert.deepEqual(week.averages, { waterGlasses: 6, sleepHours: 6, activityMinutes: 40 });
  assert.equal(week.moodCounts.great, 1);
  assert.equal(week.moodCounts.low, 1);
  assert.equal(week.days[1]?.entry, null);
});

test("buildWeekSummary on an empty week yields zeros, not NaN", () => {
  const week = buildWeekSummary("2026-10-19", [], DEFAULT_GOALS);
  assert.equal(week.loggedDays, 0);
  assert.deepEqual(week.averages, { waterGlasses: 0, sleepHours: 0, activityMinutes: 0 });
});
