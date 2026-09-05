import type { Locale } from "@/types";

// All NAV_LINKS use `key` for i18n via next-intl.
// Order follows card order in app/page.tsx so the menu reads top-to-bottom like the page.
export const NAV_LINKS = [
  { href: "#card-tonight", key: "nav_tonight" },
  { href: "#card-weather", key: "nav_weather" },
  { href: "#card-active-const", key: "nav_active_const" },
  { href: "#card-constellations", key: "nav_constellations" },
  { href: "#card-targets", key: "nav_target_db" },
  { href: "#card-ai-targets", key: "nav_ai_targets" },
  { href: "#card-planets", key: "nav_planets" },
  { href: "#card-solar-system-scope", key: "nav_solar_system" },
  { href: "#card-preflight", key: "nav_preflight" },
  { href: "#card-plan-my-night", key: "nav_plan_my_night" },
  { href: "#card-log", key: "nav_log" },
  { href: "#card-weekly", key: "nav_weekly" },
  { href: "#card-light-pollution", key: "nav_light_pollution" },
  { href: "#card-space-weather", key: "nav_space_weather" },
  { href: "#card-optics", key: "nav_optics" },
  { href: "#apod-card", key: "nav_apod" },
] as const;

export const LANG_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "🌐 EN" },
  { value: "es", label: "🌐 ES" },
  { value: "pt", label: "🌐 PT" },
];

export const NIGHT_MODE_STORAGE_KEY = "stargazer_night_mode";
