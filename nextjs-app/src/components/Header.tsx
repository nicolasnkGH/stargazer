"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  STARGAZER_REPO_URL,
  RESOURCES,
} from "@/lib/constants";
import type { Locale, TonightReport } from "@/types";
import Modal from "./Modal";
import LocationControl from "./LocationControl";
import DataSettingsModal from "./DataSettingsModal";
import { startOnboardingTour } from "./OnboardingTour";

const healthFetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

function setLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000`;
  window.location.reload();
}

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [resourcesFlyoutStyle, setResourcesFlyoutStyle] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resourcesBtnRef = useRef<HTMLButtonElement>(null);

  // Anchor the flyout to the trigger's real on-screen position (like Radix/shadcn's
  // DropdownMenu does), clamped so it always stays fully within the viewport.
  function openResourcesFlyout() {
    const rect = resourcesBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const flyoutWidth = 200; // matches min-w-[200px] on the flyout below
    const top = Math.min(rect.top, window.innerHeight - margin);
    const rawRight = window.innerWidth - rect.left + margin;
    const maxRight = Math.max(margin, window.innerWidth - flyoutWidth - margin);
    setResourcesFlyoutStyle({
      top,
      right: Math.min(rawRight, maxRight),
      maxHeight: window.innerHeight - top - margin,
    });
    setResourcesExpanded(true);
  }

  // Live HUD readouts — mirrors legacy web/app.js's hud-moon/hud-weather population.
  const moon = tonight?.moon;
  const hudMoon = moon
    ? (() => {
        const icon = moon.phase_name ? moon.phase_name.split(" ")[0] : "🌙";
        const phaseNameOnly = (moon.phase_name ?? "").replace(icon, "").trim();
        return `${icon} ${phaseNameOnly} (${moon.illumination_pct ?? "?"}%)`;
      })()
    : "🌙 --";
  const seeing = tonight?.seeing;
  const hudWeather = seeing
    ? (() => {
        const tVal = seeing.tonight_temp_c;
        const tempStr = tVal != null ? (isMetric ? `${tVal}°C` : `${Math.round((tVal * 9) / 5 + 32)}°F`) : "--";
        const wVal = seeing.tonight_wind_kmh;
        const windStr = wVal != null ? (isMetric ? `${wVal} km/h` : `${Math.round(wVal * 0.621371)} mph`) : "--";
        return `🌡️ ${tempStr} | 💨 ${windStr}`;
      })()
    : "🌡️ -- | 💨 --";

  // Hydrate the unit system from localStorage — can't be a lazy useState initializer
  // without a hydration mismatch, since localStorage doesn't exist during SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMetric(localStorage.getItem(UNITS_STORAGE_KEY) !== "imperial");
  }, []);

  function toggleUnits() {
    const next = !isMetric;
    localStorage.setItem(UNITS_STORAGE_KEY, next ? "metric" : "imperial");
    window.location.reload();
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Clock tick
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-slate-950/90 py-3 px-6 backdrop-blur-xl">
      <div className="mx-auto flex max-w-full flex-nowrap items-center justify-between gap-4">
        {/* Logo */}
        <a href="#hero-section" className="flex flex-shrink-0 items-center gap-2.5 no-underline">
          <Icon name="telescope" className="h-6 w-6 animate-float text-sky-400 drop-shadow-[0_0_12px_rgba(74,158,255,0.5)]" />
          <span
            className="whitespace-nowrap bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-[1.4rem] font-bold leading-tight tracking-tight text-transparent"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            StarGazer
          </span>
        </a>

        {/* Telemetry pill — allowed to shrink/truncate so it never pushes the menu button off-screen */}
        <div className="hidden min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-1.5 lg:flex">
          <div className="flex flex-shrink-0 items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.12em]">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isChecking ? "bg-zinc-500" : isLive ? "animate-pulse bg-green-500" : "bg-red-500"
              }`}
            />
            <span className={isChecking ? "text-zinc-400" : isLive ? "text-green-500" : "text-red-500"}>
              {isChecking ? "..." : isLive ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <span className="h-4 w-px flex-shrink-0 bg-white/10" />
          <span id="hud-moon" className="flex-shrink-0 truncate font-mono text-[0.75rem] text-slate-400">{hudMoon}</span>
          <span className="h-4 w-px flex-shrink-0 bg-white/10" />
          <span id="hud-weather" className="flex-shrink-0 truncate font-mono text-[0.75rem] text-slate-400">{hudWeather}</span>
          <span className="h-4 w-px flex-shrink-0 bg-white/10" />
          <LocationControl />
        </div>

        {/* Right side */}
        <div className="flex flex-shrink-0 items-center gap-4">
          {/* Clock */}
          <div className="hidden items-center gap-2 whitespace-nowrap font-mono md:flex">
            <span id="clock" className="text-[0.85rem]">{currentTime}</span>
            <span id="date-display" className="text-[0.75rem] text-zinc-400">{currentDate}</span>
          </div>

          {/* Controls */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <a
              href={`${STARGAZER_REPO_URL}/issues`}
              target="_blank"
              rel="noopener"
              className="hidden md:inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors mr-1"
            >
              Collaborate
              <Icon name="arrow-up-right" className="h-3 w-3" />
            </a>

            <button
              onClick={toggleUnits}
              className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              title="Toggle Units"
            >
              {isMetric ? "°C / km" : "°F / mi"}
            </button>

            <select
              className="hidden rounded-lg border border-white/10 bg-slate-900/50 py-1 pl-3 pr-8 text-sm text-zinc-200 outline-none hover:border-white/30 md:block"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              id="btn-about"
              onClick={() => startOnboardingTour()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              title="Dashboard Tour"
            >
              <Icon name="info" className="h-4 w-4" />
            </button>

            {/* Menu button + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                id="btn-menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Navigation"
              >
                <Icon name="menu" className="h-[18px] w-[18px]" />
              </button>

              {menuOpen && (
                <div className="fixed right-4 top-[60px] z-[9999] max-h-[calc(100vh-80px)] min-w-[200px] overflow-y-auto rounded-lg border border-purple-500/40 bg-[rgba(20,20,30,0.95)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
                  {/* Mobile-only clock + lang inside dropdown */}
                  <div className="mb-2 block border-b border-white/10 pb-2 font-mono text-[0.8rem] text-slate-400 md:hidden">
                    <div className="text-zinc-200">{currentTime}</div>
                    <div className="mt-1">{currentDate}</div>
                    <select
                      className="mt-2 w-full rounded border border-white/10 bg-slate-900/50 py-1 pl-3 pr-8 text-sm text-zinc-200"
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as Locale)}
                    >
                      {LANG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block rounded px-4 py-2.5 text-[0.9rem] text-zinc-200 transition hover:bg-purple-600/20 hover:text-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      {"label" in link ? link.label : t(link.key)}
                    </a>
                  ))}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDataSettingsOpen(true);
                    }}
                    className="block w-full rounded px-4 py-2.5 text-left text-[0.9rem] text-zinc-200 transition hover:bg-purple-600/20 hover:text-white"
                  >
                    💾 Data &amp; Settings
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setAboutOpen(true);
                    }}
                    className="block w-full rounded px-4 py-2.5 text-left text-[0.9rem] text-zinc-200 transition hover:bg-purple-600/20 hover:text-white"
                  >
                    ℹ️ About StarGazer
                  </button>

                  <div>
                    <button
                      ref={resourcesBtnRef}
                      onClick={() => (resourcesExpanded ? setResourcesExpanded(false) : openResourcesFlyout())}
                      className="flex w-full items-center justify-between rounded px-4 py-2.5 text-left text-[0.9rem] text-zinc-200 transition hover:bg-purple-600/20 hover:text-white"
                    >
                      Resources
                      <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    {resourcesExpanded && resourcesFlyoutStyle && createPortal(
                      <div
                        className="fixed z-[10000] min-w-[200px] overflow-y-auto rounded-lg border border-indigo-500/30 bg-[rgba(15,23,42,0.95)] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
                        style={{ top: resourcesFlyoutStyle.top, right: resourcesFlyoutStyle.right, maxHeight: resourcesFlyoutStyle.maxHeight }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {RESOURCES.map((r) => (
                          <a
                            key={r.url}
                            href={r.url}
                            target="_blank"
                            rel="noopener"
                            className="block rounded px-3 py-2 text-[0.8rem] text-zinc-400 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMenuOpen(false)}
                          >
                            {r.icon} {r.name}
                          </a>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DataSettingsModal open={dataSettingsOpen} onClose={() => setDataSettingsOpen(false)} />

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title={t("about_title")}>
        <div className="flex flex-col gap-3 text-sm text-zinc-300">
          <p>{t("about_desc1")}</p>
          <p>{t("about_desc2")}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{t("about_highlight1")}</span>
            <span className="rounded bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{t("about_highlight2")}</span>
            <span className="rounded bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{t("about_highlight3")}</span>
          </div>
          <div className="mt-2 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs text-zinc-500">{t("about_collab_title")}</p>
            <a
              href={STARGAZER_REPO_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
            >
              {t("about_github_btn")}
            </a>
          </div>
        </div>
      </Modal>
    </header>
  );
}
