"use client";

import { useState } from "react";
import Icon from "./Icon";
import { BORTLE_CLASSES, BORTLE_STORAGE_KEY } from "@/lib/constants";
import type { BortleInfo } from "@/types";

interface LightPollutionCardProps {
  bortle: BortleInfo | null;
}

export default function LightPollutionCard({ bortle }: LightPollutionCardProps) {
  const [explorerClass, setExplorerClass] = useState(String(bortle?.bortle ?? 6));
  const info = BORTLE_CLASSES[explorerClass] ?? BORTLE_CLASSES["6"];

  function filterDatabase() {
    localStorage.setItem(BORTLE_STORAGE_KEY, explorerClass);
    const targetDb = document.getElementById("card-targets");
    if (targetDb) {
      targetDb.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <section id="card-light-pollution" className="card w-full mb-8 border border-sky-500/20 overflow-hidden">
      {/* Header */}
      <div className="card-header justify-between border-b border-sky-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="map" className="h-5 w-5 text-sky-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-wide">Light Pollution Map</h2>
            <p className="text-[0.7rem] text-slate-400 mt-0.5">
              Map by{" "}
              <a href="https://lightpollutionmap.app/" target="_blank" rel="noopener" className="text-sky-400 hover:underline">
                Light Pollution Map
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Card Body with 1:1 Vanilla Bortle Background Image */}
      <div
        className="card-body flex flex-col items-center justify-center text-center gap-4 p-8 relative min-h-[340px]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.25) 20%, rgba(100, 116, 139, 0.25) 20%, rgba(100, 116, 139, 0.25) 40%, rgba(71, 85, 105, 0.25) 40%, rgba(71, 85, 105, 0.25) 60%, rgba(51, 65, 85, 0.25) 60%, rgba(51, 65, 85, 0.25) 80%, rgba(15, 23, 42, 0.25) 80%, rgba(15, 23, 42, 0.25) 100%), url(/textures/bortle_scale_bg.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Subtle Map Grid Glow Overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(rgba(59,130,246,0.3)_1px,transparent_0)] bg-[size:20px_20px] pointer-events-none" />

        {/* Top Status Pill */}
        <div className="z-10 rounded-full border border-sky-400/50 bg-slate-900/90 px-5 py-1.5 text-xs font-bold text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
          {bortle ? `Your sky: Class ${bortle.bortle} — ${bortle.name}` : "Your sky: Class 6 — Bright Suburban Sky"}
        </div>

        <Icon name="map" className="h-10 w-10 text-sky-400 z-10" />

        <div className="z-10 max-w-md">
          <h3 className="text-lg font-bold text-white mb-2">Explore Light Pollution Near You</h3>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Open the interactive light pollution map centered on your selected coordinates to analyze local Bortle scale class and sky glow.
          </p>
        </div>

        <a
          href={bortle ? `https://lightpollutionmap.app/#zoom=8&lat=${bortle.lat}&lon=${bortle.lon}` : "https://lightpollutionmap.app/"}
          target="_blank"
          rel="noopener noreferrer"
          className="z-10 inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-95"
        >
          <span>Open Interactive Map</span>
          <Icon name="external-link" className="h-3.5 w-3.5" />
        </a>

        {/* Bortle Sky Capability Explorer Box */}
        <div className="z-10 mt-2 w-full max-w-lg rounded-2xl border border-sky-500/40 bg-slate-950/80 p-5 text-left backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>✨</span>
              <span>Bortle Sky Capability Guide</span>
            </span>
            <select
              value={explorerClass}
              onChange={(e) => setExplorerClass(e.target.value)}
              className="rounded-lg border border-sky-500/40 bg-slate-900 px-3 py-1 text-xs font-semibold text-sky-300 outline-none cursor-pointer"
            >
              {Object.keys(BORTLE_CLASSES).map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}: {BORTLE_CLASSES[cls].shortDesc}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-black/60 border-l-4 border-sky-400 p-3.5 text-xs text-slate-200 leading-relaxed mb-3">
            {info.desc}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
            <span>
              🔭 <strong className="text-white">Amateur Equipment:</strong> {info.equip}
            </span>
          </div>

          <button
            onClick={filterDatabase}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            🔭 Filter Target Database By This Bortle Scale
          </button>
        </div>
      </div>
    </section>
  );
}
