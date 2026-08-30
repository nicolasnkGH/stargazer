"use client";

import React from "react";
import Icon from "./Icon";
import type { AuroraForecast, SpaceWeatherReport } from "@/types";

interface AuroraCardProps {
  aurora: AuroraForecast | null;
  spaceWeather: SpaceWeatherReport | null;
}

const KP_COLORS: Record<string, string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  gray: "#94a3b8",
};

export default function AuroraCard({ aurora, spaceWeather }: AuroraCardProps) {
  const kp = aurora?.kp ?? 2.3;
  const probabilityLabel = aurora?.probability ?? "Low";
  const ringColor = KP_COLORS[aurora?.color ?? "gray"] ?? KP_COLORS.gray;
  const kpPct = Math.min((kp / 9) * 100, 100);
  const events = spaceWeather?.events ?? [];

  return (
    <section
      id="card-space-weather"
      className="card w-full mb-8 border border-purple-500/30 shadow-xl overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.95)), url(/textures/aurora_bg.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <div className="card-header justify-between border-b border-purple-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="zap" className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-wide">Aurora &amp; Space Weather</h2>
            <p className="text-[0.7rem] text-slate-400 mt-0.5">
              Data powered by{" "}
              <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                NOAA Space Weather Prediction Center
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Body Grid with 1:1 Vanilla Glowing Aurora Curtain Effect */}
      <div className="card-body p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kp-Index meter */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-center shadow-md backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Planetary Kp-Index</h3>
          <div
            className="relative h-[120px] w-[120px] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            style={{
              background: `conic-gradient(${ringColor} ${kpPct}%, rgba(255,255,255,0.08) ${kpPct}%)`,
            }}
          >
            <div className="absolute h-[92px] w-[92px] rounded-full bg-slate-950 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white leading-none">{kp}</span>
              <span className="text-[0.65rem] text-purple-300 mt-1 font-bold">{probabilityLabel}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3 leading-snug font-medium">
            {aurora?.message ?? `Kp ${kp}: Low probability of Auroras`}
          </p>
        </div>

        {/* Aurora probability */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-md backdrop-blur-sm">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <Icon name="sparkles" className="h-4 w-4 text-purple-400" /> Aurora Visibility
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-purple-300 leading-none">{probabilityLabel}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${kpPct}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            {probabilityLabel === "Low"
              ? "Aurora is unlikely to be visible at your current latitude."
              : "Elevated geomagnetic activity — auroras may be visible toward the pole-facing horizon."}
          </p>
        </div>

        {/* Space weather alerts */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-md backdrop-blur-sm">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <Icon name="alert-triangle" className="h-4 w-4 text-amber-400" /> Space Weather Alerts
            </h3>
            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No active space weather alerts.</p>
              ) : (
                events.map((e, i) => (
                  <div key={i} className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-2.5">
                    <p className="text-xs font-bold text-amber-300">{e.type}</p>
                    <p className="text-[0.7rem] text-slate-300 mt-0.5">{e.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
