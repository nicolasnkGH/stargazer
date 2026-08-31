"use client";

import { useState } from "react";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";

export default function SolarSystemExplorerCard() {
  const [interactive, setInteractive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const nasaUrl = "https://eyes.nasa.gov/apps/solar-system/#/home";

  return (
    <section
      id="card-solar-system-scope"
      className={`card w-full mb-8 border border-sky-500/20 bg-slate-900/90 shadow-xl transition-all ${
        isFullscreen ? "fixed inset-3 z-[9999] m-0 rounded-2xl flex flex-col bg-slate-950/95 border-sky-400/50 shadow-2xl" : ""
      }`}
    >
      <div className="card-header justify-between flex-wrap gap-2 px-6 py-4 border-b border-sky-500/20 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-sky-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-wide">Interactive 3D Solar System</h2>
            <p className="text-[0.7rem] text-slate-400 mt-0.5">
              Model by{" "}
              <a href="https://eyes.nasa.gov/apps/solar-system/" target="_blank" rel="noopener" className="text-sky-400 hover:underline">
                NASA Eyes on the Solar System
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SourceTooltip
            source="NASA JPL Eyes"
            description="Interactive 3D real-time simulation rendered using official NASA Jet Propulsion Laboratory (JPL) planetary ephemeris, orbital mechanics, and active spacecraft trajectory telemetry."
            attribution="NASA JPL / eyes.nasa.gov"
          />
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
          >
            <span>{isFullscreen ? "✕ Close Fullscreen" : "⤢ Expand"}</span>
          </button>
          <a
            href={nasaUrl}
            target="_blank"
            rel="noopener"
            className="text-xs text-sky-400 hover:underline flex items-center gap-1"
            title="Open in NASA Eyes App"
          >
            <span>Open in NASA Eyes ↗</span>
          </a>
        </div>
      </div>

      <div
        className={`card-body px-0 py-0 overflow-hidden rounded-b-xl relative transition-all ${
          isFullscreen ? "flex-1 w-full h-full min-h-[500px]" : "h-[560px] sm:h-[640px] lg:h-[680px] max-h-[72vh] min-h-[480px]"
        }`}
      >
        {!interactive ? (
          <div
            className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 cursor-pointer p-6 text-center"
            onClick={() => setInteractive(true)}
          >
            <div className="mb-3 text-4xl">🪐</div>
            <h3 className="text-base font-bold text-white mb-1">NASA 3D Solar System Explorer</h3>
            <p className="text-xs text-zinc-400 max-w-md mb-4 leading-relaxed">
              Explore live planetary orbits and 3D spacecraft trajectories directly from NASA Eyes on the Solar System. Calibrated to your display size.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition-all shadow-lg shadow-sky-900/20"
              >
                <Icon name="play" className="h-4 w-4 fill-current" />
                Launch 3D Model Here
              </button>
              <a
                href={nasaUrl}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-slate-800 transition-all"
              >
                Open in NASA Eyes App ↗
              </a>
            </div>
          </div>
        ) : (
          <iframe
            src={nasaUrl}
            title="NASA Eyes on the Solar System"
            className="w-full h-full border-0"
            allow="fullscreen"
            loading="lazy"
          />
        )}
      </div>
    </section>
  );
}
