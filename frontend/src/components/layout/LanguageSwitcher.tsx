import { LOCALES, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("common.language")} className={cn("inline-flex rounded-md border bg-card p-0.5", className)}>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          onClick={() => setLocale(l.id)}
          aria-pressed={locale === l.id}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            locale === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
