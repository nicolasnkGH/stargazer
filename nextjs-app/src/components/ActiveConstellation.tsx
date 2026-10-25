"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import type { ConstellationData, ConstellationWindow, MapTarget } from "@/types";
import { API_BASE, ALL_CONSTELLATIONS, CONSTELLATION_COORDS } from "@/lib/constants";
import SourceTooltip from "./SourceTooltip";
import CelestialMap from "./CelestialMap";

const subscribe = () => () => {};

export default function ActiveConstellation() {
  const t = useTranslations();
  const [fullscreen, setFullscreen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
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
        const defaultChoice = visible[0]?.abbr || list[0]?.abbr || ALL_CONSTELLATIONS[0].abbr;
        setSelectedAbbr((prev) => prev || defaultChoice);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch constellations");
        setSelectedAbbr((prev) => prev || ALL_CONSTELLATIONS[0].abbr);
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

  // Lock body scroll in fullscreen mode and handle Escape key
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(false);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [fullscreen]);

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
  const activeConst = visible.find((c) => c.abbr === selectedAbbr) || ALL_CONSTELLATIONS.find((c) => c.abbr === selectedAbbr) || highest || ALL_CONSTELLATIONS[0];
  const activeAlt = activeConst && "altitude_deg" in activeConst ? activeConst.altitude_deg : null;
  const activeDir = activeConst && "direction" in activeConst ? activeConst.direction : null;

  const currentAbbr = selectedAbbr || activeConst.abbr;
  const fallbackCoords = CONSTELLATION_COORDS[currentAbbr] || CONSTELLATION_COORDS["UMa"] || { ra: 11.31, dec: 50.72 };
  const meanRa = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.ra_hours, 0) / mapTargets.length : null;
  const meanDec = mapTargets.length > 0 ? mapTargets.reduce((s, t) => s + t.dec_degrees, 0) / mapTargets.length : null;
  const centerRaHours = constInfo?.ra_hours ?? meanRa ?? fallbackCoords.ra;
  const centerDecDeg = constInfo?.dec_degrees ?? meanDec ?? fallbackCoords.dec;

  return (
    <>
      {/* Fullscreen Overlay via React Portal directly into body */}
      {fullscreen && mounted && createPortal(
        <div
          id="celestial-map-fullscreen-overlay"
          className="fixed inset-0 z-[100000] w-screen h-screen bg-[#030712] flex flex-col overflow-hidden text-slate-100 select-none animate-fadeIn"
        >
          {/* Dedicated Fullscreen Top Bar */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-2xl flex-none shadow-2xl z-30 gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="sparkles" className="h-5 w-5 text-cyan-400 animate-pulse flex-none" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                  <span>{t("interactive_const_map")}</span>
                  <span className="text-[0.65rem] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    {t("btn_fullscreen")}
                  </span>
                </h2>
                <p className="text-[0.65rem] text-cyan-400/80 font-mono hidden sm:block truncate">
                  {t("const_map_subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <SourceTooltip
                source="CDS SIMBAD & IAU 88"
                description={t("source_simbad_desc")}
                attribution={t("source_simbad_attr")}
              />
              <select
                value={selectedAbbr ?? ""}
                onChange={(e) => setSelectedAbbr(e.target.value)}
                aria-label="Select Constellation"
                className="rounded-lg border border-cyan-500/30 bg-slate-900/90 py-1.5 px-2.5 text-xs text-zinc-100 outline-none hover:border-cyan-400 focus:border-cyan-400 cursor-pointer shadow-inner"
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
              <button
                onClick={() => setFullscreen(false)}
                title="Exit Fullscreen (Esc)"
                className="rounded-lg border border-red-500/50 bg-red-950/70 hover:bg-red-900 text-red-200 hover:text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>✕</span>
                <span>{t("btn_exit_fullscreen")}</span>
                <span className="text-[0.65rem] opacity-70 font-mono hidden md:inline">(Esc)</span>
              </button>
            </div>
          </header>

          {/* Fullscreen Telemetry Bar */}
          {activeConst && (
            <div className="border-b border-amber-500/20 bg-amber-500/[0.08] px-4 sm:px-6 py-2 flex items-center justify-between flex-wrap gap-2 text-xs flex-none shadow-sm z-20">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeConst.emoji}</span>
                <div>
                  <span className="font-bold text-amber-200 text-sm">{activeConst.name}</span>
                  <span className="text-amber-400/80 font-mono ml-1 text-xs">({activeConst.abbr})</span>
                </div>
                <span className="rounded-md border border-amber-500/30 bg-amber-950/50 px-2 py-0.5 font-mono font-bold text-amber-300 text-[0.7rem]">
                  {activeAlt != null ? `${activeAlt}° Alt` : "Sky Center"} {activeDir ? `· ${activeDir}` : ""}
                </span>
              </div>

              {constInfo && (
                <div className="flex items-center gap-3 sm:gap-4 text-[0.75rem] text-slate-300 font-mono">
                  <span>{t("lbl_rise")} <strong className="text-white">{constInfo.rise_time || "—"}</strong></span>
                  <span>{t("lbl_culm")} <strong className="text-white">{constInfo.culmination_time || "—"}</strong></span>
                  <span>{t("lbl_set")} <strong className="text-white">{constInfo.set_time || "—"}</strong></span>
                </div>
              )}

              <span className="text-[0.7rem] text-purple-300 font-medium hidden md:inline">{t("click_star_simbad")}</span>
            </div>
          )}

          {/* Fullscreen Responsive Celestial Map */}
          <main className="flex-1 w-full min-h-0 relative bg-[#070b14] flex flex-col overflow-hidden">
            <CelestialMap
              targets={mapTargets}
              centerRaHours={centerRaHours}
              centerDecDeg={centerDecDeg}
              fullscreen={true}
            />
          </main>

          {/* Fullscreen Bottom Quick-Jump Bar */}
          {visible.length > 0 && (
            <footer className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-2 border-t border-white/10 bg-slate-950/90 backdrop-blur-md no-scrollbar flex-none z-20">
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                <Icon name="sparkles" className="h-3 w-3 text-cyan-400" />
                {t("visible_now")}:
              </span>
              {visible.map((c) => (
                <button
                  key={c.abbr}
                  onClick={() => setSelectedAbbr(c.abbr)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-all border cursor-pointer ${
                    c.abbr === selectedAbbr
                      ? "border-cyan-400 bg-cyan-500/30 text-cyan-100 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:text-white hover:border-cyan-500/40"
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                  <span className="text-[0.65rem] font-mono opacity-80">({c.altitude_deg}°)</span>
                </button>
              ))}
            </footer>
          )}
        </div>,
        document.body
      )}

      {/* Main Page Dashboard Card */}
      {fullscreen ? (
        <section
          id="card-active-const"
          className="card w-full border border-cyan-500/30 bg-slate-950/60 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] min-h-[380px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="sparkles" className="h-6 w-6 text-cyan-400 animate-pulse" />
            <h3 className="text-base font-bold text-slate-100">{t("interactive_const_map")}</h3>
            <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
              {t("btn_fullscreen")}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mb-4">{t("const_map_subtitle")}</p>
          <button
            onClick={() => setFullscreen(false)}
            className="rounded-xl border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900 px-5 py-2.5 text-xs font-bold text-cyan-200 hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer flex items-center gap-2"
          >
            <span>✕</span>
            <span>{t("btn_exit_fullscreen")}</span>
          </button>
        </section>
      ) : (
        <section id="card-active-const" className="card w-full transition-all">
          <div className="card-header justify-between flex-wrap gap-2 px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Icon name="sparkles" className="h-5 w-5 text-sky-400 animate-pulse" />
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{t("interactive_const_map")}</span>
                </h2>
                <p className="text-[0.65rem] text-sky-400/80 font-mono">{t("const_map_subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SourceTooltip
                source="CDS SIMBAD & IAU 88"
                description={t("source_simbad_desc")}
                attribution={t("source_simbad_attr")}
              />
              <select
                value={selectedAbbr ?? ""}
                onChange={(e) => setSelectedAbbr(e.target.value)}
                aria-label="Select Constellation"
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
              <button
                onClick={() => setFullscreen(true)}
                title="Toggle Fullscreen"
                className="rounded-lg border border-sky-500/30 bg-sky-950/60 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-white hover:bg-sky-900/80 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⛶</span>
                <span>{t("btn_fullscreen")}</span>
              </button>
            </div>
          </div>

          <div className="card-body p-3 sm:p-4 flex flex-col gap-2.5">
            {/* Compact, Screen-Fitting Telemetry & Timing Bar */}
            {activeConst && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-1.5 flex items-center justify-between flex-wrap gap-2 text-xs flex-none">
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
                    <span>{t("lbl_rise")} <strong className="text-white">{constInfo.rise_time || "—"}</strong></span>
                    <span>{t("lbl_culm")} <strong className="text-white">{constInfo.culmination_time || "—"}</strong></span>
                    <span>{t("lbl_set")} <strong className="text-white">{constInfo.set_time || "—"}</strong></span>
                  </div>
                )}

                <span className="text-[0.7rem] text-purple-300 hidden md:inline">{t("click_star_simbad")}</span>
              </div>
            )}

            {/* 3D Celestial Map */}
            <div className="w-full">
              <CelestialMap
                targets={mapTargets}
                centerRaHours={centerRaHours}
                centerDecDeg={centerDecDeg}
                fullscreen={false}
              />
            </div>

            {/* Sleek Horizontal Quick-Jump Chips */}
            {visible.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 no-scrollbar flex-none">
                <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">
                  {t("visible_now")}
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
      )}
    </>
  );
}
