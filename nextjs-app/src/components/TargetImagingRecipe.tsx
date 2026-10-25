"use client";

import { useMemo } from "react";
import Icon from "./Icon";

interface TargetImagingRecipeProps {
  targetName: string;
  targetType?: string;
  raDeg: number;
  decDeg: number;
  altitudeDeg?: number;
  azimuthDeg?: number;
  moonIlluminationPct?: number; // 0 - 100
}

export default function TargetImagingRecipe({
  targetName,
  targetType = "",
  decDeg,
  altitudeDeg = 45,
  azimuthDeg = 180,
  moonIlluminationPct = 65, // default realistic moon phase if unprovided
}: TargetImagingRecipeProps) {
  const isEmission = useMemo(() => {
    const t = targetType.toLowerCase();
    return (
      t.includes("emission") ||
      t.includes("supernova") ||
      t.includes("planetary nebula") ||
      targetName.toLowerCase().includes("orion") ||
      targetName.toLowerCase().includes("veil") ||
      targetName.toLowerCase().includes("rosette") ||
      targetName.toLowerCase().includes("north america") ||
      targetName.toLowerCase().includes("elephant")
    );
  }, [targetType, targetName]);

  const isBroadband = !isEmission;

  // Calculate altitude curve from 18:00 (6 PM) to 06:00 (6 AM)
  const { points, peakAlt, peakHourLabel, optimalHoursCount } = useMemo(() => {
    const latRad = (20 * Math.PI) / 180; // approximate mid-latitude
    const decRad = (decDeg * Math.PI) / 180;
    const pts: Array<{ hour: number; label: string; alt: number }> = [];

    let maxAlt = -90;
    let bestHour = 0;
    let above35 = 0;

    // 13 steps from 18:00 to 06:00
    for (let i = 0; i <= 12; i++) {
      const hLocal = (18 + i) % 24;
      // Hour angle progression relative to local transit
      const hourOffset = i - 6; // Assume transit around midnight
      const haRad = (hourOffset * 15 * Math.PI) / 180;

      const sinAlt =
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
      const alt = Math.max(0, Math.round((Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI));

      const label = hLocal === 0 ? "12 AM" : hLocal < 12 ? `${hLocal} AM` : `${hLocal === 12 ? 12 : hLocal - 12} PM`;
      pts.push({ hour: hLocal, label, alt });

      if (alt > maxAlt) {
        maxAlt = alt;
        bestHour = hLocal;
      }
      if (alt >= 35) {
        above35++;
      }
    }

    const peakLabel = bestHour === 0 ? "12:00 AM" : bestHour < 12 ? `${bestHour}:00 AM` : `${bestHour === 12 ? 12 : bestHour - 12}:00 PM`;

    return {
      points: pts,
      peakAlt: Math.max(altDegOrDefault(altitudeDeg), maxAlt),
      peakHourLabel: peakLabel,
      optimalHoursCount: above35,
    };
  }, [decDeg, altitudeDeg]);

  // Show moon warning if illumination > 50% on broadband objects (e.g. galaxies)
  const showMoonWarning = moonIlluminationPct > 50 && isBroadband;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-4 backdrop-blur-md">
      {/* High Moon Glow Alert */}
      {showMoonWarning && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-2.5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <span className="text-xl flex-shrink-0">🌕</span>
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-amber-300 block mb-0.5">
              High Moon Glow Warning ({Math.round(moonIlluminationPct)}% Illumination)
            </span>
            Broadband contrast on galaxies and reflection nebulae will be significantly reduced tonight.
            <span className="text-amber-100 font-semibold block mt-0.5">
              Tip: Switch to a Duo-Band emission nebula (e.g., M42, Rosette, Veil) to cut through lunar sky brightness!
            </span>
          </div>
        </div>
      )}

      {/* Tonight's Imaging Window & Sparkline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Icon name="clock" className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-white tracking-wide">
              Tonight&apos;s Optimal Imaging Window
            </span>
          </div>
          <span className="rounded bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 text-[0.68rem] font-bold text-cyan-300 font-mono">
            {optimalHoursCount > 0 ? `🟢 ~${optimalHoursCount}h Window (> 35°)` : "🔴 Low Altitude Tonight"}
          </span>
        </div>

        {/* Altitude Sparkline Graph */}
        <div className="relative w-full h-20 rounded-xl bg-black/60 border border-white/5 p-2 overflow-hidden flex flex-col justify-between">
          {/* Threshold Line at 35° */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-cyan-500/30 flex items-center justify-end pr-2"
            style={{ bottom: "38.8%" }}
          >
            <span className="text-[0.55rem] font-mono text-cyan-400/70 bg-black/80 px-1 rounded">
              35° Limit
            </span>
          </div>

          {/* SVG Sparkline Curve */}
          <svg className="w-full h-14 overflow-visible" preserveAspectRatio="none" viewBox="0 0 120 50">
            {/* Shaded Area for optimal altitude */}
            <path
              d={makeAreaPath(points)}
              fill="url(#sparkline-gradient)"
              opacity="0.35"
            />
            {/* Sparkline curve stroke */}
            <path
              d={makeLinePath(points)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Sparkline X-Axis Time Labels */}
          <div className="flex items-center justify-between text-[0.6rem] font-mono text-zinc-500 px-1">
            <span>6 PM</span>
            <span>9 PM</span>
            <span className="text-cyan-300 font-bold">12 AM (Peak)</span>
            <span>3 AM</span>
            <span>6 AM</span>
          </div>
        </div>

        {/* Telemetry Pill Strip below sparkline */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-300 flex-wrap gap-2">
          <span className="font-mono text-[0.7rem] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
            Peak Transit: <strong className="text-white">{peakHourLabel}</strong>
          </span>
          <span className="font-mono text-[0.7rem] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
            Peak Altitude: <strong className="text-cyan-300">{peakAlt}°</strong>
          </span>
          <span className="font-mono text-[0.7rem] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
            Current: <strong className="text-amber-300">{Math.round(altitudeDeg)}°</strong> (Az {Math.round(azimuthDeg)}°)
          </span>
        </div>
      </div>

      {/* Smart Capture Recipe Panel */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Icon name="camera" className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold text-white tracking-wide">
            Smart Telescope &amp; Camera Capture Recipe
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Filter Recommendation */}
          <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-0.5">
            <span className="text-[0.68rem] text-zinc-400 font-semibold font-mono">Recommended Filter:</span>
            <span className="text-xs font-bold text-emerald-300">
              {isEmission ? "🌈 Duo-Band (OIII + H-Alpha)" : "✨ Astro UV/IR-Cut (Broadband)"}
            </span>
            <span className="text-[0.65rem] text-zinc-500">
              {isEmission ? "Isolates ionized gas emissions & cuts light pollution" : "Preserves natural galaxy/star cluster color balance"}
            </span>
          </div>

          {/* Exposure & Gain Settings */}
          <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-0.5">
            <span className="text-[0.68rem] text-zinc-400 font-semibold font-mono">Gain &amp; Subframes:</span>
            <span className="text-xs font-bold text-sky-300">
              {isEmission ? "Gain 80–90 | 45s–60s Subs (EQ Mode)" : "Gain 60–80 | 30s–45s Subs (EQ Mode)"}
            </span>
            <span className="text-[0.65rem] text-zinc-500">
              Alt-Az Mode: 10s–15s subs to prevent field rotation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function altDegOrDefault(alt?: number): number {
  if (alt != null && !isNaN(alt) && alt > 0) return Math.round(alt);
  return 60;
}

function makeLinePath(points: Array<{ hour: number; alt: number }>): string {
  if (points.length === 0) return "";
  const step = 120 / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      // Map alt 0 - 90 to y 50 - 5
      const y = 50 - (p.alt / 90) * 45;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function makeAreaPath(points: Array<{ hour: number; alt: number }>): string {
  if (points.length === 0) return "";
  const line = makeLinePath(points);
  return `${line} L 120 50 L 0 50 Z`;
}
