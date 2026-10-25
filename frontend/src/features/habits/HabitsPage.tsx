import { BarChart3, CalendarDays, Flame } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { todayISO } from "@/lib/dates";
import { DEFAULT_GOALS, useEntry, useGoals, useStreak } from "./api";
import { DailyLog } from "./DailyLog";
import { WeeklyView } from "./WeeklyView";

export function HabitsPage() {
  const { t } = useI18n();
  const today = todayISO();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const entry = useEntry(today);
  const goals = useGoals();
  const streak = useStreak(today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t("habits.title")}</h1>
          <p className="text-muted-foreground">{t(tab === "daily" ? "habits.subtitle.daily" : "habits.subtitle.weekly")}</p>
        </div>
        <div className="flex items-center gap-3">
          {!!streak.data && (
            <div className="flex items-center gap-2 rounded-xl bg-warm/10 px-3 py-2 text-warm">
              <Flame size={20} />
              <span className="font-bold tabular-nums">{streak.data}</span>
            </div>
          )}
          <div className="flex rounded-lg bg-muted p-1" role="tablist">
            <Button role="tab" aria-selected={tab === "daily"} size="sm" variant={tab === "daily" ? "primary" : "ghost"} onClick={() => setTab("daily")}>
              <CalendarDays size={15} />
              {t("habits.tab.daily")}
            </Button>
            <Button role="tab" aria-selected={tab === "weekly"} size="sm" variant={tab === "weekly" ? "primary" : "ghost"} onClick={() => setTab("weekly")}>
              <BarChart3 size={15} />
              {t("habits.tab.weekly")}
            </Button>
          </div>
        </div>
      </div>

      {tab === "weekly" ? (
        <WeeklyView />
      ) : entry.isError ? (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm">{t("habits.loadFailed")}</p>
          <Button variant="outline" onClick={() => entry.refetch()}>
            {t("common.retry")}
          </Button>
        </Card>
      ) : entry.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <DailyLog key={today} date={today} entry={entry.data ?? null} goals={goals.data ?? DEFAULT_GOALS} />
      )}
    </div>
  );
}
