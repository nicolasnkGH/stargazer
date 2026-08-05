"use client";

import { useEffect, useRef, useState } from "react";
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
}

interface SkyClick {
  loading: boolean;
  data: StarLookup | null;
  error: boolean;
}

export default function CelestialMap({ targets, centerRaHours, centerDecDeg }: CelestialMapProps) {
  const initializedRef = useRef(false);
  const targetsRef = useRef<MapTarget[]>(targets);
  const ready = useCelestialReady();

  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(null);
  const [skyClick, setSkyClick] = useState<SkyClick | null>(null);

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

  return (
    <div className="relative w-full">
      <div
        id={CELESTIAL_MAP_CONTAINER_ID}
        className="relative h-[360px] w-full overflow-hidden rounded-lg bg-[#0a0f1c]"
      >
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Loading sky map...
          </div>
        )}
      </div>

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
          {skyClick?.loading && <p className="text-xs text-purple-400">Scanning SIMBAD database...</p>}
          {skyClick?.error && <p className="text-xs text-red-400">Could not resolve star data at this location.</p>}
          {skyClick?.data && (
            <>
              <p className="font-semibold text-zinc-100">{skyClick.data.name.replace("* ", "")}</p>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-zinc-400">Spectral Type</span>
                <span className="font-mono text-green-400">{skyClick.data.spectral_type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Distance</span>
                <span className="font-mono text-sky-400">{skyClick.data.distance_ly}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
