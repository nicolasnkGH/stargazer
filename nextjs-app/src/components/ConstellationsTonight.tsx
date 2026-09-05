"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { ConstellationData } from "@/types";

export default function ConstellationsTonight({
  constellations = [],
}: {
  constellations?: ConstellationData[];
}) {
  const t = useTranslations();
  const carouselRef = useRef<HTMLDivElement>(null);

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

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section id="card-constellations" className="card w-full mb-8 border border-cyan-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header justify-between border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="star" className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">{t("constellations_tonight_title")}</h2>
          <span className="text-[0.7rem] text-cyan-400/80 font-mono hidden sm:inline">
            {t("const_count_visible", { count: visibleConst.length })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Skyfield & IAU Boundaries"
            description={t("source_const_desc")}
            attribution={t("source_const_attr")}
          />
          <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-0.5 text-xs font-semibold text-purple-300 shadow-sm hidden md:inline">
            {t("sorted_by_best_view")}
          </span>

          {/* Horizontal carousel navigation controls */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => scroll("left")}
              className="px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold active:scale-95"
              title="Scroll left"
              aria-label="Scroll left"
            >
              ‹
            </button>
            <span className="text-[0.65rem] font-mono text-zinc-500 px-1 select-none">{t("swipe")}</span>
            <button
              onClick={() => scroll("right")}
              className="px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold active:scale-95"
              title="Scroll right"
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-3 sm:p-5 relative group/const">
        {visibleConst.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">{t("no_constellations_visible")}</p>
        ) : (
          <>
            {/* Side Floating Scroll Arrows on mobile and desktop */}
            <button
              onClick={() => scroll("left")}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90 border border-cyan-500/50 text-cyan-300 shadow-xl hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none"
              title="Scroll constellations left"
              aria-label="Previous constellations"
            >
              ‹
            </button>

            <button
              onClick={() => scroll("right")}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90 border border-cyan-500/50 text-cyan-300 shadow-xl hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none"
              title="Scroll constellations right"
              aria-label="Next constellations"
            >
              ›
            </button>

            <div
              ref={carouselRef}
              style={{
                scrollSnapType: "x mandatory",
                maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
              }}
              className="grid grid-rows-2 grid-flow-col auto-cols-[calc(50%-6px)] sm:auto-cols-[240px] gap-2 sm:gap-3.5 overflow-x-auto pb-3 pt-1 px-4 snap-x snap-mandatory scroll-smooth scrollbar-thin"
            >
              {visibleConst.map((c) => {
                const alt = c.altitude_deg;
                const az = c.azimuth_deg;
                const azStr = az != null && !isNaN(az) ? ` (${Math.round(az)}°)` : "";
                const color = alt > 30 ? "#22c55e" : alt > 10 ? "#f59e0b" : "#ef4444";
                const barPct = Math.min(100, Math.max(0, Math.round((alt / 90) * 100)));
                const barColor = alt > 30 ? "#22c55e" : alt > 10 ? "#f59e0b" : "#ef4444";

                const qualityLabel = alt > 30 ? t("qual_high") : alt > 10 ? t("qual_low") : t("qual_near_horizon");
                const qualityIcon = alt > 30 ? "🟢" : alt > 10 ? "🟡" : "🔴";

                return (
                  <div
                    key={c.name}
                    onClick={() => handleCardClick(c)}
                    style={{ scrollSnapAlign: "start" }}
                    className="snap-start rounded-xl border border-white/10 bg-slate-950/80 p-2.5 sm:p-3.5 flex flex-col justify-between transition-all hover:border-cyan-400/60 hover:bg-slate-900 shadow-md cursor-pointer group hover:scale-[1.02] active:scale-95 select-none min-h-[110px]"
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
                    <span>{t("altitude_above_horizon")}</span>
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
          </>
        )}
      </div>
    </section>
  );
}
