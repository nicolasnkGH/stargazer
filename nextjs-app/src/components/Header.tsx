"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";

function TelemetryBadge({
  text,
  tooltip,
}: {
  text: React.ReactNode;
  tooltip: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className="relative flex items-center cursor-help rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors flex-shrink-0"
    >
      <span className="whitespace-nowrap font-mono text-[0.75rem] text-slate-300 hover:text-sky-300 transition-colors flex items-center">
        {text}
      </span>
      {showTooltip && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-[300] w-max max-w-[260px] sm:max-w-xs rounded-xl border border-sky-400/40 bg-slate-950/95 px-3 py-2 text-[0.72rem] font-medium leading-snug text-slate-100 shadow-2xl backdrop-blur-md text-center whitespace-normal pointer-events-none">
          {tooltip}
          <div className="absolute bottom-full left-1/2 -ml-1.5 border-4 border-transparent border-b-slate-950" />
        </div>
      )}
    </div>
  );
}
import Icon from "./Icon";
import {
  HEALTH_POLL_INTERVAL_MS,
  HUD_POLL_INTERVAL_MS,
  NAV_LINKS,
  LANG_OPTIONS,
  LOCALE_COOKIE,
  UNITS_STORAGE_KEY,
} from "@/lib/constants";
import type { Locale, TonightReport, BortleInfo } from "@/types";
import Modal from "./Modal";
import LocationControl from "./LocationControl";
import { parseLocationCookie } from "@/lib/location-cookie";
import { useClientLocation } from "@/hooks/useClientLocation";
import DataSettingsModal from "./DataSettingsModal";
import { startOnboardingTour } from "./OnboardingTour";

const TOUR_PROMPT_KEY = "stargazer_tour_prompt_dismissed";

const healthFetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

function parseTimeToMinutes(tStr: string | null | undefined): number | null {
  if (!tStr) return null;
  const str = tStr.trim();

  // Try 12-hour format with AM/PM
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Try 24-hour format HH:MM
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function useDarkInCountdown(
  astroStart: string | null | undefined,
  astroEnd: string | null | undefined,
  locale: string
): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const startMin = parseTimeToMinutes(astroStart);
      const endMin = parseTimeToMinutes(astroEnd);

      if (startMin === null) {
        setDisplay(null);
        return;
      }

      if (currentMin < startMin && (endMin === null || currentMin >= endMin)) {
        const remaining = startMin - currentMin;
        const inPrefix = locale === "pt" ? "em" : locale === "es" ? "en" : "in";
        setDisplay(`${inPrefix} ${formatDuration(remaining)}`);
      } else if (
        currentMin >= startMin ||
        (endMin !== null && currentMin < endMin)
      ) {
        const activeLabel = locale === "pt" ? "Ativo" : locale === "es" ? "Activo" : "Active";
        setDisplay(activeLabel);
      } else {
        setDisplay(null);
      }
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [astroStart, astroEnd, locale]);

  return display;
}

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
  const coords = useClientLocation();
  const locSearch = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";

  const { data: health, error: healthError } = useSWR<{ status: string }>("/api/health", healthFetcher, {
    refreshInterval: HEALTH_POLL_INTERVAL_MS,
    revalidateOnFocus: false,
  });
  const isChecking = !health && !healthError;
  const isLive = !healthError && health?.status === "ok";
  const { data: tonight } = useSWR<TonightReport>(locSearch ? `/api/tonight${locSearch}` : "/api/tonight", healthFetcher, {
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

  const { data: bortleData } = useSWR<BortleInfo>(
    `/api/bortle${locSearch}`,
    healthFetcher,
    {
      refreshInterval: 3600000,
      revalidateOnFocus: false,
    }
  );

  const darkInStr = useDarkInCountdown(
    tonight?.twilight_timeline?.astro_start,
    tonight?.twilight_timeline?.astro_end,
    locale
  );

  const seeing = tonight?.seeing;
  const weatherItems: { text: string; tooltip: string }[] = [];

  if (seeing) {
    const tVal = seeing.tonight_temp_c;
    const tempStr = tVal != null ? (isMetric ? `${tVal}°C` : `${Math.round((tVal * 9) / 5 + 32)}°F`) : "--";
    weatherItems.push({
      text: `🌡️ ${tempStr}`,
      tooltip:
        locale === "pt"
          ? "Temperatura ambiente externa prevista para esta noite"
          : locale === "es"
          ? "Temperatura ambiente exterior prevista para esta noche"
          : "Outdoor ambient temperature forecast for tonight",
    });

    const wVal = seeing.tonight_wind_kmh;
    const windStr = wVal != null ? (isMetric ? `${wVal} km/h` : `${Math.round(wVal * 0.621371)} mph`) : "--";
    weatherItems.push({
      text: `💨 ${windStr}`,
      tooltip:
        locale === "pt"
          ? "Velocidade do vento (ventos fortes provocam trepidação no telescópio)"
          : locale === "es"
          ? "Velocidad del viento (vientos fuertes causan vibración en el telescopio)"
          : "Wind speed (high winds cause telescope tube vibration)",
    });

    if (seeing.tonight_cloud_pct != null) {
      weatherItems.push({
        text: `☁️ ${Math.round(seeing.tonight_cloud_pct)}%`,
        tooltip:
          locale === "pt"
            ? "Porcentagem total de cobertura de nuvens no céu"
            : locale === "es"
            ? "Porcentaje total de cobertura de nubes en el cielo"
            : "Total sky cloud cover percentage",
      });
    }

    if (seeing.seeing_score != null) {
      weatherItems.push({
        text: `👁️ ${seeingLabel} ${seeing.seeing_score}/5`,
        tooltip:
          locale === "pt"
            ? "Índice de estabilidade atmosférica / Seeing (5/5 = visão perfeita e estável)"
            : locale === "es"
            ? "Índice de estabilidad atmosférica / Seeing (5/5 = visión cristalina)"
            : "Atmospheric turbulence & astronomical seeing score (5/5 = sharp steady views)",
      });
    }

    if (seeing.tonight_dew_spread != null) {
      weatherItems.push({
        text: `💧 ${dewLabel} ${seeing.tonight_dew_spread}°C`,
        tooltip:
          locale === "pt"
            ? "Margem de orvalho (diferença temp/orvalho). Valores < 2°C indicam risco de embaçamento"
            : locale === "es"
            ? "Margen de rocío (diferencia temp/rocío). Valores < 2°C indican riesgo de empañamiento"
            : "Dew point spread (temp vs dew point). Values under 2°C risk optics fogging",
      });
    }
  }

  if (darkInStr) {
    const isActive = darkInStr === "Active" || darkInStr === "Ativo" || darkInStr === "Activo";
    weatherItems.push({
      text: `🌑 Dark ${darkInStr}`,
      tooltip: isActive
        ? locale === "pt"
          ? "Céu astronômico totalmente escuro no momento (Sol < -18°)"
          : locale === "es"
          ? "Cielo astronómico totalmente oscuro actualmente (Sol < -18°)"
          : "Complete astronomical darkness is currently active (Sun below -18°)"
        : locale === "pt"
        ? "Tempo até o início do céu totalmente escuro (noite astronômica, Sol < -18°)"
        : locale === "es"
        ? "Tiempo hasta el inicio del cielo totalmente oscuro (noche astronómica, Sol < -18°)"
        : "Countdown until complete astronomical darkness begins (Sun below -18°)",
    });
  }

  const bVal = bortleData?.bortle ?? 6;
  weatherItems.push({
    text: `🌌 B${bVal}`,
    tooltip:
      locale === "pt"
        ? `Escala Bortle de céu escuro (Classe ${bVal} - ${bortleData?.name || "Poluição Luminosa"}). Classe 1 = intocado, 9 = urbano`
        : locale === "es"
        ? `Escala Bortle de cielo oscuro (Clase ${bVal} - ${bortleData?.name || "Contaminación Luminosa"}). Clase 1 = prístino, 9 = urbano`
        : `Bortle Dark Sky Scale (Class ${bVal} - ${bortleData?.name || "Light Pollution"}). Class 1 = Pristine, 9 = Inner-city`,
  });

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
        <a href="#hero-section" aria-label="StarGazer Home" className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2.5 no-underline">
          <Icon name="telescope" className="h-5 w-5 sm:h-6 sm:w-6 animate-float text-sky-400 drop-shadow-[0_0_12px_rgba(74,158,255,0.5)]" />
          <span
            className="hidden xs:inline whitespace-nowrap bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-base sm:text-[1.4rem] font-bold leading-tight tracking-tight text-transparent"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            StarGazer
          </span>
        </a>

        {/* Location Pill */}
        <div className="flex flex-shrink min-w-0 max-w-[130px] xs:max-w-[170px] sm:max-w-[210px] md:max-w-[250px] items-center rounded-full border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 sm:px-3 sm:py-1 text-xs text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:border-sky-400 transition-all truncate">
          <LocationControl />
        </div>

        {/* Telemetry pill (Visible on xl screens >= 1280px) */}
        <div id="desktop-telemetry-strip" className="hidden xl:flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 overflow-visible rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
          <TelemetryBadge
            text={
              isChecking ? (
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                  ... LIVE
                </span>
              ) : isLive ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  OFFLINE
                </span>
              )
            }
            tooltip={
              locale === "pt"
                ? "Status de conexão em tempo real com a API de telemetria"
                : locale === "es"
                ? "Estado de conexión en tiempo real con la API de telemetría"
                : "Real-time API & astronomical telemetry connection status"
            }
          />

          <span className="h-3.5 w-px flex-shrink-0 bg-white/15" />

          <TelemetryBadge
            text={hudMoon}
            tooltip={
              locale === "pt"
                ? "Fase lunar atual e porcentagem de iluminação visível"
                : locale === "es"
                ? "Fase lunar actual y porcentaje de iluminación visible"
                : "Current lunar phase & visible illumination percentage"
            }
          />

          {weatherItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <span className="h-3.5 w-px flex-shrink-0 bg-white/15" />
              <TelemetryBadge text={item.text} tooltip={item.tooltip} />
            </React.Fragment>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {/* Clock (Visible on 2xl screens >= 1536px) */}
          <div className="hidden items-center gap-2 whitespace-nowrap font-mono 2xl:flex">
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

      {/* Telemetry Sub-strip (Visible on screens < 1280px / xl) */}
      <div id="mobile-telemetry-strip" className="flex xl:hidden w-full items-center gap-2 border-t border-cyan-500/15 pt-1.5 mt-1 text-[0.7rem] font-mono text-zinc-300 overflow-x-auto no-scrollbar px-1">
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`inline-block h-2 w-2 rounded-full ${isChecking ? "bg-zinc-500" : isLive ? "animate-pulse bg-emerald-400" : "bg-rose-500"}`} />
          <span className={`font-bold tracking-wider ${isChecking ? "text-zinc-400" : isLive ? "text-emerald-400" : "text-rose-400"}`}>
            {isChecking ? "..." : isLive ? t("telemetry_live") : t("telemetry_offline")}
          </span>
        </div>
        <span className="h-3 w-px bg-white/15 flex-shrink-0" />
        <span className="whitespace-nowrap flex-shrink-0 text-slate-200">{hudMoon}</span>
        {weatherItems.map((item, idx) => (
          <React.Fragment key={idx}>
            <span className="h-3 w-px bg-white/15 flex-shrink-0" />
            <span className="whitespace-nowrap flex-shrink-0 text-sky-200" title={item.tooltip}>{item.text}</span>
          </React.Fragment>
        ))}
        <span className="h-3 w-px bg-white/15 flex-shrink-0" />
        <span className="flex-shrink-0 text-zinc-400 font-sans whitespace-nowrap ml-auto">{currentTime} • {currentDate}</span>
      </div>

      {aboutOpen && <Modal open={aboutOpen} title={t("about_stargazer_v3")} onClose={() => setAboutOpen(false)}><div>{t("dashboard_built_desc")}</div></Modal>}
      {dataSettingsOpen && <DataSettingsModal open={dataSettingsOpen} onClose={() => setDataSettingsOpen(false)} />}
    </header>
  );
}
