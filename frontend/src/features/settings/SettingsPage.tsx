import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { DEFAULT_GOALS, useGoals, useSaveGoals } from "@/features/habits/api";
import { METRICS } from "@/features/habits/metrics";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Goals } from "@/types/api";

const THEMES: { id: Theme; label: MessageKey }[] = [
  { id: "light", label: "settings.theme.light" },
  { id: "dark", label: "settings.theme.dark" },
  { id: "system", label: "settings.theme.system" },
];

export function SettingsPage() {
  const { t, locale } = useI18n();
  const { user, updateProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const goalsQuery = useGoals();
  const saveGoals = useSaveGoals();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  useEffect(() => {
    if (goalsQuery.data) setGoals(goalsQuery.data);
  }, [goalsQuery.data]);

  // Keep the stored language preference in sync with the one chosen in the UI.
  useEffect(() => {
    if (user && user.locale !== locale) void updateProfile({ locale }).catch(() => undefined);
  }, [locale, user, updateProfile]);

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ fullName: fullName.trim() });
      toast.success(t("settings.profile.saved"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSavingProfile(false);
    }
  };

  const submitGoals = (e: FormEvent) => {
    e.preventDefault();
    saveGoals.mutate(goals, {
      onSuccess: () => toast.success(t("settings.goals.saved")),
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">{t("settings.profile")}</h2>
        <form onSubmit={submitProfile} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={t("auth.fullName")}>
            <Input required maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Button type="submit" disabled={savingProfile || !fullName.trim() || fullName.trim() === user?.fullName}>
            {savingProfile ? t("common.saving") : t("common.save")}
          </Button>
        </form>
        <p className="mt-3 text-sm text-muted-foreground">{user?.email}</p>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-semibold">{t("settings.preferences")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("common.language")}</span>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("settings.theme")}</span>
          <div className="inline-flex rounded-md border bg-card p-0.5" role="group">
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                aria-pressed={theme === th.id}
                onClick={() => setTheme(th.id)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium",
                  theme === th.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(th.label)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">{t("settings.goals")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("settings.goals.hint")}</p>
        <form onSubmit={submitGoals} className="grid gap-4 sm:grid-cols-3">
          {METRICS.map((m) => (
            <Field key={m.key} label={`${t(m.label)} (${t(m.unit)})`}>
              <Input
                type="number"
                inputMode="decimal"
                required
                min={m.key === "activityMinutes" ? 5 : 1}
                max={m.key === "sleepHours" ? 16 : m.key === "waterGlasses" ? 30 : 600}
                step={m.key === "sleepHours" ? 0.5 : 1}
                value={goals[m.key]}
                onChange={(e) => setGoals((g) => ({ ...g, [m.key]: Number(e.target.value) }))}
              />
            </Field>
          ))}
          <div className="sm:col-span-3">
            <Button type="submit" disabled={saveGoals.isPending}>
              {saveGoals.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="max-w-md text-xs text-muted-foreground">{t("settings.about")}</p>
        <Button variant="destructive" onClick={signOut}>
          <LogOut size={16} />
          {t("common.signOut")}
        </Button>
      </Card>
    </div>
  );
}
