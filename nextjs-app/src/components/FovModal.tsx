"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale, useMessages } from "next-intl";
import Icon from "./Icon";
import { useAladinReady } from "@/hooks/useAladinReady";
import { ALADIN_CONTAINER_ID } from "@/lib/constants";
import type { AladinInstance } from "@/types";
import EyepieceSimulation from "./EyepieceSimulation";

interface FovModalProps {
  open: boolean;
  onClose: () => void;
  raDeg: number;
  decDeg: number;
  targetName: string;
}

export default function FovModal({ open, onClose, raDeg, decDeg, targetName }: FovModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const ready = useAladinReady(open);
  const [aladin, setAladin] = useState<AladinInstance | null>(null);
  const [eyepieceMode, setEyepieceMode] = useState(true);
  const [seeingSim, setSeeingSim] = useState(true);
  const [magnification, setMagnification] = useState(150);
  const [eyepieceFov, setEyepieceFov] = useState<52 | 68 | 82>(68);

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

        if (!aladin) {
          const inst = A.aladin(`#${ALADIN_CONTAINER_ID}`, {
            survey: "https://alasky.cds.unistra.fr/DSS/DSSColor",
            fov: 1.5,
            target: `${raDeg} ${decDeg}`,
            showReticle: false,
            showZoomControl: true,
            showFullscreenControl: false,
            showLayersControl: false,
          });
          setAladin(inst);
        } else {
          aladin.gotoRaDec(raDeg, decDeg);
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
  }, [open, ready, raDeg, decDeg, aladin]);

  function handleClose() {
    // Aladin throws resize errors if its container goes display:none while alive — tear it down.
    const div = document.getElementById(ALADIN_CONTAINER_ID);
    if (div) div.innerHTML = "";
    setAladin(null);
    onClose();
  }

  if (!open) return null;

  const isPlanet = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "sun", "moon"].includes(targetName.toLowerCase());

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-[720px] max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#070a12] p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        {/* Header with Title & Mode Switcher */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <Icon name="scan" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t("fov_simulator_title", { targetName })}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                RA: {(raDeg / 15).toFixed(2)}h ({raDeg.toFixed(2)}°) · Dec: {decDeg.toFixed(2)}°
              </p>
            </div>
          </div>

          {/* Mode Switcher: Telescope Eyepiece vs Wide Sky Survey */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-white/15 p-1 rounded-2xl text-xs">
            <button
              type="button"
              onClick={() => setEyepieceMode(true)}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                eyepieceMode
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🔭</span> {locale === "pt" ? "Simulador de Ocular" : locale === "es" ? "Simulador de Ocular" : "Telescope Eyepiece"}
            </button>
            <button
              type="button"
              onClick={() => setEyepieceMode(false)}
              className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                !eyepieceMode
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🌌</span> {locale === "pt" ? "Carta Celeste" : locale === "es" ? "Carta Celeste" : "Wide Sky Survey"}
            </button>
          </div>
        </div>

        {/* Viewport Container */}
        <div className="relative w-full rounded-2xl border border-white/15 bg-[#02040a] overflow-hidden shadow-2xl">
          {/* Eyepiece Mode: Stelvision-Style Realistic Optical Eyepiece View */}
          {eyepieceMode && (
            <div className="relative w-full h-[450px] bg-[#02040a] flex flex-col items-center justify-center p-4 select-none">
              {/* Outer Metallic / Rubber Eyepiece Barrel Housing (Stelvision Style) */}
              <div className="relative w-[360px] h-[360px] sm:w-[380px] sm:h-[380px] rounded-full border-[14px] border-zinc-800 bg-black shadow-[inset_0_0_60px_#000,0_0_40px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
                {/* Eyepiece Engraved Specifications */}
                <div className="absolute top-2 text-[0.6rem] font-mono font-bold text-amber-500/70 tracking-widest uppercase pointer-events-none z-30">
                  STELVISION OPTICS • {eyepieceFov}° APPARENT FOV
                </div>

                {/* 3D WebGL Live Optical Eyepiece Simulation */}
                <div className="absolute inset-0 bg-black rounded-full overflow-hidden flex items-center justify-center">
                  <EyepieceSimulation
                    targetName={targetName}
                    magnification={magnification}
                    seeingSim={seeingSim}
                    eyepieceFov={eyepieceFov}
                  />
                </div>

                {/* Bezel Aperture Ring Shadow */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_35px_rgba(0,0,0,0.95)] pointer-events-none z-20" />
              </div>

              {/* Eyepiece Telemetry & Magnification Controls (Stelvision Style) */}
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
                  <span className="text-zinc-400 font-mono">Apparent FOV:</span>
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
                  {seeingSim ? "✨ Seeing: Active (Shimmer)" : "✨ Seeing: Off"}
                </button>
              </div>
            </div>
          )}

          {/* Wide Sky Survey Mode (Aladin Container - Always present in DOM) */}
          <div
            id={ALADIN_CONTAINER_ID}
            className={`w-full h-[420px] relative overflow-hidden ${eyepieceMode ? "hidden" : "block"}`}
          >
            {/* Reticle Overlay for Wide Sky Survey */}
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <div className="absolute w-full h-[1px] bg-cyan-400/30" />
              <div className="absolute h-full w-[1px] bg-cyan-400/30" />
              <div className="w-16 h-16 rounded-full border border-dashed border-cyan-400/60 animate-spin-slow" />
            </div>
          </div>
          {!eyepieceMode && (!ready || !aladin || (typeof window !== "undefined" && !("A" in window))) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950">
              <div className="text-cyan-300 font-bold text-xs mb-1 font-mono">{t("fov_simulator_loading")}</div>
              <div className="text-zinc-400 text-[0.7rem] font-mono">{t("fov_coordinates", { ra: raDeg.toFixed(2), dec: decDeg.toFixed(2) })}</div>
            </div>
          )}
        </div>

        {/* Planet Position Guidance Explanation */}
        {isPlanet && (
          <div className="mt-3 p-3 rounded-xl bg-sky-950/70 border border-sky-500/30 text-xs text-sky-200 flex items-start gap-2.5 shadow-md">
            <span className="text-lg leading-none">🪐</span>
            <div className="flex-1 text-[0.75rem] leading-relaxed">
              <span className="font-bold text-sky-300 block mb-0.5">
                {locale === "pt"
                  ? "Posição Dinâmica do Sistema Solar"
                  : locale === "es"
                  ? "Posición Dinámica del Sistema Solar"
                  : "Dynamic Solar System Position"}
              </span>
              {locale === "pt"
                ? `Diferente das estrelas fixas, os planetas se movem constantemente pelo céu. O retículo iluminado marca a localização exata de ${targetName} esta noite no campo estelar. Use a Visão de Telescópio no card para ver a ampliação de alta potência!`
                : locale === "es"
                ? `A diferencia de las estrellas fijas, los planetas se mueven constantemente por el cielo. El retículo iluminado marca la ubicación exacta de ${targetName} esta noche en el campo estelar. ¡Use la Vista de Telescopio en la tarjeta para ver la vista de alta potencia!`
                : `Unlike fixed stars, planets constantly move through the sky. The illuminated target reticle marks the live topocentric location of ${targetName} tonight against the background star field. Use Scope View on the card to see the high-magnification eyepiece preview!`}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {getTxt("close_simulator", locale === "pt" ? "Fechar Simulador" : locale === "es" ? "Cerrar Simulador" : "Close Simulator")}
        </button>
      </div>
    </div>
  );
}


