"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale, useMessages } from "next-intl";
import Icon from "./Icon";
import { useAladinReady } from "@/hooks/useAladinReady";
import { ALADIN_CONTAINER_ID } from "@/lib/constants";
import type { AladinInstance } from "@/types";
import EyepieceSimulation from "./EyepieceSimulation";
import AstroFramingBadge from "./AstroFramingBadge";
import TargetThumbnailStrip from "./TargetThumbnailStrip";
import TargetImagingRecipe from "./TargetImagingRecipe";

interface FovModalProps {
  open: boolean;
  onClose: () => void;
  raDeg: number;
  decDeg: number;
  targetName: string;
  targetType?: string;
  targetId?: string;
  targetSize?: string;
  targetAltitudeDeg?: number;
  targetAzimuthDeg?: number;
}

const FRAMING_PRESETS = [
  {
    id: "dwarf3",
    name: "DWARF 3 Telephoto",
    fovW: 3.3,
    fovH: 1.86,
    shape: "rect" as const,
    color: "#38bdf8",
    badge: "3.3° × 1.86°",
  },
  {
    id: "dwarf3_mosaic",
    name: "DWARF 3 2×2 Mosaic",
    fovW: 6.0,
    fovH: 3.5,
    shape: "rect" as const,
    color: "#a855f7",
    badge: "~6.0° × 3.5°",
  },
  {
    id: "sct_1250",
    name: "5\" SCT 1250mm",
    fovW: 0.8,
    fovH: 0.8,
    shape: "circle" as const,
    color: "#f59e0b",
    badge: "0.8° Circular FOV",
  },
  {
    id: "seestar",
    name: "Seestar S50",
    fovW: 1.29,
    fovH: 0.73,
    shape: "rect" as const,
    color: "#10b981",
    badge: "1.29° × 0.73°",
  },
  {
    id: "reticle",
    name: "Crosshair Only",
    fovW: 2.0,
    fovH: 2.0,
    shape: "none" as const,
    color: "#94a3b8",
    badge: "Full Sky",
  },
] as const;

export default function FovModal({
  open,
  onClose,
  raDeg,
  decDeg,
  targetName,
  targetType = "",
  targetId = "",
  targetSize,
  targetAltitudeDeg = 55,
  targetAzimuthDeg = 180,
}: FovModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const ready = useAladinReady(open);
  const [aladin, setAladin] = useState<AladinInstance | null>(null);
  const [eyepieceMode, setEyepieceMode] = useState(false); // Default to Sky Survey / Framing mode
  const [seeingSim, setSeeingSim] = useState(true);
  const [magnification, setMagnification] = useState(150);
  const [eyepieceFov, setEyepieceFov] = useState<52 | 68 | 82>(68);

  // Active Astrophotography Sensor Framing Overlay
  const [selectedSensorId, setSelectedSensorId] = useState<string>("dwarf3");

  const activePreset = useMemo(
    () => FRAMING_PRESETS.find((p) => p.id === selectedSensorId) || FRAMING_PRESETS[0],
    [selectedSensorId]
  );

  const getTxt = (key: string, fallback: string) => messages[key] || fallback;

  // Init Aladin once the CDN script is ready, or re-center it on a new target.
  useEffect(() => {
    if (!open || !ready) return;
    const A = window.A;
    if (!A) return;

    const initAladin = () => {
      try {
        const container = document.getElementById(ALADIN_CONTAINER_ID);
        if (!container) return;

        const initialFov = Math.max(activePreset.fovW, activePreset.fovH) * 1.4;

        if (!aladin) {
          const inst = A.aladin(`#${ALADIN_CONTAINER_ID}`, {
            survey: "https://alasky.cds.unistra.fr/DSS/DSSColor",
            fov: initialFov,
            target: `${raDeg} ${decDeg}`,
            showReticle: false,
            showZoomControl: true,
            showFullscreenControl: false,
            showLayersControl: false,
          });
          setAladin(inst);
        } else {
          aladin.gotoRaDec(raDeg, decDeg);
          if (typeof aladin.setFoV === "function") {
            aladin.setFoV(initialFov);
          }
        }
      } catch (err) {
        console.error("Failed to initialize Aladin:", err);
      }
    };

    if (A.init && typeof A.init.then === "function") {
      A.init.then(initAladin);
    } else {
      initAladin();
    }
  }, [open, ready, raDeg, decDeg, aladin, activePreset]);

  // Adjust Aladin FOV when sensor framing preset changes
  useEffect(() => {
    if (!aladin || eyepieceMode) return;
    try {
      const targetFov = Math.max(activePreset.fovW, activePreset.fovH) * 1.4;
      if (typeof aladin.setFoV === "function") {
        aladin.setFoV(targetFov);
      }
    } catch (err) {
      console.warn("Could not set Aladin FOV:", err);
    }
  }, [aladin, activePreset, eyepieceMode]);

  function handleClose() {
    const div = document.getElementById(ALADIN_CONTAINER_ID);
    if (div) div.innerHTML = "";
    setAladin(null);
    onClose();
  }

  if (!open) return null;

  const isPlanet = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "sun", "moon"].includes(
    targetName.toLowerCase()
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-[840px] max-h-[94vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#070a12] p-4 sm:p-6 shadow-[0_0_70px_rgba(0,0,0,0.95)] space-y-4">
        {/* Header with Title & Mode Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <Icon name="scan" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <span>{targetName}</span>
                <span className="text-xs text-purple-400 font-mono font-normal">
                  ({(raDeg / 15).toFixed(2)}h, {decDeg.toFixed(2)}°)
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {targetType || "Deep-Sky Target"} • Astrophotography Framing &amp; Optical Simulator
              </p>
            </div>
          </div>

          {/* Mode Switcher: Telescope Eyepiece vs Wide Sky Survey */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-white/15 p-1 rounded-2xl text-xs">
            <button
              type="button"
              onClick={() => setEyepieceMode(false)}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                !eyepieceMode
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>📷</span> <span>Sensor Framing &amp; Sky</span>
            </button>
            <button
              type="button"
              onClick={() => setEyepieceMode(true)}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                eyepieceMode
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🔭</span> <span>Eyepiece Optics</span>
            </button>
          </div>
        </div>

        {/* "Will It Fit?" Equipment Match Banner */}
        <AstroFramingBadge size={targetSize} />

        {/* Sensor Framing Controls (Sky Survey Mode) */}
        {!eyepieceMode && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[0.7rem] font-bold text-cyan-300 font-mono whitespace-nowrap">
              🔭 Framing Sensor:
            </span>
            {FRAMING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedSensorId(preset.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSensorId === preset.id
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
                }`}
              >
                <span>{preset.name}</span>
                <span className="text-[0.62rem] opacity-75 font-mono">({preset.badge})</span>
              </button>
            ))}
          </div>
        )}

        {/* Viewport Container */}
        <div className="relative w-full rounded-2xl border border-white/15 bg-[#02040a] overflow-hidden shadow-2xl">
          {/* Eyepiece Mode: 3D Three.js Optical Simulation */}
          {eyepieceMode && (
            <div className="relative w-full h-[450px] bg-[#02040a] flex flex-col items-center justify-center p-4 select-none">
              <div className="relative w-[360px] h-[360px] sm:w-[380px] sm:h-[380px] rounded-full border-[14px] border-zinc-800 bg-black shadow-[inset_0_0_60px_#000,0_0_40px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
                <div className="absolute top-3.5 sm:top-4 px-2.5 py-0.5 rounded-full bg-zinc-950/85 border border-amber-500/30 text-[0.52rem] sm:text-[0.58rem] font-mono font-semibold text-amber-400/80 tracking-wider uppercase pointer-events-none z-30 shadow-sm flex items-center gap-1.5">
                  <span>STELVISION OPTICS</span>
                  <span className="text-amber-500/40">•</span>
                  <span>{eyepieceFov}° AFOV</span>
                </div>

                <div className="absolute inset-0 bg-black rounded-full overflow-hidden flex items-center justify-center">
                  <EyepieceSimulation
                    targetName={targetName}
                    targetType={targetType}
                    magnification={magnification}
                    seeingSim={seeingSim}
                    eyepieceFov={eyepieceFov}
                  />
                </div>

                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_35px_rgba(0,0,0,0.95)] pointer-events-none z-20" />
              </div>

              {/* Eyepiece Controls */}
              <div className="mt-4 flex items-center gap-4 flex-wrap justify-center bg-slate-950/90 border border-white/10 px-4 py-2 rounded-2xl text-xs backdrop-blur-md z-30">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">Magnification:</span>
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
                    {[50, 120, 150, 220, 300].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMagnification(m)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[0.7rem] font-bold transition-all cursor-pointer ${
                          magnification === m
                            ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">AFOV:</span>
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
                    {([52, 68, 82] as const).map((fovVal) => (
                      <button
                        key={fovVal}
                        type="button"
                        onClick={() => setEyepieceFov(fovVal)}
                        className={`px-2 py-1 rounded-lg font-mono text-[0.7rem] font-bold transition-all cursor-pointer ${
                          eyepieceFov === fovVal
                            ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {fovVal}°
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSeeingSim(!seeingSim)}
                  className={`px-3 py-1 rounded-xl font-mono text-[0.7rem] font-bold border transition-colors cursor-pointer ${
                    seeingSim
                      ? "bg-cyan-950 border-cyan-400/40 text-cyan-300"
                      : "bg-white/5 border-white/10 text-zinc-400"
                  }`}
                >
                  {seeingSim ? "✨ Seeing: Active" : "✨ Seeing: Off"}
                </button>
              </div>
            </div>
          )}

          {/* Wide Sky Survey Mode with Interactive Aladin Lite v3 */}
          <div
            id={ALADIN_CONTAINER_ID}
            className={`w-full h-[440px] relative overflow-hidden ${eyepieceMode ? "hidden" : "block"}`}
          >
            {/* Interactive Sensor Framing Box Overlay */}
            {activePreset.shape === "rect" && (
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                <div
                  className="relative rounded border-2 border-dashed shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all duration-300 flex items-start justify-between p-2"
                  style={{
                    borderColor: activePreset.color,
                    width: `${Math.min(85, Math.max(45, (activePreset.fovW / (activePreset.fovW * 1.4)) * 70))}%`,
                    height: `${Math.min(85, Math.max(35, (activePreset.fovH / (activePreset.fovW * 1.4)) * 70))}%`,
                  }}
                >
                  {/* Corner indicator badge */}
                  <span
                    className="rounded bg-black/85 px-2 py-0.5 text-[0.62rem] font-bold font-mono tracking-tight shadow-md border"
                    style={{ color: activePreset.color, borderColor: `${activePreset.color}60` }}
                  >
                    🔭 {activePreset.name} ({activePreset.badge})
                  </span>

                  {/* Corner Ticks */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: activePreset.color }} />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: activePreset.color }} />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: activePreset.color }} />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: activePreset.color }} />
                </div>
              </div>
            )}

            {/* Circular Sensor Framing Overlay (e.g. 5" SCT 1250mm) */}
            {activePreset.shape === "circle" && (
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                <div
                  className="relative rounded-full border-2 border-dashed shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-300 flex items-center justify-center"
                  style={{
                    borderColor: activePreset.color,
                    width: "280px",
                    height: "280px",
                  }}
                >
                  <span
                    className="rounded-full bg-black/85 px-2.5 py-0.5 text-[0.62rem] font-bold font-mono tracking-tight shadow-md border"
                    style={{ color: activePreset.color, borderColor: `${activePreset.color}60` }}
                  >
                    🔭 {activePreset.name} ({activePreset.badge})
                  </span>
                </div>
              </div>
            )}

            {/* Crosshair Center Reticle */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="absolute w-8 h-[1px] bg-cyan-400/50" />
              <div className="absolute h-8 w-[1px] bg-cyan-400/50" />
              <div className="w-6 h-6 rounded-full border border-cyan-400/40" />
            </div>
          </div>

          {!eyepieceMode && (!ready || !aladin || (typeof window !== "undefined" && !("A" in window))) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950">
              <div className="text-cyan-300 font-bold text-xs mb-1 font-mono">{t("fov_simulator_loading")}</div>
              <div className="text-zinc-400 text-[0.7rem] font-mono">
                RA: {raDeg.toFixed(2)}° · Dec: {decDeg.toFixed(2)}°
              </div>
            </div>
          )}
        </div>

        {/* Planet Guidance Note */}
        {isPlanet && (
          <div className="p-3 rounded-xl bg-sky-950/70 border border-sky-500/30 text-xs text-sky-200 flex items-start gap-2.5 shadow-md">
            <span className="text-lg leading-none">🪐</span>
            <div className="flex-1 text-[0.75rem] leading-relaxed">
              <span className="font-bold text-sky-300 block mb-0.5">
                Dynamic Solar System Position
              </span>
              The illuminated reticle marks the live topocentric location of {targetName} tonight against the background star field. Use Eyepiece Optics to see the high-magnification simulation!
            </div>
          </div>
        )}

        {/* Contextual Astrophotography Carousel (Phase 2 Requirement) */}
        {targetId && (
          <TargetThumbnailStrip targetId={targetId} targetName={targetName} />
        )}

        {/* Tonight's Imaging Window, Altitude Sparkline & Capture Recipe (Phase 3 Requirement) */}
        <TargetImagingRecipe
          targetName={targetName}
          targetType={targetType}
          raDeg={raDeg}
          decDeg={decDeg}
          altitudeDeg={targetAltitudeDeg}
          azimuthDeg={targetAzimuthDeg}
        />

        <button
          onClick={handleClose}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {getTxt("close_simulator", locale === "pt" ? "Fechar Simulador" : locale === "es" ? "Cerrar Simulador" : "Close Simulator")}
        </button>
      </div>
    </div>
  );
}
