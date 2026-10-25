import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@/types/api";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import type { MessageKey, Messages } from "./locales/en";
import { fr } from "./locales/fr";

export type { MessageKey };

const CATALOGS: Record<Locale, Messages> = { en, fr, ar };
const STORAGE_KEY = "vitalis.locale";

export const LOCALES: { id: Locale; label: string; dir: "ltr" | "rtl"; intl: string }[] = [
  { id: "en", label: "English", dir: "ltr", intl: "en-US" },
  { id: "fr", label: "Français", dir: "ltr", intl: "fr-FR" },
  { id: "ar", label: "العربية", dir: "rtl", intl: "ar" },
];

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in CATALOGS) return saved;
  } catch {
    /* storage unavailable */
  }
  const preferred = navigator.language.slice(0, 2);
  return preferred in CATALOGS ? (preferred as Locale) : "en";
}

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  intlLocale: string;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const meta = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]!;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale, meta.dir]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: meta.dir,
      intlLocale: meta.intl,
      setLocale,
      t: (key, vars) => {
        const template = CATALOGS[locale][key] ?? en[key];
        return vars ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : template;
      },
    }),
    [locale, meta, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
