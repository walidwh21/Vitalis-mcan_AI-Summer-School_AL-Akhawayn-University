export const MOODS = ["very_low", "low", "neutral", "good", "great"] as const;
export type Mood = (typeof MOODS)[number];

export interface Goals {
  waterGlasses: number;
  sleepHours: number;
  activityMinutes: number;
}

export interface Entry {
  date: string; // YYYY-MM-DD
  mood: Mood | null;
  waterGlasses: number;
  sleepHours: number;
  activityMinutes: number;
}

export const DEFAULT_GOALS: Goals = {
  waterGlasses: 8,
  sleepHours: 8,
  activityMinutes: 60,
};
