"use client";

import React from "react";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import { PREFLIGHT_ITEMS, usePreflightChecked } from "./PreflightChecklistModal";

export default function PreflightChecklistCard() {
  const { checked, toggle, reset, completedCount, totalCount, isAllDone } = usePreflightChecked();
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <section id="card-preflight" className="card w-full mb-8 border border-green-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header justify-between border-b border-green-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="check-square" className="h-5 w-5 text-green-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-wide">Observing Pre-Flight Checklist</h2>
            <p className="text-[0.68rem] text-green-400/80 font-mono">Telescope, Optical &amp; Environmental Preparation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Astronomy Field Standards"
            description="Established amateur and professional astronomical field checklist based on thermal equilibrium, seeing degradation thresholds, and dew prevention protocols."
            attribution="StarGazer Field Optics Protocol"
          />
          <button
            type="button"
            onClick={reset}
            className="text-[0.7rem] text-zinc-400 hover:text-zinc-200 underline transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="card-body p-6">
        <div className="mb-5 bg-slate-950/80 rounded-xl p-3.5 border border-white/5">
          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
            <span className="text-zinc-300">Preparation Progress</span>
            <span className={isAllDone ? "text-green-400 font-bold" : "text-sky-400 font-mono"}>
              {completedCount} of {totalCount} Completed ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {PREFLIGHT_ITEMS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-3 text-left rounded-xl p-3 border transition-all cursor-pointer select-none ${
                checked[c.id]
                  ? "bg-green-500/[0.08] border-green-500/30 text-zinc-200"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-400"
              }`}
            >
              {checked[c.id] ? (
                <Icon name="check-square" className="h-5 w-5 text-green-400 flex-shrink-0" />
              ) : (
                <Icon name="square" className="h-5 w-5 text-zinc-600 flex-shrink-0" />
              )}
              <span className={`text-xs ${checked[c.id] ? "line-through text-zinc-400" : "text-zinc-200"}`}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
