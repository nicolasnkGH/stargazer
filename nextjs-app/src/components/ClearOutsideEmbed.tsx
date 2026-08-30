"use client";

import { useState } from "react";
import Icon from "./Icon";
import type { LocationCoords } from "@/types";

const DEFAULT_LAT = 40.13;
const DEFAULT_LON = -83.04;

export default function ClearOutsideEmbed({ coords }: { coords?: LocationCoords | null }) {
  const [imgError, setImgError] = useState(false);
  const lat = (coords?.lat ?? DEFAULT_LAT).toFixed(2);
  const lon = (coords?.lon ?? DEFAULT_LON).toFixed(2);
  const forecastUrl = `https://clearoutside.com/forecast/${lat}/${lon}`;
  const imageUrl = `https://clearoutside.com/forecast_image/large/${lat}/${lon}/forecast.png`;

  return (
    <section id="card-weather" className="card w-full mb-8">
      <div className="card-header justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="cloud-sun" className="h-5 w-5 text-sky-400" />
          <h2>Clear Outside — Astronomical Weather Forecast</h2>
        </div>
        <a href={forecastUrl} target="_blank" rel="noopener" className="text-xs text-sky-400 hover:underline">
          Open Full Forecast ↗
        </a>
      </div>
      <div className="card-body grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="rounded-xl overflow-hidden border border-white/5 bg-black/20 p-2 text-center">
          {!imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt="Clear Outside astronomical weather forecast"
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
              <span className="text-3xl mb-2">🌤️</span>
              <p className="text-sm font-semibold text-white mb-1">Clear Outside Chart</p>
              <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                Forecast image preview unavailable directly in browser frame for coordinates ({lat}, {lon}).
              </p>
              <a
                href={forecastUrl}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-all"
              >
                View Full Interactive Forecast on ClearOutside.com
              </a>
            </div>
          )}
        </div>
        <div className="text-sm">
          <h3 className="text-white font-semibold mb-3">How to read this chart</h3>

          <div className="mb-3.5">
            <strong className="block text-sky-400 mb-1">🚦 The Traffic Light System</strong>
            <span className="text-xs text-zinc-400 leading-relaxed">
              <strong>SUMMARY Row:</strong> Red means clouded over. Green means perfectly clear. Orange means mixed conditions.<br />
              <strong>CLOUD Rows:</strong> Pure white squares mean 0% clouds. Dark blue squares mean 100% cloud cover.
            </span>
          </div>

          <div className="mb-3.5">
            <strong className="block text-sky-400 mb-1">🌫️ How to Spot the Haze</strong>
            <span className="text-xs text-zinc-400 leading-relaxed">
              Look at the <strong>REL. HUMIDITY &amp; DEW RISK</strong> rows. When humidity is high, moisture creates a thick,
              milky haze that scatters light and washes out faint stars. If these rows turn Red/Orange, expect poor
              transparency even if cloud cover is 0%.
            </span>
          </div>

          <div>
            <strong className="block text-red-400 mb-1">💧 Telescope Dew Warning</strong>
            <span className="text-xs text-zinc-400 leading-relaxed">
              If the Dew Risk row is glowing red, water vapor will condense quickly. Glass lenses and mirrors will fog up
              and end your session if you don&apos;t use a dew heater or dew shield!
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
