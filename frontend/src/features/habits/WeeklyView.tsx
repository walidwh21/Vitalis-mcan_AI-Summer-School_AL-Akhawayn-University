import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { addDays, fromISODate, startOfWeek, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MOODS } from "@/types/api";
import { useWeek } from "./api";
import { METRICS, MOOD_EMOJI } from "./metrics";

export function WeeklyView() {
  const { t, intlLocale } = useI18n();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const { data: week, isLoading, isError, refetch } = useWeek(weekStart);

  const dayLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short" });
    return (date: string) => fmt.format(fromISODate(date));
  }, [intlLocale]);

  const rangeLabel = new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric" }).format(fromISODate(weekStart));
  const isCurrentWeek = weekStart === startOfWeek(todayISO());

  const chartData = (week?.days ?? []).map((d) => ({
    label: dayLabel(d.date),
    waterGlasses: d.entry?.waterGlasses ?? 0,
    sleepHours: d.entry?.sleepHours ?? 0,
    activityMinutes: d.entry?.activityMinutes ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("habits.week.range", { date: rangeLabel })}</h2>
          {week && <p className="text-sm text-muted-foreground">{t("habits.week.logged", { count: week.loggedDays })}</p>}
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" aria-label={t("habits.week.prev")} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </Button>
          <Button variant="outline" size="icon" aria-label={t("habits.week.next")} disabled={isCurrentWeek} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight size={18} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {isError && (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm">{t("habits.loadFailed")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </Card>
      )}

      {week && week.loggedDays === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">{t("habits.week.empty")}</Card>}

      {week && week.loggedDays > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {METRICS.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.key} className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon size={16} className={m.text} />
                    {t(m.label)}
                  </div>
                  <p className={cn("mt-1 text-2xl font-bold tabular-nums", m.text)}>
                    {week.averages[m.key]} <span className="text-sm font-normal text-muted-foreground">{t(m.unit)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("habits.week.avg")}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {METRICS.map((m) => (
              <Card key={m.key} className="p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  {t(m.label)} <span className="font-normal text-muted-foreground">({t(m.unit)})</span>
                </h3>
                <div className="h-44" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                      />
                      <ReferenceLine y={week.goals[m.key]} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                      <Bar dataKey={m.key} fill={`hsl(var(--metric-${m.key === "waterGlasses" ? "water" : m.key === "sleepHours" ? "sleep" : "activity"}))`} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">{t("habits.week.moods")}</h3>
            <ul className="flex flex-wrap gap-3">
              {MOODS.map((m) => (
                <li key={m} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm">
                  <span aria-hidden>{MOOD_EMOJI[m]}</span>
                  <span>{t(`mood.${m}`)}</span>
                  <span className="font-semibold tabular-nums">{week.moodCounts[m]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
