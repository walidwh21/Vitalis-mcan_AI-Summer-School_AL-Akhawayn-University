import { Flame, MessagesSquare, Sparkles, SquarePen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/features/auth/AuthProvider";
import { DEFAULT_GOALS, useEntry, useGoals, useStreak } from "@/features/habits/api";
import { METRICS, MOOD_EMOJI } from "@/features/habits/metrics";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const { t, intlLocale } = useI18n();
  const { user } = useAuth();
  const today = todayISO();
  const entry = useEntry(today);
  const goals = useGoals().data ?? DEFAULT_GOALS;
  const streak = useStreak(today).data ?? 0;

  const firstName = user?.fullName.split(" ")[0] ?? "";
  const dateLabel = new Intl.DateTimeFormat(intlLocale, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const quote = t(`quote.${new Date().getDay()}` as MessageKey);
  const logged = entry.data;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("dashboard.greeting", { name: firstName })}</h1>
            <p className="mt-1 text-primary-foreground/80">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
            <Flame size={18} />
            {streak > 0 ? t("dashboard.streak", { count: streak }) : t("dashboard.noStreak")}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-warm/30 bg-warm/5 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 shrink-0 text-warm" size={20} />
              <div>
                <h2 className="font-semibold text-warm">{t("dashboard.inspiration")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80">{quote}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <h2 className="font-semibold">{t("dashboard.quickActions")}</h2>
            <Button asChild size="lg" className="w-full justify-start">
              <Link to="/assistant">
                <MessagesSquare size={20} />
                {t("dashboard.openAssistant")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full justify-start">
              <Link to="/habits">
                <SquarePen size={20} />
                {t("dashboard.logHabits")}
              </Link>
            </Button>
          </div>
        </div>

        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">{t("dashboard.todayProgress")}</h2>
          {entry.isSuccess && !logged && <p className="mb-4 text-sm text-muted-foreground">{t("dashboard.notLogged")}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const value = logged?.[m.key] ?? 0;
              const pct = Math.round((value / goals[m.key]) * 100);
              return (
                <Card key={m.key} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-full p-2.5", m.tint)}>
                        <Icon size={20} className={m.text} />
                      </div>
                      <div>
                        <h3 className="font-medium">{t(m.label)}</h3>
                        <p className="text-xs text-muted-foreground">
                          {value} / {goals[m.key]} {t(m.unit)}
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-lg font-bold tabular-nums", m.text)}>{Math.min(pct, 999)}%</span>
                  </div>
                  <Progress value={pct} label={t(m.label)} indicatorClassName={m.bar} />
                </Card>
              );
            })}
            <Card className="flex items-center gap-4 p-5">
              <div className="text-4xl" aria-hidden>
                {logged?.mood ? MOOD_EMOJI[logged.mood] : "—"}
              </div>
              <div>
                <h3 className="font-medium">{t("habits.mood")}</h3>
                <p className="text-sm text-muted-foreground">{logged?.mood ? t(`mood.${logged.mood}`) : t("dashboard.notLogged")}</p>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
