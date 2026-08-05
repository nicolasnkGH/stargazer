"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import { Telescope, Info, Menu, Flashlight } from "lucide-react";
import {
  HEALTH_POLL_INTERVAL_MS,
  NAV_LINKS,
  LANG_OPTIONS,
  LOCALE_COOKIE,
  UNITS_STORAGE_KEY,
  STARGAZER_REPO_URL,
} from "@/lib/constants";
import type { Locale } from "@/types";
import Modal from "./Modal";

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
  const [currentTime, setCurrentTime] = useState("--:-- --");
  const [currentDate, setCurrentDate] = useState("Loading...");
  const [nightMode, setNightMode] = useState(false);
  const [isMetric, setIsMetric] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.body.classList.toggle("night-mode", nightMode);
  }, [nightMode]);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-slate-950/90 py-3.5 px-8 backdrop-blur-xl">
      <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <Telescope className="h-6 w-6 animate-float text-sky-400 drop-shadow-[0_0_12px_rgba(74,158,255,0.5)]" strokeWidth={1.5} />
          <div className="flex flex-col items-start">
            <span className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-[1.4rem] font-bold leading-tight tracking-tight text-transparent"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              StarGazer
            </span>
            <span className="text-[0.75rem] text-sky-400/80 transition-opacity hover:opacity-100 hover:underline cursor-pointer">
              {t("app_slogan")}
            </span>
            <div className="mt-2 flex flex-col items-start gap-0.5">
              <span className="text-[0.7rem] font-semibold text-zinc-400">{t("loading_loc")}</span>
              <span className="font-mono text-[0.75rem] text-zinc-500/60 tracking-widest">Lat: --, Lon: --</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          {/* Telemetry group */}
          <div className="flex items-center gap-7 border-r border-white/10 pr-4">
            {/* API status badge */}
            <div
              className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-bold tracking-[0.12em] md:flex ${
                isChecking
                  ? "border-white/10 bg-white/5 text-zinc-400"
                  : isLive
                    ? "border-green-500/30 bg-green-500/10 text-green-500"
                    : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isChecking ? "bg-zinc-500" : isLive ? "animate-pulse bg-green-500" : "bg-red-500"
                }`}
              />
              {isChecking ? "..." : isLive ? "LIVE" : "OFFLINE"}
            </div>

            {/* Moon & weather */}
            <div className="flex items-center gap-3 font-mono text-[0.75rem] text-slate-400">
              <span id="hud-moon">🌙 --</span>
              <span id="hud-weather">🌡️ -- | 💨 --</span>
            </div>

            {/* Clock */}
            <div className="hidden items-center gap-2 font-mono md:flex">
              <span id="clock" className="text-[0.85rem]">{currentTime}</span>
              <span id="date-display" className="text-[0.75rem] text-zinc-400">{currentDate}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNightMode((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                nightMode
                  ? "border-red-500/50 bg-red-500/20 text-red-400"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:bg-purple-600/20 hover:border-purple-500/50"
              }`}
              title="Night Vision Mode"
            >
              <Flashlight className="h-4 w-4" strokeWidth={1.5} />
            </button>

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
              onClick={() => setAboutOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              title={t("about_title")}
            >
              <Info className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Menu button + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Navigation"
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
                <span className="hidden text-[0.8rem] font-semibold uppercase tracking-wider md:inline">Menu</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[45px] z-[9999] min-w-[200px] rounded-lg border border-purple-500/40 bg-[rgba(20,20,30,0.95)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
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
                      {t(link.key)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

      <div id="night-overlay" />
    </header>
  );
}
