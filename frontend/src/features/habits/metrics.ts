import { Activity, Droplets, Moon } from "lucide-react";
import type { MessageKey } from "@/i18n";
import type { Goals, Mood } from "@/types/api";

export interface MetricDef {
  key: keyof Goals;
  icon: typeof Droplets;
  label: MessageKey;
  unit: MessageKey;
  text: string;
  tint: string;
  bar: string;
  min: number;
  max: number;
  step: number;
}

/** Tailwind classes are spelled out in full so the compiler can see them. */
export const METRICS: MetricDef[] = [
  {
    key: "waterGlasses",
    icon: Droplets,
    label: "habits.water",
    unit: "habits.unit.water",
    text: "text-metric-water",
    tint: "bg-metric-water/10",
    bar: "bg-metric-water",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "sleepHours",
    icon: Moon,
    label: "habits.sleep",
    unit: "habits.unit.sleep",
    text: "text-metric-sleep",
    tint: "bg-metric-sleep/10",
    bar: "bg-metric-sleep",
    min: 0,
    max: 14,
    step: 0.5,
  },
  {
    key: "activityMinutes",
    icon: Activity,
    label: "habits.activity",
    unit: "habits.unit.activity",
    text: "text-metric-activity",
    tint: "bg-metric-activity/10",
    bar: "bg-metric-activity",
    min: 0,
    max: 180,
    step: 5,
  },
];

export const MOOD_EMOJI: Record<Mood, string> = {
  very_low: "😞",
  low: "🙁",
  neutral: "😐",
  good: "🙂",
  great: "😄",
};
