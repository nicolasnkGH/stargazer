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
import type { MapTarget, StarLookup } from "@/types";

interface CelestialMapProps {
  targets: MapTarget[];
  centerRaHours: number | null;
  centerDecDeg: number | null;
  fullscreen?: boolean;
}

interface SkyClick {
  loading: boolean;
  data: StarLookup | null;
  error: boolean;
}

export default function CelestialMap({ targets, centerRaHours, centerDecDeg, fullscreen }: CelestialMapProps) {
  const t = useTranslations();
  const initializedRef = useRef(false);
  const targetsRef = useRef<MapTarget[]>(targets);
  const ready = useCelestialReady();

  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(null);
  const [skyClick, setSkyClick] = useState<SkyClick | null>(null);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // Trigger resize when fullscreen changes so d3-celestial adapts to new container size.
  useEffect(() => {
    if (initializedRef.current && typeof window !== "undefined" && window.Celestial) {
      window.dispatchEvent(new Event("resize"));
      window.Celestial.redraw();
    }
  }, [fullscreen, ready]);

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
    <div className={`relative w-full ${fullscreen ? "h-full min-h-0" : ""}`}>
      <div
        id={CELESTIAL_MAP_CONTAINER_ID}
        className={`relative overflow-hidden rounded-xl bg-[#0a0f1c] border border-white/10 ${interactive ? "pointer-events-auto touch-none" : "pointer-events-none select-none"} ${fullscreen ? "h-full min-h-0" : "h-[340px] sm:h-[380px] lg:h-[400px] max-h-[46vh] w-full"}`}
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
        <div className="mt-3 rounded-lg border border-purple-500/30 bg-white/[0.03] p-3 text-sm">
          {selectedTarget && (
            <>
              <p className="font-semibold text-zinc-100">{selectedTarget.name}</p>
              <p className="text-xs text-zinc-400">
                {selectedTarget.type || "Object"} · Mag {selectedTarget.magnitude ?? "?"}
              </p>
              {selectedTarget.description && (
                <p className="mt-1 text-xs text-zinc-500">{selectedTarget.description}</p>
              )}
            </>
          )}
          {skyClick?.loading && <p className="text-xs text-purple-400">{t("simbad_scanning")}</p>}
          {skyClick?.error && <p className="text-xs text-red-400">{t("simbad_error")}</p>}
          {skyClick?.data && (
            <>
              <p className="font-semibold text-zinc-100">{skyClick.data.name.replace("* ", "")}</p>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-zinc-400">{t("simbad_spectral")}</span>
                <span className="font-mono text-green-400">{skyClick.data.spectral_type ?? t("simbad_unknown")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{t("simbad_dist")}</span>
                <span className="font-mono text-sky-400">{skyClick.data.distance_ly ?? t("simbad_unknown")}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
