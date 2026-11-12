import { createContext, useContext, useMemo, type ReactNode } from "react";
import { en, ru, type Dictionary } from "./messages";

export type Locale = "en" | "ru";

export const LOCALES: Array<{ id: Locale; label: string; short: string }> = [
  { id: "en", label: "English", short: "EN" },
  { id: "ru", label: "Русский", short: "RU" },
];

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru };

export function detectLocale(preference: string): Locale {
  if (preference === "en" || preference === "ru") return preference;
  const system = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  return system.startsWith("ru") ? "ru" : "en";
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export interface I18nValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  number: (value: number) => string;
  date: (value: string | Date) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const dictionary = DICTIONARIES[locale] ?? en;
    const number = new Intl.NumberFormat(locale);
    const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
    return {
      locale,
      t: (key, vars) => interpolate(dictionary[key] ?? en[key] ?? key, vars),
      number: (input) => number.format(input),
      date: (input) => date.format(typeof input === "string" ? new Date(input) : input),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n outside I18nProvider");
  return value;
}
