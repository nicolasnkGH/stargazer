"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useAladinReady } from "@/hooks/useAladinReady";
import { ALADIN_CONTAINER_ID } from "@/lib/constants";
import type { AladinInstance } from "@/types";

interface FovModalProps {
  open: boolean;
  onClose: () => void;
  raDeg: number;
  decDeg: number;
  targetName: string;
}

export default function FovModal({ open, onClose, raDeg, decDeg, targetName }: FovModalProps) {
  const ready = useAladinReady(open);
  const [aladin, setAladin] = useState<AladinInstance | null>(null);

  // Init Aladin once the CDN script is ready, or re-center it on a new target.
  useEffect(() => {
    if (!open || !ready) return;
    const A = window.A;
    if (!A) return;

    const initAladin = () => {
      try {
        if (!aladin) {
          const inst = A.aladin(`#${ALADIN_CONTAINER_ID}`, {
            survey: "P/DSS2/color",
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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Icon name="scan" className="h-5 w-5 text-purple-400" />
          Interactive Sky Simulator: {targetName}
        </h2>

        <div
          id={ALADIN_CONTAINER_ID}
          className="h-[400px] w-full rounded-lg border border-white/10 bg-[#020617] relative overflow-hidden"
        >
          {(!ready || !aladin || (typeof window !== "undefined" && !("A" in window))) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                <defs>
                  <radialGradient id="nebulaGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#818cf8" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="galaxyGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                    <stop offset="60%" stopColor="#818cf8" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Stars Background */}
                <circle cx="25%" cy="30%" r="1.5" fill="#fff" opacity="0.6" />
                <circle cx="70%" cy="20%" r="1" fill="#fff" opacity="0.4" />
                <circle cx="85%" cy="65%" r="2" fill="#fff" opacity="0.8" />
                <circle cx="15%" cy="75%" r="1" fill="#fff" opacity="0.5" />
                <circle cx="45%" cy="85%" r="1.5" fill="#fff" opacity="0.7" />
                <circle cx="60%" cy="40%" r="2" fill="#38bdf8" opacity="0.9" />
                <circle cx="35%" cy="15%" r="1" fill="#f43f5e" opacity="0.6" />
                <circle cx="80%" cy="80%" r="1.2" fill="#fff" opacity="0.5" />

                {/* Target Illustration (assuming standard fov of 1.5 degrees) */}
                <g transform="translate(300, 200)">
                  {targetName.toLowerCase().includes("galaxy") || targetName.toLowerCase().includes("triplet") ? (
                    <>
                      <ellipse rx={70 * (0.8 / 1.5)} ry={24 * (0.8 / 1.5)} fill="url(#galaxyGlow)" transform="rotate(-30)" />
                      <circle r={8 * (0.8 / 1.5)} fill="#e0f2fe" opacity="0.9" />
                    </>
                  ) : targetName.toLowerCase().includes("nebula") || targetName.toLowerCase().includes("gas") ? (
                    <>
                      <circle r={85 * (0.8 / 1.5)} fill="url(#nebulaGlow)" />
                      <circle r={6 * (0.8 / 1.5)} fill="#fae8ff" opacity="0.8" />
                    </>
                  ) : targetName.toLowerCase().includes("cluster") ? (
                    <g opacity="0.85">
                      <circle cx="0" cy="0" r="3" fill="#38bdf8" />
                      <circle cx="-12" cy="8" r="2" fill="#e0f2fe" />
                      <circle cx="15" cy="-6" r="2.5" fill="#38bdf8" />
                      <circle cx="-8" cy="-14" r="2" fill="#fff" />
                      <circle cx="10" cy="12" r="1.5" fill="#e0f2fe" />
                      <circle cx="22" cy="4" r="2" fill="#38bdf8" />
                      <circle cx="-20" cy="-4" r="2.5" fill="#fff" />
                      <circle cx="5" cy="-18" r="1.5" fill="#38bdf8" />
                    </g>
                  ) : (
                    <>
                      <circle r={18} fill="#f59e0b" opacity="0.25" />
                      <circle r={4} fill="#fff" />
                    </>
                  )}
                </g>

                {/* Reticle Overlay */}
                <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                <circle cx="50%" cy="50%" r="90" fill="none" stroke="rgba(255,255,255,0.06)" />
                <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="rgba(255,255,255,0.04)" />
                <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="rgba(255,255,255,0.04)" />

                {/* Eyepiece FOV Indicator Frame */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={Math.min(180, Math.max(10, 1.5 * 100))}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
              </svg>

              <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-lg text-[0.7rem] text-zinc-400 font-mono flex flex-col gap-0.5 pointer-events-auto">
                <span className="text-sky-300 font-bold">Simulator Loading...</span>
                <span>Coordinates: {raDeg.toFixed(2)}° RA / {decDeg.toFixed(2)}° Dec</span>
                <span>FOV: 1.50°</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
        >
          Close Simulator
        </button>
      </div>
    </div>
  );
}
