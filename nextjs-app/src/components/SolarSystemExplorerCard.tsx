"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function SolarSystemExplorerCard() {
  const [interactive, setInteractive] = useState(false);
  const nasaUrl = "https://eyes.nasa.gov/apps/solar-system/#/home";

  return (
    <section id="card-solar-system-scope" className="card w-full mb-8">
      <div className="card-header justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-sky-400" />
          <div>
            <h2>Interactive 3D Solar System</h2>
            <p className="text-[0.7rem] text-zinc-500 mt-0.5">
              Model by{" "}
              <a href="https://eyes.nasa.gov/apps/solar-system/" target="_blank" rel="noopener" className="text-sky-400 hover:underline">
                NASA Eyes on the Solar System
              </a>
            </p>
          </div>
        </div>
        <a
          href={nasaUrl}
          target="_blank"
          rel="noopener"
          className="text-xs text-sky-400 hover:underline flex items-center gap-1"
          title="Open in NASA Eyes App"
        >
          <span>Open Full 3D Model ↗</span>
        </a>
      </div>
      <div className="card-body px-0 py-0 overflow-hidden rounded-b-xl relative h-[450px]">
        {!interactive ? (
          <div
            className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 cursor-pointer p-6 text-center"
            onClick={() => setInteractive(true)}
          >
            <div className="mb-3 text-4xl">🪐</div>
            <h3 className="text-base font-bold text-white mb-1">NASA 3D Solar System Explorer</h3>
            <p className="text-xs text-zinc-400 max-w-md mb-4">
              Explore live planetary orbits and 3D spacecraft trajectories directly from NASA Eyes on the Solar System.
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
