export type Locale = "en" | "fr" | "ar";

export interface User {
  id: string;
  email: string;
  fullName: string;
  locale: Locale;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const MOODS = ["very_low", "low", "neutral", "good", "great"] as const;
export type Mood = (typeof MOODS)[number];

export interface Goals {
  waterGlasses: number;
  sleepHours: number;
  activityMinutes: number;
}

export interface HabitEntry {
  date: string;
  mood: Mood | null;
  waterGlasses: number;
  sleepHours: number;
  activityMinutes: number;
}

export interface WeekSummary {
  weekStart: string;
  days: { date: string; entry: HabitEntry | null; completion: number }[];
  loggedDays: number;
  averages: Goals;
  moodCounts: Record<Mood, number>;
  goals: Goals;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback: "helpful" | "not_helpful" | null;
  createdAt: string;
}
