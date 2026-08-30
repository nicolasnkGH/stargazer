"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function SolarSystemExplorerCard() {
  const [interactive, setInteractive] = useState(false);

  return (
    <section id="card-solar-system-scope" className="card w-full mb-8">
      <div className="card-header justify-between">
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
          href="https://eyes.nasa.gov/apps/solar-system/#/home"
          target="_blank"
          rel="noopener"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Full Screen"
        >
          <Icon name="maximize" className="h-4 w-4" />
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
            <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition-all shadow-lg shadow-sky-900/20">
              <Icon name="play" className="h-4 w-4 fill-current" />
              Click to Launch 3D Simulation
            </div>
          </div>
        ) : (
          <iframe
            src="https://eyes.nasa.gov/apps/solar-system/#/home"
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
