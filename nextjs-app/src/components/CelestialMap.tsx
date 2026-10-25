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
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const targetsRef = useRef<MapTarget[]>(targets);
  const ready = useCelestialReady();

  const [selectedTarget, setSelectedTarget] = useState<MapTarget | null>(null);
  const [skyClick, setSkyClick] = useState<SkyClick | null>(null);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // Robust container-aware resize handling via ResizeObserver
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.Celestial) return;
    const el = containerRef.current;
    if (!el) return;

    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      const cel = window.Celestial;
      if (!cel || !initializedRef.current) return;
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (w > 0 && h > 0) {
        try {
          if (typeof cel.resize === "function") {
            // In fullscreen stereographic projection (aspect ratio ~2:1), constrain width if viewport height is the limiting dimension.
            const optimalWidth = fullscreen ? Math.min(w, Math.floor(h * 2)) : 0;
            cel.resize(optimalWidth);
          }
          cel.redraw();
        } catch (err) {
          console.warn("Celestial resize error:", err);
        }
      }
    };

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 50);
    });

    ro.observe(el);
    const initialTimer = setTimeout(handleResize, 100);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(initialTimer);
      ro.disconnect();
    };
  }, [ready, fullscreen]);

  // Init (once) or smoothly rotate to the new center (subsequent constellation switches).
  useEffect(() => {
    if (!ready || centerRaHours == null || centerDecDeg == null) return;
    const Celestial = window.Celestial;
    const d3 = window.d3;
    if (!Celestial || !d3) return;

    const centerRaDeg = centerRaHours * 15;

    if (!initializedRef.current) {
      // Prevent d3-celestial bug on line 94 where previous container causes invalid selector '#ac-map-container*'
      Celestial.container = null;
      if (typeof Celestial.clear === "function") {
        Celestial.clear();
      }
      try {
        Celestial.display(buildCelestialConfig(centerRaDeg, centerDecDeg));
      } catch (err) {
        console.warn("Celestial.display caught error:", err);
      }
      initializedRef.current = true;

      // Custom "raw" layer: draw custom target markers directly onto Celestial's 2D canvas context.
      Celestial.add({
        type: "raw",
        callback: () => {},
        redraw: () => {
          const proj = Celestial.mapProjection;
          if (!proj || typeof proj !== "function") return;
          const ctx = Celestial.context;
          if (!ctx) return;

          const targets = targetsRef.current || [];
          targets.forEach((d: MapTarget) => {
            if (d.ra_hours == null || d.dec_degrees == null) return;
            const pt = proj([d.ra_hours * 15, d.dec_degrees]);
            if (!pt || isNaN(pt[0]) || isNaN(pt[1])) return;

            const r = Math.max(3.5, 7.5 - (d.magnitude || 5) / 2);
            ctx.save();
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
            ctx.fillStyle = targetMarkerColor(d.type || "");
            ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.stroke();

            // Label for bright DSO targets (e.g. M31, M42)
            if (d.name && (d.magnitude == null || d.magnitude < 6.5)) {
              ctx.font = "10px Space Grotesk, sans-serif";
              ctx.fillStyle = "#e2e8f0";
              ctx.shadowBlur = 4;
              ctx.fillText(d.name, pt[0] + r + 3, pt[1] + 3);
            }
            ctx.restore();
          });
        },
      });
    } else {
      const proj = Celestial.mapProjection;
      if (!proj || typeof proj.rotate !== "function") return;
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

    return () => {
      initializedRef.current = false;
      const cel = window.Celestial;
      if (cel) {
        cel.container = null;
        if (typeof cel.clear === "function") {
          cel.clear();
        }
      }
    };
  }, [ready, centerRaHours, centerDecDeg]);

  // Click & drag handling on sky canvas
  useEffect(() => {
    if (!ready) return;
    const Celestial = window.Celestial;
    const canvas = document.querySelector(`#${CELESTIAL_MAP_CONTAINER_ID} canvas`) as HTMLCanvasElement | null;
    if (!Celestial || !canvas) return;

    let startX = 0;
    let startY = 0;
    let hasDragged = false;

    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      hasDragged = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) {
        hasDragged = true;
      }
    };

    const handleClick = async (event: MouseEvent) => {
      if (hasDragged) return; // Ignore drag releases

      const proj = Celestial.mapProjection;
      if (!proj || typeof proj !== "function") return;
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // 1. Check if clicked on a target marker
      const targets = targetsRef.current || [];
      for (const t of targets) {
        if (t.ra_hours == null || t.dec_degrees == null) continue;
        const pt = proj([t.ra_hours * 15, t.dec_degrees]);
        if (!pt || isNaN(pt[0]) || isNaN(pt[1])) continue;
        const r = Math.max(8, 12 - (t.magnitude || 5) / 2);
        if (Math.hypot(clickX - pt[0], clickY - pt[1]) <= r) {
          setSkyClick(null);
          setSelectedTarget(t);
          return;
        }
      }

      // 2. Clicked empty sky → SIMBAD query
      if (typeof proj.invert !== "function") return;
      const coords = proj.invert([clickX, clickY]);
      if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

      let ra = coords[0];
      if (ra < 0) ra += 360;
      const dec = coords[1];

      setSelectedTarget(null);
      setSkyClick({ loading: true, data: null, error: false });

      try {
        const res = await fetch(`${API_BASE}/star?ra=${ra.toFixed(4)}&dec=${dec.toFixed(4)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSkyClick({ loading: false, data, error: false });
      } catch {
        setSkyClick({ loading: false, data: null, error: true });
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [ready, centerRaHours, centerDecDeg]);

  const [interactive, setInteractive] = useState(false);
  const isInteractive = fullscreen || interactive;

  return (
    <div ref={containerRef} className={`relative w-full ${fullscreen ? "flex-1 h-full min-h-0 flex flex-col" : ""}`}>
      <div
        id={CELESTIAL_MAP_CONTAINER_ID}
        className={`relative overflow-hidden rounded-xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center ${
          isInteractive ? "pointer-events-auto touch-none" : "pointer-events-none select-none"
        } ${fullscreen ? "flex-1 w-full h-full min-h-0 !h-full" : "h-[340px] sm:h-[380px] lg:h-[400px] max-h-[46vh] w-full"}`}
      >
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Loading sky map...
          </div>
        )}
      </div>

      {!isInteractive && ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[2px] rounded-xl">
          <button
            onClick={() => setInteractive(true)}
            className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-slate-900/90 px-6 py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-105 hover:border-sky-300 transition-all pointer-events-auto cursor-pointer"
          >
            <span>✨ Click to interact</span>
          </button>
        </div>
      )}

      {interactive && !fullscreen && (
        <button
          onClick={() => setInteractive(false)}
          className="absolute top-3 right-3 z-20 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-cyan-500/40 hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
        >
          🔒 Lock Map (Allow Page Scroll)
        </button>
      )}

      {(selectedTarget || skyClick) && (
        <div className={`rounded-lg border border-purple-500/30 bg-slate-950/90 backdrop-blur-md p-3 text-sm shadow-2xl z-30 pointer-events-auto ${
          fullscreen ? "absolute bottom-4 left-4 max-w-sm" : "mt-3"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {selectedTarget && (
                <>
                  <p className="font-semibold text-zinc-100 truncate">{selectedTarget.name}</p>
                  <p className="text-xs text-zinc-400">
                    {selectedTarget.type || "Object"} · Mag {selectedTarget.magnitude ?? "?"}
                  </p>
                  {selectedTarget.description && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{selectedTarget.description}</p>
                  )}
                </>
              )}
              {skyClick?.loading && <p className="text-xs text-purple-400">{t("simbad_scanning")}</p>}
              {skyClick?.error && <p className="text-xs text-zinc-400">No catalog star within 2&apos; at this position</p>}
              {skyClick?.data && (
                <>
                  <p className="font-semibold text-zinc-100">{skyClick.data.name.replace("* ", "")}</p>
                  <div className="mt-1 flex justify-between text-xs gap-3">
                    <span className="text-zinc-400">{t("simbad_spectral")}</span>
                    <span className="font-mono text-green-400">{skyClick.data.spectral_type ?? t("simbad_unknown")}</span>
                  </div>
                  <div className="flex justify-between text-xs gap-3">
                    <span className="text-zinc-400">{t("simbad_dist")}</span>
                    <span className="font-mono text-sky-400">{skyClick.data.distance_ly ?? t("simbad_unknown")}</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => { setSelectedTarget(null); setSkyClick(null); }}
              className="text-zinc-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
