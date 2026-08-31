"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import { parseLocationCookie } from "@/lib/location-cookie";
import { LOCATION_COOKIE } from "@/lib/constants";
import type { LocationCoords } from "@/types";

const DEFAULT_LAT = 19.82;
const DEFAULT_LON = -155.47;

function getClientCoords(): LocationCoords | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCATION_COOKIE}=`));
  if (!match) return null;
  const val = match.split("=")[1];
  return parseLocationCookie(val);
}

export default function ClearOutsideEmbed({ coords: initialCoords }: { coords?: LocationCoords | null }) {
  const [coords, setCoords] = useState<LocationCoords | null>(initialCoords ?? null);
  const [imgError, setImgError] = useState(false);
  const [showGuideMobile, setShowGuideMobile] = useState(false);

  useEffect(() => {
    const active = getClientCoords();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) setCoords(active);

    const handleLoc = () => {
      const updated = getClientCoords();
      if (updated) setCoords(updated);
    };

    window.addEventListener("stargazer_location_change", handleLoc);
    window.addEventListener("storage", handleLoc);
    return () => {
      window.removeEventListener("stargazer_location_change", handleLoc);
      window.removeEventListener("storage", handleLoc);
    };
  }, []);

  const lat = (coords?.lat ?? initialCoords?.lat ?? DEFAULT_LAT).toFixed(2);
  const lon = (coords?.lon ?? initialCoords?.lon ?? DEFAULT_LON).toFixed(2);
  const forecastUrl = `https://clearoutside.com/forecast/${lat}/${lon}`;
  const proxiedImageUrl = `/api/clearoutside/image?size=large&lat=${lat}&lon=${lon}`;

  return (
    <section id="card-weather" className="card w-full mb-8">
      <div className="card-header justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="cloud-sun" className="h-5 w-5 text-sky-400" />
          <h2>Clear Outside — Astronomical Weather Forecast</h2>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Clear Outside (First Light Optics)"
            description="Hourly astronomical weather forecast specifically calibrated for astronomers: total/low/mid/high cloud cover, relative humidity, dew risk, wind, and transparency."
            attribution="First Light Optics / clearoutside.com"
          />
          <a href={forecastUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">
            Open Full Forecast ↗
          </a>
        </div>
      </div>
      <div className="card-body p-6 flex flex-col gap-6">
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-3 text-center flex flex-col items-center justify-center min-h-[300px] w-full">
          {!imgError ? (
            <a href={forecastUrl} target="_blank" rel="noopener noreferrer" className="block w-full transition hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxiedImageUrl}
                alt={`Clear Outside astronomical forecast chart for coordinates (${lat}, ${lon})`}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-auto rounded-lg mx-auto object-contain max-h-[500px]"
              />
            </a>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">🌤️</span>
              <p className="text-sm font-semibold text-white mb-1">Clear Outside Astronomical Forecast</p>
              <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                Coordinates ({lat}, {lon})
              </p>
              <a
                href={forecastUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-all"
              >
                View Live Forecast on ClearOutside.com ↗
              </a>
            </div>
          )}
        </div>

        {/* "How to read this chart" - condensed & collapsible on mobile, 3-column on desktop */}
        <div className="border-t border-white/10 pt-4">
          <div
            onClick={() => setShowGuideMobile(!showGuideMobile)}
            className="flex items-center justify-between mb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-sky-300 transition-colors">
              <span className="text-sm">📊</span> How to Read This Forecast Chart
              <span className="sm:hidden text-[0.65rem] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 font-normal">
                {showGuideMobile ? "Hide ▲" : "Show Guide ▼"}
              </span>
            </h3>
            <span className="hidden sm:inline-block text-[0.7rem] text-slate-500 font-mono">
              Calibrated for ground-based observation
            </span>
          </div>

          {/* Mobile Collapsed Hint */}
          {!showGuideMobile && (
            <div
              onClick={() => setShowGuideMobile(true)}
              className="sm:hidden flex items-center justify-between text-[0.7rem] text-zinc-400 bg-slate-900/60 border border-white/5 rounded-lg px-3 py-2 cursor-pointer hover:border-sky-500/30"
            >
              <div className="flex items-center gap-2 truncate">
                <span>🚦 Green=Clear</span>
                <span>•</span>
                <span>🌫️ Check Dew/Haze</span>
              </div>
              <span className="text-sky-400 text-xs font-bold">Details ▾</span>
            </div>
          )}

          {/* Grid: Always visible on tablet/desktop (sm:grid), toggleable on mobile */}
          <div className={`${showGuideMobile ? "grid" : "hidden sm:grid"} grid-cols-1 md:grid-cols-3 gap-3 pt-1`}>
            <div className="rounded-xl border border-sky-500/20 bg-slate-950/60 p-3 sm:p-4 shadow-sm">
              <strong className="block text-sky-400 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <span>🚦</span> The Traffic Light System
              </strong>
              <div className="text-xs text-zinc-300 space-y-1 leading-relaxed">
                <p>
                  <strong className="text-white font-semibold">SUMMARY Row:</strong> Red = overcast, Orange = mixed, Green = clear sky.
                </p>
                <p>
                  <strong className="text-white font-semibold">CLOUD Rows:</strong> Pure white = 0% cloud. Dark blue = 100% cloud cover.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-slate-950/60 p-3 sm:p-4 shadow-sm">
              <strong className="block text-sky-400 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <span>🌫️</span> How to Spot the Haze
              </strong>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Check the <strong className="text-white font-semibold">REL. HUMIDITY &amp; DEW RISK</strong> rows. High humidity scatters light and washes out deep-sky targets.
              </p>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 sm:p-4 shadow-sm">
              <strong className="block text-red-400 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <span>💧</span> Telescope Dew Warning
              </strong>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When the Dew Risk row turns red, moisture condenses on cold optics. Ensure dew heaters and shields are active before observing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
