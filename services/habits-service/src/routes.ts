import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "./http.ts";
import { requireAuth, requireInternalKey } from "./middleware.ts";
import { getEntry, getGoals, listEntries, saveGoals, upsertEntry } from "./db/repository.ts";
import { addDays, daysBetween, isValidISODate, startOfWeek } from "./domain/dates.ts";
import { computeStreak } from "./domain/progress.ts";
import { buildWeekSummary } from "./domain/weekly.ts";
import { MOODS } from "./domain/types.ts";

const isoDate = z.string().refine(isValidISODate, "Expected a date formatted as YYYY-MM-DD");

const entryBody = z
  .object({
    mood: z.enum(MOODS).optional(),
    waterGlasses: z.number().int().min(0).max(30).optional(),
    sleepHours: z.number().min(0).max(24).multipleOf(0.5).optional(),
    activityMinutes: z.number().int().min(0).max(600).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field");

const goalsBody = z.object({
  waterGlasses: z.number().int().min(1).max(30),
  sleepHours: z.number().min(1).max(16).multipleOf(0.5),
  activityMinutes: z.number().int().min(5).max(600),
});

const rangeQuery = z.object({ from: isoDate, to: isoDate });

const utcToday = () => new Date().toISOString().slice(0, 10);

/** Reject dates more than a day ahead of UTC (covers every timezone) or absurdly old. */
function assertLoggableDate(date: string) {
  const offset = daysBetween(utcToday(), date);
  if (offset > 1) throw new HttpError(400, "Cannot log habits for a future date");
  if (offset < -3650) throw new HttpError(400, "Date is too far in the past");
}

export const router = Router();

// ---- Public API (JWT) --------------------------------------------------

router.get(
  "/entries",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { from, to } = rangeQuery.parse(req.query);
    const span = daysBetween(from, to);
    if (span < 0) throw new HttpError(400, "'to' must not be before 'from'");
    if (span > 366) throw new HttpError(400, "Range is limited to 366 days");
    res.json({ entries: await listEntries(res.locals.userId, from, to) });
  }),
);

router.get(
  "/entries/:date",
  requireAuth,
  asyncHandler(async (req, res) => {
    const date = isoDate.parse(req.params.date);
    res.json({ entry: await getEntry(res.locals.userId, date) });
  }),
);

router.put(
  "/entries/:date",
  requireAuth,
  asyncHandler(async (req, res) => {
    const date = isoDate.parse(req.params.date);
    assertLoggableDate(date);
    const patch = entryBody.parse(req.body);
    res.json({ entry: await upsertEntry(res.locals.userId, date, patch) });
  }),
);

router.get(
  "/summary/week",
  requireAuth,
  asyncHandler(async (req, res) => {
    const start = startOfWeek(isoDate.parse(req.query.start));
    const userId = res.locals.userId as string;
    const [entries, goals] = await Promise.all([
      listEntries(userId, start, addDays(start, 6)),
      getGoals(userId),
    ]);
    res.json(buildWeekSummary(start, entries, goals));
  }),
);

router.get(
  "/streak",
  requireAuth,
  asyncHandler(async (req, res) => {
    const today = isoDate.parse(req.query.today);
    const userId = res.locals.userId as string;
    const [entries, goals] = await Promise.all([
      listEntries(userId, addDays(today, -365), today),
      getGoals(userId),
    ]);
    res.json({ streak: computeStreak(entries, goals, today) });
  }),
);

router.get(
  "/goals",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ goals: await getGoals(res.locals.userId) });
  }),
);

router.put(
  "/goals",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ goals: await saveGoals(res.locals.userId, goalsBody.parse(req.body)) });
  }),
);

// ---- Internal API (service-to-service, never proxied by the gateway) -----

router.get(
  "/internal/users/:userId/summary",
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);
    const today = req.query.today ? isoDate.parse(req.query.today) : utcToday();
    const weekStart = addDays(today, -6);
    const [entries, goals] = await Promise.all([
      listEntries(userId, addDays(today, -365), today),
      getGoals(userId),
    ]);
    const week = buildWeekSummary(
      weekStart,
      entries.filter((e) => e.date >= weekStart),
      goals,
    );
    res.json({
      windowDays: 7,
      loggedDays: week.loggedDays,
      averages: week.averages,
      moodCounts: week.moodCounts,
      goals,
      streak: computeStreak(entries, goals, today),
      today: entries.find((e) => e.date === today) ?? null,
    });
  }),
);
