import type { Locale } from "@/types";

// `label` entries are hardcoded English, matching web/index.html's nav links that
// never had a data-i18n attribute (Plan My Night, Sky Objects in Motion sub-sections,
// Aurora & Space Weather, Light Pollution Map, Interactive 3D Solar System). Only
// `key` entries go through next-intl.
export const NAV_LINKS = [
  { href: "#card-tonight", key: "nav_tonight" },
  { href: "#card-active-const", key: "nav_active_const" },
  { href: "#card-targets", key: "nav_target_db" },
  { href: "#card-motion", key: "card_motion" },
  { href: "#card-weekly", key: "nav_weekly" },
  { href: "#card-solar-system-scope", label: "Interactive 3D Solar System" },
  { href: "#card-light-pollution", label: "Light Pollution Map" },
  { href: "#card-space-weather", label: "Aurora & Space Weather" },
] as const;

export const LANG_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "\u{1F310} EN" },
  { value: "es", label: "\u{1F310} ES" },
  { value: "pt", label: "\u{1F310} PT" },
];
