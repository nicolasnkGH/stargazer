"use client";

import React, { useState } from "react";
import Icon from "./Icon";

export const PREFLIGHT_STORAGE_KEY = "stargazer_preflight_checks";

export const PREFLIGHT_ITEMS = [
  { id: "scope", label: "Scope cooled to ambient temperature (30+ mins)" },
  { id: "dark", label: "Bortle <= 6 or local light pollution managed" },
  { id: "moon", label: "Moon phase < 70% or positioned away from target" },
  { id: "dew", label: "Dew shield / heater turned on (dew spread < 5°C)" },
  { id: "filters", label: "Appropriate visual / narrowband filters selected" },
  { id: "power", label: "Battery / power supply fully charged" },
  { id: "camera", label: "Camera sensor / eyepieces & memory card ready" },
];

export function usePreflightChecked() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(PREFLIGHT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(PREFLIGHT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const reset = () => {
    setChecked({});
    try {
      localStorage.removeItem(PREFLIGHT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const completedCount = PREFLIGHT_ITEMS.filter((it) => checked[it.id]).length;
  const isAllDone = completedCount === PREFLIGHT_ITEMS.length;

  return { checked, toggle, reset, completedCount, totalCount: PREFLIGHT_ITEMS.length, isAllDone };
}

export default function PreflightChecklistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { checked, toggle, reset, completedCount, totalCount, isAllDone } = usePreflightChecked();

  if (!open) return null;

  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-green-500/30 bg-slate-950 p-6 shadow-[0_0_50px_rgba(34,197,94,0.15)] text-zinc-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/30">
              <Icon name="check-square" className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Observing Pre-Flight Checklist</h2>
              <p className="text-xs text-zinc-400">Standard field preparation routine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-5 bg-slate-900 rounded-xl p-3.5 border border-white/5">
          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
            <span className="text-zinc-300">Preparation Progress</span>
            <span className={isAllDone ? "text-green-400 font-bold" : "text-sky-400 font-mono"}>
              {completedCount}/{totalCount} Completed ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          {isAllDone && (
            <p className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1.5 animate-pulse">
              <span>🚀</span> All systems verified — your telescope is ready to observe!
            </p>
          )}
        </div>

        {/* Checkbox List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {PREFLIGHT_ITEMS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`w-full flex items-center gap-3 text-left rounded-xl p-3 border transition-all cursor-pointer select-none ${
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
              <span className={`text-xs sm:text-sm ${checked[c.id] ? "line-through text-zinc-400" : "text-zinc-200"}`}>
                {c.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Reset checklist
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sky-500/50 bg-sky-500/20 hover:bg-sky-500/30 px-5 py-2 text-xs font-semibold text-sky-200 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
