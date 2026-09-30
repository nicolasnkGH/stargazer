"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { WeeklyReport } from "@/types";
import { UNITS_STORAGE_KEY } from "@/lib/constants";
import { useTranslations } from "next-intl";

function getMoonEmoji(illum: number, phaseName?: string): string {
  const p = (phaseName || "").toLowerCase();
  if (illum < 5) return "🌑";
  if (illum > 95) return "🌕";
  const isWaxing = !(p.includes("waning") || p.includes("last") || p.includes("third") || p.includes("3q"));
  if (illum < 45) return isWaxing ? "🌒" : "🌘";
  if (illum < 65) return isWaxing ? "🌓" : "🌗";
  return isWaxing ? "🌔" : "🌖";
}

function RatingBadge({ rating }: { rating: string }) {
  const t = useTranslations();
  if (!rating) return <span className="text-xs font-semibold text-slate-400">—</span>;
  if (rating.includes("Excellent"))
    return (
      <span className="rounded-lg bg-emerald-950/80 border border-emerald-400/60 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
        🌟 {t("excellent") || "Excellent"}
      </span>
    );
  if (rating.includes("Good"))
    return (
      <span className="rounded-lg bg-green-950/80 border border-green-500/50 px-2 py-0.5 text-[0.65rem] font-bold text-green-300">
        🟢 {t("good") || "Good"}
      </span>
    );
  if (rating.includes("Fair"))
    return (
      <span className="rounded-lg bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300">
        🟡 {t("fair") || "Fair"}
      </span>
    );
  return (
    <span className="rounded-lg bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 text-[0.65rem] font-bold text-rose-300">
      🔴 {t("poor") || "Poor"}
    </span>
  );
}

function StatusDot({ cloud_pct }: { cloud_pct: number }) {
  if (cloud_pct <= 30) return <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" title="Clear Sky" />;
  if (cloud_pct <= 60) return <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" title="Partly Cloudy" />;
  return <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)]" title="Cloudy" />;
}

const swrFetcher = (url: string) => fetch(url).then((res) => res.json());

/** Read the active location's lat/lon from localStorage. Returns null until mounted. */
function useActiveLocationCoords(): { lat: number; lon: number } | null {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    function readCoords() {
      try {
        const activeId = localStorage.getItem("stargazer_active_loc");
        const raw = localStorage.getItem("stargazer_locations");
        if (raw) {
          const locs: Array<{ id: string; lat: number; lon: number }> = JSON.parse(raw);
          const active = activeId ? locs.find((l) => l.id === activeId) : locs[0];
          if (active) {
            setCoords({ lat: active.lat, lon: active.lon });
            return;
          }
        }
      } catch {
        // ignore parse errors
      }
      setCoords(null);
    }

    readCoords();

    // Re-read whenever another component changes location in localStorage (e.g. LocationModal)
    window.addEventListener("storage", readCoords);
    return () => window.removeEventListener("storage", readCoords);
  }, []);

  return coords;
}

export default function WeeklyForecast({ report: initialReport }: { report: WeeklyReport | null }) {
  const t = useTranslations();
  const [isMetric, setIsMetric] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coords = useActiveLocationCoords();

  // Build a location-specific SWR key so the forecast refetches automatically when location changes.
  // coords is null on first paint — fall back to no query params so the server-side
  // initialReport is used immediately without a redundant fetch.
  const swrKey = coords
    ? `/api/weekly?lat=${coords.lat.toFixed(4)}&lon=${coords.lon.toFixed(4)}`
    : "/api/weekly";

  const { data: swrData } = useSWR<WeeklyReport>(
    swrKey,
    swrFetcher,
    { fallbackData: initialReport ?? undefined, revalidateOnFocus: false }
  );

  const report = swrData || initialReport;

  const scrollDays = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -230 : 230, behavior: "smooth" });
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMetric(localStorage.getItem(UNITS_STORAGE_KEY) !== "imperial");
  }, []);

  if (!report) {
    return (
      <section id="card-weekly" className="w-full mb-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
          7-day forecast unavailable.
        </div>
      </section>
    );
  }

  const bestNight = report.best_nights && report.best_nights.length > 0 ? report.best_nights[0] : null;

  return (
    <section id="card-weekly" className="card w-full mb-8 border border-cyan-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="card-header justify-between border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="calendar-days" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {t("weekly_title") || "7-Day Astronomical Observing Forecast"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Open-Meteo & Ephemeris"
            description={t.has("source_desc_weekly") ? t("source_desc_weekly") : "7-day outlook combining multi-model atmospheric forecasts (ECMWF, GFS, ICON) with lunar illumination and astronomical dark window calculations."}
            attribution="Open-Meteo / Astronomical Ephemeris"
          />
          <span className="text-xs font-mono text-slate-400 font-semibold">{report.week_start}</span>
        </div>
      </div>

      <div className="card-body p-6">
        {/* Top Banner: Best Night Callout */}
        {bestNight && (
          <div className="mb-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-4 flex items-center justify-between gap-3 flex-wrap shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌟</span>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Best Observing Night This Week
                </span>
                <p className="text-sm font-bold text-slate-100 mt-0.5">
                  {bestNight.date} — <span className="text-emerald-300 font-semibold">{bestNight.reason}</span>
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-300">
              Optimal Sky Window
            </span>
          </div>
        )}

        {/* 7-Day Responsive Layout (Scrollable Row on Mobile, Grid on Desktop) */}
        <div className="relative group/weekly">
          {/* Scroll Navigation Arrows on Mobile */}
          <button
            onClick={() => scrollDays("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 sm:hidden flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90 border border-cyan-500/50 text-cyan-300 shadow-xl hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none"
            title="Scroll left"
            aria-label="Scroll days left"
          >
            ‹
          </button>
          <button
            onClick={() => scrollDays("right")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 sm:hidden flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90 border border-cyan-500/50 text-cyan-300 shadow-xl hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none"
            title="Scroll right"
            aria-label="Scroll days right"
          >
            ›
          </button>

          <div
            ref={scrollRef}
            style={{
              scrollSnapType: "x mandatory",
              maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
            }}
            className="flex sm:grid sm:grid-cols-2 md:grid-cols-7 gap-3 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 px-3 sm:px-0 snap-x snap-mandatory scroll-smooth scrollbar-none w-full"
          >
            {(report.days ?? []).map((day, i) => {
              const isToday = i === 0;
              const tempDisplay = isMetric
                ? `${Math.round(day.temp_c)}°C`
                : `${Math.round((day.temp_c * 9) / 5 + 32)}°F`;

              const moonEmoji = getMoonEmoji(day.moon_illumination, day.moon_phase);
              const clearScore = Math.max(0, 100 - day.cloud_pct);

              return (
                <div
                  key={i}
                  style={{ scrollSnapAlign: "start" }}
                  className={`rounded-2xl border p-4 flex flex-col justify-between items-center text-center gap-3 transition-all duration-300 shadow-lg flex-shrink-0 w-[205px] sm:w-auto snap-start hover:scale-[1.02] group/card ${
                    isToday
                      ? "border-cyan-400 bg-gradient-to-b from-cyan-950/40 via-slate-950/90 to-slate-950/95 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50"
                      : (day.rating ?? "").includes("Excellent") || (day.rating ?? "").includes("Good")
                      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-950/80 to-slate-950/90 hover:border-emerald-400/60"
                      : "border-white/10 bg-slate-950/70 hover:border-white/20"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between w-full pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <StatusDot cloud_pct={day.cloud_pct} />
                      <span className="text-xs font-bold text-slate-100 tracking-wide">{day.date.split(",")[0]}</span>
                    </div>
                    {isToday ? (
                      <span className="text-[0.62rem] font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-400/50 px-1.5 py-0.5 rounded shadow-sm">
                        TODAY
                      </span>
                    ) : (
                      <span className="text-[0.65rem] text-slate-400 font-mono">
                        {day.date.split(" ")[1] || ""}
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  <div>
                    <RatingBadge rating={day.rating} />
                  </div>

                  {/* Sky Clarity Meter Bar */}
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[0.65rem]">
                      <span className="text-slate-400 font-medium">Sky Clarity</span>
                      <span className={`font-mono font-bold ${clearScore > 70 ? "text-emerald-400" : clearScore > 40 ? "text-amber-400" : "text-rose-400"}`}>
                        {Math.round(clearScore)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          clearScore > 70
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                            : clearScore > 40
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-gradient-to-r from-rose-600 to-rose-400"
                        }`}
                        style={{ width: `${clearScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Weather & Sky Stats */}
                  <div className="space-y-1.5 w-full text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span>☁️</span>
                        <span>{t("lbl_clouds") || "Clouds"}</span>
                      </span>
                      <span className="font-mono font-bold text-cyan-300">{Math.round(day.cloud_pct)}%</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span>🌡️</span>
                        <span>{t("lbl_temp") || "Temp"}</span>
                      </span>
                      <span className="font-mono font-bold text-amber-300">{tempDisplay}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span>{moonEmoji}</span>
                        <span>{t("lbl_moon") || "Moon"}</span>
                      </span>
                      <span className="font-mono text-purple-300 font-bold">{day.moon_illumination}%</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  {(day.highlights ?? []).length > 0 && (
                    <div className="w-full pt-1">
                      {(day.highlights ?? []).slice(0, 1).map((h, j) => (
                        <div
                          key={j}
                          className="px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-400/25 text-[0.62rem] text-sky-200 font-medium truncate w-full shadow-sm"
                          title={h}
                        >
                          ✨ {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
