"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCelestialReady } from "@/hooks/useCelestialReady";
import {
  CELESTIAL_MAP_CONTAINER_ID,
  CELESTIAL_ROTATE_DURATION_MS,
  API_BASE,
  buildCelestialConfig,
  targetMarkerColor,
} from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import { showToast } from "@/lib/toast";
import FovModal from "./FovModal";
import type { MapTarget, StarLookup } from "@/types";

interface CelestialMapProps {
  targets: MapTarget[];
  centerRaHours: number | null;
  centerDecDeg: number | null;
}

interface SkyClick {
  loading: boolean;
  data: StarLookup | null;
  error: boolean;
}

export default function CelestialMap({ targets, centerRaHours, centerDecDeg }: CelestialMapProps) {
  const t = useTranslations();
  const initializedRef = useRef(false);
  const targetsRef = useRef<MapTarget[]>(targets);
  const ready = useCelestialReady();

  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(null);
  const [skyClick, setSkyClick] = useState<SkyClick | null>(null);
  const [fovModalTarget, setFovModalTarget] = useState<{ name: string; raDeg: number; decDeg: number } | null>(null);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // Init (once) or smoothly rotate to the new center (subsequent constellation switches).
  useEffect(() => {
    if (!ready || centerRaHours == null || centerDecDeg == null) return;
    const Celestial = window.Celestial;
    const d3 = window.d3;
    if (!Celestial || !d3) return;

    const centerRaDeg = centerRaHours * 15;

    if (!initializedRef.current) {
      Celestial.display(buildCelestialConfig(centerRaDeg, centerDecDeg));
      initializedRef.current = true;

      // Custom "raw" layer: our own target markers drawn on top of Celestial's canvas.
      Celestial.add({
        type: "raw",
        callback: () => {},
        redraw: () => {
          const proj = Celestial.mapProjection;
          const nodes = d3
            .select(`#${CELESTIAL_MAP_CONTAINER_ID}`)
            .selectAll(".custom-target")
            .data(targetsRef.current, (d: MapTarget) => d.name);

          nodes
            .enter()
            .append("circle")
            .attr("class", "custom-target")
            .attr("r", (d: MapTarget) => Math.max(3, 7 - (d.magnitude || 5) / 2))
            .attr("fill", (d: MapTarget) => targetMarkerColor(d.type || ""))
            .style("stroke", "rgba(255,255,255,0.8)")
            .style("stroke-width", 1)
            .style("cursor", "pointer")
            .style("filter", "drop-shadow(0 0 6px rgba(255,255,255,0.5))")
            .on("click", (d: MapTarget) => {
              setSkyClick(null);
              setSelectedTarget(d);
            });

          nodes
            .attr("cx", (d: MapTarget) => proj([d.ra_hours * 15, d.dec_degrees])?.[0] ?? -100)
            .attr("cy", (d: MapTarget) => proj([d.ra_hours * 15, d.dec_degrees])?.[1] ?? -100);

          nodes.exit().remove();
        },
      });
    } else {
      const proj = Celestial.mapProjection;
      const currentRot = proj.rotate();
      const targetRot: [number, number, number] = [-centerRaDeg, -centerDecDeg, 0];

      d3.select(`#${CELESTIAL_MAP_CONTAINER_ID} canvas`)
        .transition()
        .duration(CELESTIAL_ROTATE_DURATION_MS)
        .tween("rotate", () => {
          const interpolator = d3.interpolate(currentRot, targetRot);
          return (t: number) => {
            proj.rotate(interpolator(t));
            Celestial.redraw();
          };
        });
    }
  }, [ready, centerRaHours, centerDecDeg]);

  // Click on empty sky (not a target marker) → SIMBAD lookup at that RA/Dec.
  useEffect(() => {
    if (!ready) return;
    const Celestial = window.Celestial;
    const d3 = window.d3;
    const canvas = document.querySelector(`#${CELESTIAL_MAP_CONTAINER_ID} canvas`) as HTMLCanvasElement | null;
    if (!Celestial || !d3 || !canvas) return;

    const handleClick = async (event: MouseEvent) => {
      const proj = Celestial.mapProjection;
      if (!proj) return;
      const rect = canvas.getBoundingClientRect();
      const coords = proj.invert([event.clientX - rect.left, event.clientY - rect.top]);
      if (!coords) return;

      let ra = coords[0];
      if (ra < 0) ra += 360;
      const dec = coords[1];

      setSelectedTarget(null);
      setSkyClick({ loading: true, data: null, error: false });

      try {
        const res = await fetch(`${API_BASE}/star?ra=${ra}&dec=${dec}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSkyClick({ loading: false, data, error: false });
      } catch {
        setSkyClick({ loading: false, data: null, error: true });
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [ready, centerRaHours, centerDecDeg]);

  const [interactive, setInteractive] = useState(false);

  return (
    <div className="relative w-full">
      <div
        id={CELESTIAL_MAP_CONTAINER_ID}
        className={`relative h-[340px] sm:h-[380px] lg:h-[400px] max-h-[46vh] w-full overflow-hidden rounded-xl bg-[#0a0f1c] border border-white/10 ${interactive ? "pointer-events-auto" : "pointer-events-none select-none"}`}
      >
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Loading sky map...
          </div>
        )}
      </div>

      {!interactive && ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[2px] rounded-xl">
          <button
            onClick={() => setInteractive(true)}
            className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-slate-900/90 px-6 py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-105 hover:border-sky-300 transition-all pointer-events-auto"
          >
            <span>✨ Click to interact</span>
          </button>
        </div>
      )}

      {interactive && (
        <button
          onClick={() => setInteractive(false)}
          className="absolute top-3 right-3 z-20 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40 hover:bg-slate-800 transition-colors shadow-lg"
        >
          🔒 Lock Map (Allow Page Scroll)
        </button>
      )}

      {(selectedTarget || skyClick) && (
        <div className="mt-3 rounded-xl border border-purple-500/40 bg-slate-900/95 p-4 shadow-xl text-sm relative animate-fadeIn">
          <button
            onClick={() => {
              setSelectedTarget(null);
              setSkyClick(null);
            }}
            className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-100 transition-colors p-1"
            title="Dismiss"
          >
            ✕
          </button>

          {selectedTarget && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap pr-6">
                <span className="text-xl">✨</span>
                <span className="font-bold text-base text-zinc-100">{selectedTarget.name}</span>
                <span className="rounded bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-xs text-purple-300 font-medium">
                  {selectedTarget.type || "Deep Sky Object"}
                </span>
                {selectedTarget.magnitude != null && (
                  <span className="rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-xs font-mono text-sky-300">
                    Mag {selectedTarget.magnitude}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-300 bg-white/[0.03] p-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">RA (Hours)</span>
                  {selectedTarget.ra_hours.toFixed(2)}h
                </div>
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">Dec (Degrees)</span>
                  {selectedTarget.dec_degrees.toFixed(2)}°
                </div>
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">Status</span>
                  <span className="text-emerald-400">In View</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">Recommended</span>
                  <span className="text-amber-400">Tonight</span>
                </div>
              </div>

              {selectedTarget.description && (
                <p className="text-xs text-zinc-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                  {selectedTarget.description}
                </p>
              )}

              {/* Action buttons directly beneath the map */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const id = selectedTarget.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
                    const err = addToPlan(id, `🔭 ${selectedTarget.name}`);
                    showToast(err || `Added ${selectedTarget.name} to observing plan!`);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/20 hover:bg-sky-500/30 px-3.5 py-1.5 text-xs font-semibold text-sky-200 transition-all active:scale-95 shadow-sm"
                >
                  <span>Add to Plan +</span>
                </button>

                <button
                  onClick={() => setFovModalTarget({
                    name: selectedTarget.name,
                    raDeg: selectedTarget.ra_hours * 15,
                    decDeg: selectedTarget.dec_degrees,
                  })}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-500/20 hover:bg-purple-500/30 px-3.5 py-1.5 text-xs font-semibold text-purple-200 transition-all active:scale-95 shadow-sm"
                >
                  <span>Simulate View 🔭</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("card-targets");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
                >
                  <span>View in Target Catalog ↗</span>
                </button>
              </div>
            </div>
          )}

          {skyClick?.loading && (
            <div className="flex items-center gap-2 text-purple-400 py-2">
              <span className="animate-spin">🌀</span>
              <p className="text-xs">{t("simbad_scanning")}</p>
            </div>
          )}

          {skyClick?.error && (
            <div className="flex items-center gap-2 text-red-400 py-2">
              <span>⚠️</span>
              <p className="text-xs">{t("simbad_error")}</p>
            </div>
          )}

          {skyClick?.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pr-6">
                <span className="text-xl">⭐</span>
                <span className="font-bold text-base text-zinc-100">
                  {skyClick.data.name.replace("* ", "")}
                </span>
                <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-xs text-indigo-300">
                  SIMBAD Star
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/[0.03] p-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">{t("simbad_spectral")}</span>
                  <span className="text-green-400">{skyClick.data.spectral_type ?? t("simbad_unknown")}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">{t("simbad_dist")}</span>
                  <span className="text-sky-400">{skyClick.data.distance_ly ?? t("simbad_unknown")}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[0.65rem] uppercase">Catalog</span>
                  <span className="text-purple-400">CDS Strasbourg</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const cleanName = skyClick.data?.name.replace("* ", "") || "Star";
                    const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                    const err = addToPlan(id, `⭐ ${cleanName}`);
                    showToast(err || `Added ${cleanName} to observing plan!`);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/20 hover:bg-sky-500/30 px-3.5 py-1.5 text-xs font-semibold text-sky-200 transition-all active:scale-95 shadow-sm"
                >
                  <span>Add Star to Plan +</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {fovModalTarget && (
        <FovModal
          open
          onClose={() => setFovModalTarget(null)}
          raDeg={fovModalTarget.raDeg}
          decDeg={fovModalTarget.decDeg}
          targetName={fovModalTarget.name}
        />
      )}
    </div>
  );
}
