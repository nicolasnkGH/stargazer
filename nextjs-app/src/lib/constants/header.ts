import type { Locale } from "@/types";

// `label` entries are hardcoded English, matching web/index.html's nav links that
// never had a data-i18n attribute. Only `key` entries go through next-intl. Order
// follows card order in app/page.tsx so the menu reads top-to-bottom like the page.
export const NAV_LINKS = [
  { href: "#card-tonight", key: "nav_tonight" },
  { href: "#card-weather", label: "Clear Outside Weather Forecast" },
  { href: "#card-active-const", key: "nav_active_const" },
  { href: "#card-constellations", label: "Constellations Tonight" },
  { href: "#card-targets", key: "nav_target_db" },
  { href: "#card-ai-targets", label: "AI Picks & Observer Briefing" },
  { href: "#card-planets", label: "Planets Tonight" },
  { href: "#card-solar-system-scope", label: "Interactive 3D Solar System" },
  { href: "#card-preflight", label: "Observing Pre-Flight Checklist" },
  { href: "#card-plan-my-night", label: "Plan My Night Scheduler" },
  { href: "#card-log", label: "Observation Log" },
  { href: "#card-weekly", key: "nav_weekly" },
  { href: "#card-light-pollution", label: "Light Pollution Map" },
  { href: "#card-space-weather", label: "Aurora & Space Weather" },
  { href: "#card-optics", label: "Telescope Optics Calculator" },
  { href: "#apod-card", label: "NASA Astronomy Picture of the Day" },
] as const;

export const LANG_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "\u{1F310} EN" },
  { value: "es", label: "\u{1F310} ES" },
  { value: "pt", label: "\u{1F310} PT" },
];

// Night Vision Mode — matches the legacy web/app.js localStorage key so the
// setting survives the cutover from the vanilla build.
export const NIGHT_MODE_STORAGE_KEY = "stargazer_night_mode";
