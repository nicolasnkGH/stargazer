"use client";

import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { WeeklyReport } from "@/types";
import { UNITS_STORAGE_KEY } from "@/lib/constants";

function RatingBadge({ rating }: { rating: string }) {
  if (!rating) return <span className="text-xs font-semibold text-slate-400">—</span>;
  if (rating.includes("Excellent"))
    return (
      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
        🌟 Excellent
      </span>
    );
  if (rating.includes("Good"))
    return (
      <span className="rounded bg-green-950/80 border border-green-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-green-300">
        🟢 Good
      </span>
    );
  if (rating.includes("Fair"))
    return (
      <span className="rounded bg-yellow-950/80 border border-yellow-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-yellow-300">
        🟡 Fair
      </span>
    );
  return (
    <span className="rounded bg-red-950/80 border border-red-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-red-300">
      🔴 Poor
    </span>
  );
}

function StatusDot({ cloud_pct }: { cloud_pct: number }) {
  if (cloud_pct <= 30) return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Clear Sky" />;
  if (cloud_pct <= 60) return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" title="Partly Cloudy" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" title="Cloudy" />;
}

export default function WeeklyForecast({ report }: { report: WeeklyReport | null }) {
  const [isMetric, setIsMetric] = useState(true);

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
          <h2 className="text-base font-bold text-slate-100 tracking-wide">7-Day Astronomical Observing Forecast</h2>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Open-Meteo & Ephemeris"
            description="7-day outlook combining multi-model atmospheric forecasts (ECMWF, GFS, ICON) with lunar illumination and astronomical dark window calculations."
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

        {/* 7-Day Responsive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          {(report.days ?? []).map((day, i) => {
            const isToday = i === 0;
            const tempDisplay = isMetric
              ? `${Math.round(day.temp_c)}°C`
              : `${Math.round((day.temp_c * 9) / 5 + 32)}°F`;

            return (
              <div
                key={i}
                className={`rounded-2xl border p-4 flex flex-col justify-between items-center text-center gap-2 transition-all shadow-md ${
                  isToday
                    ? "border-cyan-400/60 bg-slate-950/90 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : (day.rating ?? "").includes("Excellent") || (day.rating ?? "").includes("Good")
                    ? "border-emerald-500/30 bg-slate-950/70"
                    : "border-white/10 bg-slate-950/50"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between w-full pb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <StatusDot cloud_pct={day.cloud_pct} />
                    <span className="text-xs font-bold text-slate-100">{day.date.split(",")[0]}</span>
                  </div>
                  {isToday && (
                    <span className="text-[0.6rem] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                      TODAY
                    </span>
                  )}
                </div>

                {/* Rating Badge */}
                <div className="my-1">
                  <RatingBadge rating={day.rating} />
                </div>

                {/* Weather & Sky Stats */}
                <div className="space-y-1 w-full text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Clouds</span>
                    <span className="font-mono font-bold text-cyan-300">{Math.round(day.cloud_pct)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Temp</span>
                    <span className="font-mono font-bold text-amber-300">{tempDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Moon</span>
                    <span className="font-mono text-purple-300 font-bold">{day.moon_illumination}%</span>
                  </div>
                </div>

                {/* Highlights */}
                {(day.highlights ?? []).length > 0 && (
                  <div className="mt-2 w-full pt-2 border-t border-white/10 text-[0.65rem] text-slate-300 leading-tight italic">
                    {(day.highlights ?? []).slice(0, 1).map((h, j) => (
                      <p key={j} className="truncate w-full">{h}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
