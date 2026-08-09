"use client";

import { useState } from "react";
import { FiMaximize } from "react-icons/fi";
import { LuOrbit } from "react-icons/lu";

export default function SolarSystemExplorerCard() {
  const [interactive, setInteractive] = useState(false);

  return (
    <section id="card-solar-system-scope" className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <LuOrbit className="h-5 w-5 text-sky-400" />
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
          <FiMaximize className="h-4 w-4" />
        </a>
      </div>
      <div className="card-body px-0 py-0 overflow-hidden rounded-b-xl relative h-[450px]">
        {!interactive && (
          <div
            className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px] cursor-pointer"
            onClick={() => setInteractive(true)}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 px-5 py-2.5 text-sm text-white backdrop-blur">
              Click to Interact with 3D Model
            </div>
          </div>
        )}
        <iframe
          src="https://eyes.nasa.gov/apps/solar-system/#/home"
          title="NASA Eyes on the Solar System"
          className="w-full h-full border-0"
          style={{ pointerEvents: interactive ? "auto" : "none" }}
          allow="fullscreen"
          loading="lazy"
        />
      </div>
    </section>
  );
}
