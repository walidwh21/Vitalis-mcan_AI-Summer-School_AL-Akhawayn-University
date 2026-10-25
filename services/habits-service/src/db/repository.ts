import { pool } from "./pool.ts";
import { DEFAULT_GOALS } from "../domain/types.ts";
import type { Entry, Goals, Mood } from "../domain/types.ts";

interface EntryRow {
  date: string;
  mood: Mood | null;
  water_glasses: number;
  sleep_hours: number;
  activity_minutes: number;
}

const ENTRY_COLUMNS = `entry_date AS date, mood, water_glasses, sleep_hours, activity_minutes`;

const toEntry = (row: EntryRow): Entry => ({
  date: row.date,
  mood: row.mood,
  waterGlasses: row.water_glasses,
  sleepHours: row.sleep_hours,
  activityMinutes: row.activity_minutes,
});

export async function listEntries(userId: string, from: string, to: string): Promise<Entry[]> {
  const { rows } = await pool.query<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM habits_svc.entries
     WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3
     ORDER BY entry_date ASC`,
    [userId, from, to],
  );
  return rows.map(toEntry);
}

export async function getEntry(userId: string, date: string): Promise<Entry | null> {
  const { rows } = await pool.query<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM habits_svc.entries WHERE user_id = $1 AND entry_date = $2`,
    [userId, date],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

export type EntryPatch = Partial<Pick<Entry, "mood" | "waterGlasses" | "sleepHours" | "activityMinutes">>;

/** Insert or merge: fields left undefined keep their stored value. */
export async function upsertEntry(userId: string, date: string, patch: EntryPatch): Promise<Entry> {
  const { rows } = await pool.query<EntryRow>(
    `INSERT INTO habits_svc.entries (user_id, entry_date, mood, water_glasses, sleep_hours, activity_minutes)
     VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 0))
     ON CONFLICT (user_id, entry_date) DO UPDATE SET
       mood             = COALESCE($3, habits_svc.entries.mood),
       water_glasses    = COALESCE($4, habits_svc.entries.water_glasses),
       sleep_hours      = COALESCE($5, habits_svc.entries.sleep_hours),
       activity_minutes = COALESCE($6, habits_svc.entries.activity_minutes),
       updated_at       = now()
     RETURNING ${ENTRY_COLUMNS}`,
    [
      userId,
      date,
      patch.mood ?? null,
      patch.waterGlasses ?? null,
      patch.sleepHours ?? null,
      patch.activityMinutes ?? null,
    ],
  );
  return toEntry(rows[0] as EntryRow);
}

export async function getGoals(userId: string): Promise<Goals> {
  const { rows } = await pool.query<{ water_glasses: number; sleep_hours: number; activity_minutes: number }>(
    `SELECT water_glasses, sleep_hours, activity_minutes FROM habits_svc.goals WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0];
  return row
    ? { waterGlasses: row.water_glasses, sleepHours: row.sleep_hours, activityMinutes: row.activity_minutes }
    : { ...DEFAULT_GOALS };
}

export async function saveGoals(userId: string, goals: Goals): Promise<Goals> {
  await pool.query(
    `INSERT INTO habits_svc.goals (user_id, water_glasses, sleep_hours, activity_minutes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       water_glasses = $2, sleep_hours = $3, activity_minutes = $4, updated_at = now()`,
    [userId, goals.waterGlasses, goals.sleepHours, goals.activityMinutes],
  );
  return goals;
}
