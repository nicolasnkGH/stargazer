"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import Icon from "./Icon";
import {
  HEALTH_POLL_INTERVAL_MS,
  HUD_POLL_INTERVAL_MS,
  NAV_LINKS,
  LANG_OPTIONS,
  LOCALE_COOKIE,
  UNITS_STORAGE_KEY,
} from "@/lib/constants";
import type { Locale, TonightReport } from "@/types";
import Modal from "./Modal";
import LocationControl from "./LocationControl";
import DataSettingsModal from "./DataSettingsModal";
import { startOnboardingTour } from "./OnboardingTour";

const TOUR_PROMPT_KEY = "stargazer_tour_prompt_dismissed";

const healthFetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

function setLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const { data: health, error: healthError } = useSWR<{ status: string }>("/api/health", healthFetcher, {
    refreshInterval: HEALTH_POLL_INTERVAL_MS,
    revalidateOnFocus: false,
  });
  const isChecking = !health && !healthError;
  const isLive = !healthError && health?.status === "ok";
  const { data: tonight } = useSWR<TonightReport>("/api/tonight", healthFetcher, {
    refreshInterval: HUD_POLL_INTERVAL_MS,
    revalidateOnFocus: false,
  });
  const [currentTime, setCurrentTime] = useState("--:-- --");
  const [currentDate, setCurrentDate] = useState("Loading...");
  const [isMetric, setIsMetric] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dataSettingsOpen, setDataSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(TOUR_PROMPT_KEY);
      if (!dismissed) {
        const timer = setTimeout(() => setShowTourPrompt(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismissTourPrompt = () => {
    setShowTourPrompt(false);
    try {
      localStorage.setItem(TOUR_PROMPT_KEY, "1");
    } catch {
      // ignore
    }
  };

  const moon = tonight?.moon;
  const hudMoon = moon
    ? (() => {
        const pct = moon.illumination_pct != null ? `${moon.illumination_pct}%` : "";
        const rawName = (moon.phase_name || "Moon").trim();
        // Check if rawName already starts with an emoji (e.g. 🌔 Waxing Gibbous)
        const hasEmoji = /\p{Extended_Pictographic}/u.test(rawName.slice(0, 2));
        const icon = hasEmoji ? "" : `${moon.emoji || "🌙"} `;
        return `${icon}${rawName} ${pct}`.trim();
      })()
    : locale === "pt" ? "🌙 Lua --%" : locale === "es" ? "🌙 Luna --%" : "🌙 Moon --%";

  const seeingLabel = locale === "pt" ? "Seeing" : locale === "es" ? "Seeing" : "Seeing";
  const dewLabel = locale === "pt" ? "Orvalho Δ" : locale === "es" ? "Rocío Δ" : "Dew Δ";

  const seeing = tonight?.seeing;
  const hudWeather = seeing
    ? (() => {
        const tVal = seeing.tonight_temp_c;
        const tempStr = tVal != null ? (isMetric ? `${tVal}°C` : `${Math.round((tVal * 9) / 5 + 32)}°F`) : "--";
        const wVal = seeing.tonight_wind_kmh;
        const windStr = wVal != null ? (isMetric ? `${wVal} km/h` : `${Math.round(wVal * 0.621371)} mph`) : "--";
        const parts = [`🌡️ ${tempStr}`, `💨 ${windStr}`];
        if (seeing.tonight_cloud_pct != null) {
          parts.push(`☁️ ${Math.round(seeing.tonight_cloud_pct)}%`);
        }
        if (seeing.seeing_score != null) {
          parts.push(`👁️ ${seeingLabel} ${seeing.seeing_score}/5`);
        }
        if (seeing.tonight_dew_spread != null) {
          parts.push(`💧 ${dewLabel} ${seeing.tonight_dew_spread}°C`);
        }
        return parts.join(" | ");
      })()
    : "🌡️ -- | 💨 --";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMetric(localStorage.getItem(UNITS_STORAGE_KEY) !== "imperial");
  }, []);

  function toggleUnits() {
    const next = !isMetric;
    localStorage.setItem(UNITS_STORAGE_KEY, next ? "metric" : "imperial");
    window.location.reload();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const dateLocale = locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString(dateLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locale]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-cyan-500/15 bg-slate-950/95 py-2 px-2 sm:px-6 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] w-full">
      <div className="mx-auto flex max-w-full flex-nowrap items-center justify-between gap-1.5 sm:gap-4">
        {/* Logo */}
        <a href="#hero-section" className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2.5 no-underline">
          <Icon name="telescope" className="h-5 w-5 sm:h-6 sm:w-6 animate-float text-sky-400 drop-shadow-[0_0_12px_rgba(74,158,255,0.5)]" />
          <span
            className="hidden xs:inline whitespace-nowrap bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-base sm:text-[1.4rem] font-bold leading-tight tracking-tight text-transparent"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            StarGazer
          </span>
        </a>

        {/* Location Pill */}
        <div className="flex flex-shrink min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-none items-center rounded-full border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 sm:px-3 sm:py-1 text-xs text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:border-sky-400 transition-all truncate">
          <LocationControl />
        </div>

        {/* Telemetry pill */}
        <div id="desktop-telemetry-strip" className="hidden sm:flex min-w-0 flex-1 items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
          <div className="flex flex-shrink-0 items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.12em]">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isChecking ? "bg-zinc-500" : isLive ? "animate-pulse bg-green-500" : "bg-red-500"
              }`}
            />
            <span className={isChecking ? "text-zinc-400" : isLive ? "text-green-500" : "text-red-500"}>
              {isChecking ? "..." : isLive ? t("telemetry_live") : t("telemetry_offline")}
            </span>
          </div>
          <span className="h-4 w-px flex-shrink-0 bg-white/10" />
          <span id="hud-moon" className="flex-shrink-0 font-mono text-[0.75rem] text-slate-300">{hudMoon}</span>
          <span className="h-4 w-px flex-shrink-0 bg-white/10" />
          <span id="hud-weather" className="flex-shrink-0 font-mono text-[0.75rem] text-slate-300 whitespace-nowrap">{hudWeather}</span>
        </div>

        {/* Right side controls */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          {/* Clock */}
          <div className="hidden items-center gap-2 whitespace-nowrap font-mono md:flex">
            <span id="clock" className="text-[0.85rem]">{currentTime}</span>
            <span id="date-display" className="text-[0.75rem] text-zinc-400">{currentDate}</span>
          </div>

          <button
            onClick={toggleUnits}
            className="flex h-8 sm:h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-1.5 sm:px-2.5 text-[0.7rem] sm:text-xs text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
            title={t("title_toggle_units")}
          >
            {isMetric ? "°C/km" : "°F/mi"}
          </button>

          <select
            className="rounded-lg border border-white/10 bg-slate-900/60 py-1 px-1 sm:px-2 text-xs text-zinc-200 outline-none hover:border-white/30 cursor-pointer"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            title={t("title_select_language")}
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="relative">
            <button
              id="btn-about"
              onClick={() => {
                dismissTourPrompt();
                startOnboardingTour(t);
              }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50 relative"
              title={t("title_dashboard_tour")}
            >
              <Icon name="info" className="h-4 w-4" />
              {showTourPrompt && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </span>
              )}
            </button>

            {showTourPrompt && (
              <div
                className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl border border-sky-500/30 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-2xl z-[160] ring-1 ring-white/10"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                    <Icon name="sparkles" className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t("tour_prompt_title")}</span>
                  </div>
                  <button
                    onClick={dismissTourPrompt}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                    title={t("title_dismiss_tour_suggestion")}
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[0.72rem] text-zinc-300 leading-relaxed mb-3">
                  {t("tour_prompt_desc")}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      dismissTourPrompt();
                      startOnboardingTour(t);
                    }}
                    className="flex-1 rounded-lg bg-gradient-to-r from-sky-500/20 to-blue-600/20 border border-sky-500/40 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 transition-all text-center shadow-lg"
                  >
                    {t("tour_prompt_start")}
                  </button>
                  <button
                    onClick={dismissTourPrompt}
                    className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {t("tour_prompt_close")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menu button + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              id="btn-menu"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              onClick={() => setMenuOpen(!menuOpen)}
              title={t("title_navigation")}
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-cyan-500/20 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl z-[150]"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                <div className="border-b border-white/10 pb-1 mb-1">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => {
                        setMenuOpen(false);
                        const id = link.href.replace("#", "");
                        const TAB_MAP: Record<string, string> = {
                          "card-active-const": "sky",
                          "card-constellations": "sky",
                          "card-targets": "sky",
                          "card-ai-targets": "ai",
                          "card-planets": "planets",
                          "card-solar-system-scope": "planets",
                          "card-plan-my-night": "plan",
                          "card-preflight": "plan",
                          "card-log": "plan",
                          "card-weekly": "tools",
                          "card-light-pollution": "tools",
                          "card-space-weather": "tools",
                          "card-optics": "tools",
                          "card-resources": "tools",
                        };
                        if (TAB_MAP[id]) {
                          window.dispatchEvent(new CustomEvent("sg-navigate-tab", { detail: { tab: TAB_MAP[id] } }));
                        }
                        setTimeout(() => {
                          const target = document.getElementById(id);
                          if (target) target.scrollIntoView({ behavior: "smooth" });
                        }, 60);
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icon name="star" className="h-4 w-4 text-sky-400" />
                      <span>{t(link.key, { defaultValue: link.key })}</span>
                    </a>
                  ))}
                </div>

                <div>
                  <button
                    onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon name="info" className="h-4 w-4 text-purple-400" />
                    <span>{t("about_stargazer")}</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setDataSettingsOpen(true); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon name="database" className="h-4 w-4 text-amber-400" />
                    <span>{t("data_offline_settings")}</span>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-2 my-1 px-3">
                  <div className="text-[0.68rem] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">{t("label_language_idioma")}</div>
                  <div className="flex items-center gap-1.5">
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLocale(opt.value)}
                        className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                          locale === opt.value
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Telemetry Sub-strip (Visible on mobile screens < 640px) */}
      <div id="mobile-telemetry-strip" className="flex sm:hidden w-full items-center justify-between gap-2.5 border-t border-cyan-500/15 pt-1 mt-1 text-[0.68rem] font-mono text-zinc-300 overflow-x-auto scrollbar-none px-1">
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${isChecking ? "bg-zinc-500" : isLive ? "animate-pulse bg-green-500" : "bg-red-500"}`} />
          <span className={`font-bold tracking-wider ${isChecking ? "text-zinc-400" : isLive ? "text-green-400" : "text-red-400"}`}>
            {isChecking ? "..." : isLive ? t("telemetry_live") : t("telemetry_offline")}
          </span>
        </div>
        <span className="h-3 w-px bg-white/15 flex-shrink-0" />
        <span className="truncate flex-shrink-0 text-slate-200">{hudMoon}</span>
        <span className="h-3 w-px bg-white/15 flex-shrink-0" />
        <span className="truncate flex-shrink-0 text-cyan-300">{hudWeather}</span>
        <span className="h-3 w-px bg-white/15 flex-shrink-0" />
        <span className="flex-shrink-0 text-zinc-400 font-sans whitespace-nowrap">{currentTime} • {currentDate}</span>
      </div>

      {aboutOpen && <Modal open={aboutOpen} title={t("about_stargazer_v3")} onClose={() => setAboutOpen(false)}><div>{t("dashboard_built_desc")}</div></Modal>}
      {dataSettingsOpen && <DataSettingsModal open={dataSettingsOpen} onClose={() => setDataSettingsOpen(false)} />}
    </header>
  );
}
