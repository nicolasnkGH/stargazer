"use client";

import React from "react";
import Icon from "./Icon";
import type { ConstellationData } from "@/types";

export default function ConstellationsTonight({
  constellations = [],
}: {
  constellations?: ConstellationData[];
}) {
  const visibleConst = constellations
    .filter((c) => c.visible)
    .sort((a, b) => b.altitude_deg - a.altitude_deg);

  const handleCardClick = (c: ConstellationData) => {
    window.dispatchEvent(new CustomEvent("sg-select-constellation", { detail: c }));
    const targetDb = document.getElementById("card-targets");
    if (targetDb) {
      targetDb.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="card-constellations" className="card w-full mb-8 border border-cyan-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header justify-between border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="star" className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">Constellations Tonight</h2>
        </div>
        <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300 shadow-sm">
          Sorted by best view
        </span>
      </div>

      <div className="card-body p-6">
        {visibleConst.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No constellations visible tonight.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {visibleConst.map((c) => {
              const alt = c.altitude_deg;
              const az = c.azimuth_deg;
              const azStr = az != null && !isNaN(az) ? ` (${Math.round(az)}°)` : "";
              const color = alt > 30 ? "#22c55e" : alt > 10 ? "#f59e0b" : "#ef4444";
              const barPct = Math.min(100, Math.max(0, Math.round((alt / 90) * 100)));
              const barColor = alt > 30 ? "#22c55e" : alt > 10 ? "#f59e0b" : "#ef4444";

              const qualityLabel = alt > 30 ? "High in sky" : alt > 10 ? "Low in sky" : "Near horizon";
              const qualityIcon = alt > 30 ? "🟢" : alt > 10 ? "🟡" : "🔴";

              return (
                <div
                  key={c.name}
                  onClick={() => handleCardClick(c)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5 flex flex-col justify-between transition-all hover:border-cyan-400/60 hover:bg-slate-900 shadow-md cursor-pointer group hover:scale-[1.02] active:scale-95"
                  title={`Click to view ${c.name} targets`}
                >
                  {/* Name & Abbreviation */}
                  <div className="flex items-center justify-between font-bold text-slate-100 text-xs sm:text-sm mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-base">{c.emoji || "✨"}</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="text-[0.65rem] text-slate-400 font-mono font-normal ml-1 flex-shrink-0">
                      {c.abbr}
                    </span>
                  </div>

                  {/* Altitude Header */}
                  <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-wider font-semibold text-slate-400 mt-1 mb-1">
                    <span>ALTITUDE ABOVE HORIZON</span>
                    <span className="font-mono text-xs font-bold" style={{ color }}>
                      {alt}°
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%`, backgroundColor: barColor }}
                    />
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-[0.7rem] font-semibold pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 font-medium" style={{ color }}>
                      <span>{qualityIcon}</span>
                      <span>{qualityLabel}</span>
                    </span>
                    <span className="font-mono text-[0.65rem] text-slate-400 font-normal">
                      {c.direction}{azStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
