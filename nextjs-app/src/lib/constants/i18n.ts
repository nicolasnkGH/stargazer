import type { Locale } from "@/types";

export const LOCALES: Locale[] = ["en", "es", "pt"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";
export const MOON_FACT_STORAGE_KEY_PREFIX = "stargazer_moon_fact_";
export const UNITS_STORAGE_KEY = "stargazer_units";
export const STARGAZER_REPO_URL = "https://github.com/nicolasnkGH/stargazer";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as string[]).includes(value);
}
