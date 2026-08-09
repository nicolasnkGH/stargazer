"use client";

import { useState } from "react";
import { Map as MapIcon, ExternalLink } from "lucide-react";
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
    window.location.hash = "card-targets";
    window.location.reload();
  }

  return (
    <section id="card-light-pollution" className="card w-full">
      <div className="card-header">
        <MapIcon className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <div>
          <h2>Light Pollution Map</h2>
          <p className="text-[0.7rem] text-zinc-500 mt-0.5">
            Map by{" "}
            <a href="https://lightpollutionmap.app/" target="_blank" rel="noopener" className="text-sky-400 hover:underline">
              Light Pollution Map
            </a>
          </p>
        </div>
      </div>
      <div className="card-body flex flex-col items-center text-center gap-4 py-8">
        {bortle && (
          <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            Your sky: Class {bortle.bortle} — {bortle.name}
          </div>
        )}
        <MapIcon className="h-10 w-10 text-sky-400/85" strokeWidth={1.5} />
        <div>
          <h3 className="text-[1.1rem] text-white mb-2">Explore Light Pollution Near You</h3>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            Open the interactive light pollution map centered on your selected coordinates to analyze local Bortle scale class and sky glow.
          </p>
        </div>
        <a
          href={bortle ? `https://lightpollutionmap.app/#zoom=8&lat=${bortle.lat}&lon=${bortle.lon}` : "https://lightpollutionmap.app/"}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
        >
          Open Interactive Map <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        </a>

        {/* Bortle Sky Capability Explorer */}
        <div className="mt-2 w-full max-w-md rounded-xl border border-sky-500/30 bg-slate-950/60 p-4 text-left">
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <span className="text-sm font-bold text-white">✨ Bortle Sky Capability Guide</span>
            <select
              value={explorerClass}
              onChange={(e) => setExplorerClass(e.target.value)}
              className="rounded-lg border border-sky-500/40 bg-slate-950/90 px-2 py-1 text-xs font-semibold text-white outline-none"
            >
              {Object.keys(BORTLE_CLASSES).map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}: {BORTLE_CLASSES[cls].shortDesc}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded bg-black/40 border-l-[3px] border-sky-500 px-3 py-2.5 text-xs text-zinc-200 leading-relaxed mb-3 min-h-[50px]">
            {info.desc}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
            <span>
              🔭 <strong className="text-zinc-300">Amateur Equipment:</strong> {info.equip}
            </span>
          </div>
          <button
            onClick={filterDatabase}
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3.5 py-2 text-sm font-bold text-white hover:brightness-110 transition-all"
          >
            🔭 Filter Target Database By This Bortle Scale
          </button>
        </div>
      </div>
    </section>
  );
}
