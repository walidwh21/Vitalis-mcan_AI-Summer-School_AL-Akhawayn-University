import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Goals, HabitEntry, WeekSummary } from "@/types/api";

export const DEFAULT_GOALS: Goals = { waterGlasses: 8, sleepHours: 8, activityMinutes: 60 };

const keys = {
  all: ["habits"] as const,
  entry: (date: string) => ["habits", "entry", date] as const,
  week: (start: string) => ["habits", "week", start] as const,
  streak: (today: string) => ["habits", "streak", today] as const,
  goals: ["habits", "goals"] as const,
};

export const useEntry = (date: string) =>
  useQuery({
    queryKey: keys.entry(date),
    queryFn: async () => (await api<{ entry: HabitEntry | null }>(`/habits/entries/${date}`)).entry,
  });

export const useWeek = (start: string) =>
  useQuery({ queryKey: keys.week(start), queryFn: () => api<WeekSummary>(`/habits/summary/week?start=${start}`) });

export const useStreak = (today: string) =>
  useQuery({
    queryKey: keys.streak(today),
    queryFn: async () => (await api<{ streak: number }>(`/habits/streak?today=${today}`)).streak,
  });

export const useGoals = () =>
  useQuery({
    queryKey: keys.goals,
    queryFn: async () => (await api<{ goals: Goals }>("/habits/goals")).goals,
    staleTime: 5 * 60_000,
  });

export type EntryPatch = Partial<Pick<HabitEntry, "mood" | "waterGlasses" | "sleepHours" | "activityMinutes">>;

export function useSaveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, patch }: { date: string; patch: EntryPatch }) =>
      api<{ entry: HabitEntry }>(`/habits/entries/${date}`, { method: "PUT", body: patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useSaveGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goals: Goals) => api<{ goals: Goals }>("/habits/goals", { method: "PUT", body: goals }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}
