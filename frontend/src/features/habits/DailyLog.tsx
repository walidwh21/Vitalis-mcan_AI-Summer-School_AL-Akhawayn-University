import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { MOODS } from "@/types/api";
import type { Goals, HabitEntry, Mood } from "@/types/api";
import { useSaveEntry } from "./api";
import { METRICS, MOOD_EMOJI } from "./metrics";

interface Props {
  date: string;
  entry: HabitEntry | null;
  goals: Goals;
}

/** Mount with `key={date}` so the draft re-initialises when the day changes. */
export function DailyLog({ date, entry, goals }: Props) {
  const { t } = useI18n();
  const save = useSaveEntry();
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [values, setValues] = useState<Goals>({
    waterGlasses: entry?.waterGlasses ?? 0,
    sleepHours: entry?.sleepHours ?? 0,
    activityMinutes: entry?.activityMinutes ?? 0,
  });

  const submit = () =>
    save.mutate(
      { date, patch: { ...values, ...(mood ? { mood } : {}) } },
      {
        onSuccess: () => toast.success(t("habits.saved"), { description: t("habits.savedBody") }),
        onError: () => toast.error(t("habits.saveFailed")),
      },
    );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit p-6 lg:col-span-1">
        <h2 className="mb-4 font-semibold">{t("habits.howFeeling")}</h2>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t("habits.mood")}>
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mood === m}
              aria-label={t(`mood.${m}`)}
              onClick={() => setMood(m)}
              className={cn(
                "rounded-lg p-2 text-2xl transition-all",
                mood === m ? "scale-110 bg-metric-mood/20 shadow" : "hover:bg-muted",
              )}
            >
              {MOOD_EMOJI[m]}
            </button>
          ))}
        </div>
        <p className="mt-3 h-5 text-center text-sm font-medium text-metric-mood">{mood ? t(`mood.${mood}`) : ""}</p>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const goal = goals[metric.key];
          const value = values[metric.key];
          const set = (next: number) =>
            setValues((v) => ({ ...v, [metric.key]: Math.min(metric.max, Math.max(metric.min, next)) }));
          return (
            <Card key={metric.key} className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-full p-2.5", metric.tint)}>
                    <Icon size={22} className={metric.text} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t(metric.label)}</h3>
                    <p className="text-xs text-muted-foreground">{t("habits.goal", { goal, unit: t(metric.unit) })}</p>
                  </div>
                </div>
                <div className="text-end">
                  <span className={cn("text-2xl font-bold tabular-nums", metric.text)}>{value}</span>
                  <p className="text-xs text-muted-foreground">{t(metric.unit)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label="−" onClick={() => set(value - metric.step)}>
                  <Minus size={16} />
                </Button>
                <Slider
                  value={value}
                  onChange={set}
                  min={metric.min}
                  max={metric.max}
                  step={metric.step}
                  label={t(metric.label)}
                  trackClassName={metric.bar}
                />
                <Button variant="outline" size="icon" aria-label="+" onClick={() => set(value + metric.step)}>
                  <Plus size={16} />
                </Button>
              </div>
              <Progress value={(value / goal) * 100} label={t(metric.label)} className="mt-4 h-2" indicatorClassName={metric.bar} />
            </Card>
          );
        })}

        <Button size="lg" className="w-full" onClick={submit} disabled={save.isPending}>
          <Check size={18} />
          {save.isPending ? t("common.saving") : t("habits.saveDay")}
        </Button>
      </div>
    </div>
  );
}
