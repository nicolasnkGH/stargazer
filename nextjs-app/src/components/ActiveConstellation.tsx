"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FiStar } from "react-icons/fi";
import type { ConstellationData, ConstellationWindow, MapTarget } from "@/types";
import { API_BASE, ALL_CONSTELLATIONS } from "@/lib/constants";
import CelestialMap from "./CelestialMap";

export default function ActiveConstellation() {
  const t = useTranslations();
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

  const meanRa = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.ra_hours, 0) / mapTargets.length : null;
  const meanDec = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.dec_degrees, 0) / mapTargets.length : null;
  const centerRaHours = constInfo?.ra_hours ?? meanRa;
  const centerDecDeg = constInfo?.dec_degrees ?? meanDec;

  return (
    <section id="card-active-const" className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <FiStar className="h-5 w-5 text-amber-400" />
          <h2>Active Constellations</h2>
        </div>
        <select
          value={selectedAbbr ?? ""}
          onChange={(e) => setSelectedAbbr(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 py-1 px-2 text-xs text-zinc-200 outline-none hover:border-white/30"
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
      <div className="card-body">
        {highest ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{highest.emoji}</span>
              <div>
                <p className="text-lg font-bold text-amber-200">{highest.name}</p>
                <p className="text-xs text-amber-300/70">{highest.abbr} · {highest.direction}</p>
              </div>
              <span className="ml-auto text-2xl font-bold text-amber-400 font-mono">
                {highest.altitude_deg}°
              </span>
            </div>
            <div className="w-full rounded-full bg-white/10 h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                style={{ width: `${Math.min(highest.altitude_deg / 90 * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-amber-300/60 mt-2">Azimuth: {highest.azimuth_deg}°</p>
          </div>
        ) : (
          <div className="card card-body mb-5">
            <p className="text-sm text-zinc-400">No famous constellations currently visible above the horizon.</p>
          </div>
        )}

        {selectedAbbr && (centerRaHours != null && centerDecDeg != null) && (
          <div className="mb-5">
            {constInfo && (
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>{constInfo.status}</span>
                <span>Rise: <span className="font-mono text-zinc-300">{constInfo.rise_time}</span></span>
                <span>Culmination: <span className="font-mono text-zinc-300">{constInfo.culmination_time}</span></span>
                <span>Set: <span className="font-mono text-zinc-300">{constInfo.set_time}</span></span>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-purple-400">{t("simbad_instruction")}</span>
              <button
                onClick={() => setFullscreen((v) => !v)}
                title="Toggle Fullscreen"
                className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
              >
                {fullscreen ? "✕" : "⤢"}
              </button>
            </div>
            <div className={fullscreen ? "fixed inset-4 z-[9999] rounded-xl border border-purple-500/40 bg-slate-950 p-4 overflow-y-auto shadow-2xl" : ""}>
              <CelestialMap targets={mapTargets} centerRaHours={centerRaHours} centerDecDeg={centerDecDeg} />
            </div>
          </div>
        )}

        {/* All visible constellations */}
        {visible.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visible.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedAbbr(c.abbr)}
                className={`rounded-lg border p-3 flex items-center gap-2 text-left transition-colors ${
                  c.abbr === selectedAbbr
                    ? "border-amber-500/40 bg-amber-500/[0.08]"
                    : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[0.65rem] text-zinc-500 font-mono">{c.altitude_deg}° {c.direction}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
