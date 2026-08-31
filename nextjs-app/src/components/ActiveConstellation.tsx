"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";
import type { ConstellationData, ConstellationWindow, MapTarget } from "@/types";
import { API_BASE, ALL_CONSTELLATIONS } from "@/lib/constants";
import SourceTooltip from "./SourceTooltip";
import CelestialMap from "./CelestialMap";

export default function ActiveConstellation() {
  const [fullscreen, setFullscreen] = useState(false);
  const [constellations, setConstellations] = useState<ConstellationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAbbr, setSelectedAbbr] = useState<string | null>(null);
  const [constInfo, setConstInfo] = useState<ConstellationWindow | null>(null);
  const [mapTargets, setMapTargets] = useState<MapTarget[]>([]);

  useEffect(() => {
    async function fetchConstellations() {
      try {
        const res = await fetch(`${API_BASE}/constellations?filter_famous=true`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list: ConstellationData[] = data.constellations || [];
        setConstellations(list);
        const visible = list.filter((c) => c.visible).sort((a, b) => b.altitude_deg - a.altitude_deg);
        if (visible[0]) setSelectedAbbr(visible[0].abbr);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch constellations");
      } finally {
        setLoading(false);
      }
    }
    fetchConstellations();
  }, []);

  useEffect(() => {
    if (!selectedAbbr) return;
    let cancelled = false;

    async function fetchMapData(abbr: string) {
      try {
        const [windowRes, targetsRes] = await Promise.all([
          fetch(`${API_BASE}/constellation_window?abbr=${abbr}`),
          fetch(`${API_BASE}/targets?constellation=${abbr}`),
        ]);
        const windowData = windowRes.ok ? await windowRes.json() : null;
        const targetsData = targetsRes.ok ? await targetsRes.json() : { targets: [] };
        if (cancelled) return;
        setConstInfo(windowData && !windowData.error ? windowData : null);
        setMapTargets((targetsData.targets || []).filter((t: MapTarget) => t.ra_hours != null && t.dec_degrees != null));
      } catch {
        if (!cancelled) {
          setConstInfo(null);
          setMapTargets([]);
        }
      }
    }
    fetchMapData(selectedAbbr);

    return () => {
      cancelled = true;
    };
  }, [selectedAbbr]);

  useEffect(() => {
    if (!selectedAbbr) return;
    const found = ALL_CONSTELLATIONS.find((c) => c.abbr.toLowerCase() === selectedAbbr.toLowerCase());
    window.dispatchEvent(
      new CustomEvent("sg-select-constellation", {
        detail: { abbr: selectedAbbr, name: found?.name || selectedAbbr },
      })
    );
  }, [selectedAbbr]);

  if (loading) {
    return (
      <section id="card-active-const" className="w-full">
        <div className="card animate-pulse p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-32 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-active-const" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  const visible = constellations.filter((c) => c.visible).sort((a, b) => b.altitude_deg - a.altitude_deg);
  const highest = visible[0];
  const activeConst = visible.find((c) => c.abbr === selectedAbbr) || ALL_CONSTELLATIONS.find((c) => c.abbr === selectedAbbr) || highest;
  const activeAlt = activeConst && "altitude_deg" in activeConst ? activeConst.altitude_deg : null;
  const activeDir = activeConst && "direction" in activeConst ? activeConst.direction : null;

  const meanRa = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.ra_hours, 0) / mapTargets.length : null;
  const meanDec = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.dec_degrees, 0) / mapTargets.length : null;
  const centerRaHours = constInfo?.ra_hours ?? meanRa;
  const centerDecDeg = constInfo?.dec_degrees ?? meanDec;

  return (
    <section id="card-active-const" className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" className="h-5 w-5 text-sky-400 animate-pulse" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Interactive Constellation Map</h2>
            <p className="text-[0.65rem] text-sky-400/80 font-mono">3D Sky Projection &amp; SIMBAD Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SourceTooltip
            source="CDS SIMBAD & IAU 88"
            description="3D stereographic celestial sphere mapping all 88 International Astronomical Union (IAU) constellations with live CDS Strasbourg SIMBAD astronomical database queries."
            attribution="CDS Strasbourg / IAU"
          />
          <select
            value={selectedAbbr ?? ""}
            onChange={(e) => setSelectedAbbr(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/50 py-1.5 px-2.5 text-xs text-zinc-200 outline-none hover:border-white/30 cursor-pointer"
          >
            {ALL_CONSTELLATIONS.map((c) => {
              const live = visible.find((v) => v.abbr === c.abbr);
              return (
                <option key={c.abbr} value={c.abbr}>
                  {c.emoji} {c.name}{live ? ` — ${live.altitude_deg}°` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="card-body p-4 sm:p-5 flex flex-col gap-3">
        {/* Compact, Screen-Fitting Telemetry & Timing Bar */}
        {activeConst && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeConst.emoji}</span>
              <div>
                <span className="font-bold text-amber-200 text-sm">{activeConst.name}</span>
                <span className="text-amber-400/80 font-mono ml-1 text-xs">({activeConst.abbr})</span>
              </div>
              <span className="rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 font-mono font-bold text-amber-300 text-[0.7rem]">
                {activeAlt != null ? `${activeAlt}° Alt` : "Sky Center"} {activeDir ? `· ${activeDir}` : ""}
              </span>
            </div>

            {constInfo && (
              <div className="flex items-center gap-3 text-[0.75rem] text-slate-300 font-mono">
                <span>Rise: <strong className="text-white">{constInfo.rise_time || "—"}</strong></span>
                <span>Culm: <strong className="text-white">{constInfo.culmination_time || "—"}</strong></span>
                <span>Set: <strong className="text-white">{constInfo.set_time || "—"}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] text-purple-300 hidden md:inline">✨ Click any star to scan via SIMBAD</span>
              <button
                onClick={() => setFullscreen((v) => !v)}
                title="Toggle Fullscreen"
                className="rounded border border-white/10 bg-slate-900/60 px-2 py-0.5 text-xs text-zinc-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {fullscreen ? "✕ Exit" : "⤢ Fullscreen"}
              </button>
            </div>
          </div>
        )}

        {/* 3D Celestial Map with Responsive Screen Height */}
        <div className={fullscreen ? "fixed inset-3 z-[9999] rounded-2xl border border-purple-500/40 bg-slate-950 p-4 shadow-2xl flex flex-col justify-between" : "w-full"}>
          {fullscreen && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-sm font-bold text-sky-300">Interactive 3D Constellation Map — Fullscreen</span>
              <button
                onClick={() => setFullscreen(false)}
                className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                ✕ Close Fullscreen
              </button>
            </div>
          )}
          {centerRaHours != null && centerDecDeg != null ? (
            <CelestialMap targets={mapTargets} centerRaHours={centerRaHours} centerDecDeg={centerDecDeg} />
          ) : (
            <div className="h-[360px] flex items-center justify-center text-sm text-zinc-500">
              Selecting constellation coordinates...
            </div>
          )}
        </div>

        {/* Sleek Horizontal Quick-Jump Chips (replaces bulky 3-column vertical grid) */}
        {visible.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 no-scrollbar">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">
              Visible Now:
            </span>
            {visible.map((c) => (
              <button
                key={c.abbr}
                onClick={() => setSelectedAbbr(c.abbr)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] whitespace-nowrap transition-all border cursor-pointer ${
                  c.abbr === selectedAbbr
                    ? "border-sky-400 bg-sky-500/25 text-sky-100 font-bold shadow-[0_0_10px_rgba(56,189,248,0.25)]"
                    : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.name}</span>
                <span className="text-[0.65rem] font-mono opacity-70">({c.altitude_deg}°)</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
