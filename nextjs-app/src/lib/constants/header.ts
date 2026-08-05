import type { Locale } from "@/types";

export const NAV_LINKS = [
  { href: "#card-tonight", key: "nav_tonight" },
  { href: "#card-active-const", key: "nav_active_const" },
  { href: "#card-targets", key: "nav_target_db" },
  { href: "#card-motion", key: "card_motion" },
  { href: "#card-weekly", key: "nav_weekly" },
] as const;

export const LANG_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "\u{1F1FA}\u{1F1F8} EN" },
  { value: "es", label: "\u{1F1EA}\u{1F1F8} ES" },
  { value: "pt", label: "\u{1F1F7}\u{1F1F7} PT" },
];
