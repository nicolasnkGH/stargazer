"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useAladinReady } from "@/hooks/useAladinReady";
import {
  ALADIN_CONTAINER_ID,
  FOV_PRESETS,
  FOV_CUSTOM_VISUAL_DEFAULTS,
  FOV_CUSTOM_SENSOR_DEFAULTS,
  computeFovFrame,
  type FovPreset,
} from "@/lib/constants";
import type { AladinInstance, AladinOverlay } from "@/types";

interface FovModalProps {
  open: boolean;
  onClose: () => void;
  raDeg: number;
  decDeg: number;
  targetName: string;
}

export default function FovModal({ open, onClose, raDeg, decDeg, targetName }: FovModalProps) {
  const ready = useAladinReady(open);
  const aladinRef = useRef<AladinInstance | null>(null);
  const overlayRef = useRef<AladinOverlay | null>(null);

  const [preset, setPreset] = useState<FovPreset>("visual_25");
  const [scopeFl, setScopeFl] = useState(FOV_CUSTOM_VISUAL_DEFAULTS.scopeFl);
  const [epFl, setEpFl] = useState(FOV_CUSTOM_VISUAL_DEFAULTS.epFl);
  const [epAfov, setEpAfov] = useState(FOV_CUSTOM_VISUAL_DEFAULTS.epAfov);
  const [camScopeFl, setCamScopeFl] = useState(FOV_CUSTOM_SENSOR_DEFAULTS.scopeFl);
  const [sensorW, setSensorW] = useState(FOV_CUSTOM_SENSOR_DEFAULTS.sensorW);
  const [sensorH, setSensorH] = useState(FOV_CUSTOM_SENSOR_DEFAULTS.sensorH);

  // Init Aladin once the CDN script is ready, or re-center it on a new target.
  useEffect(() => {
    if (!open || !ready) return;
    const A = window.A;
    if (!A) return;

    if (!aladinRef.current) {
      aladinRef.current = A.aladin(`#${ALADIN_CONTAINER_ID}`, {
        survey: "P/DSS2/color",
        fov: 1.5,
        target: `${raDeg} ${decDeg}`,
        showReticle: false,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: false,
      });
    } else {
      aladinRef.current.gotoRaDec(raDeg, decDeg);
    }
  }, [open, ready, raDeg, decDeg]);

  // Draw/update the FOV frame overlay whenever the equipment or target changes.
  useEffect(() => {
    if (!open || !ready) return;
    const A = window.A;
    const aladin = aladinRef.current;
    if (!A || !aladin) return;

    const frame = computeFovFrame(preset, { scopeFl, epFl, epAfov, camScopeFl, sensorW, sensorH });
    aladin.setFoV(frame.fovDegrees * 1.6);

    if (overlayRef.current) {
      aladin.removeCatalog(overlayRef.current);
    }
    const overlay = A.graphicOverlay({ color: "#ef4444", lineWidth: 2 });
    overlayRef.current = overlay;
    aladin.addCatalog(overlay);

    if (frame.isRectangular) {
      const cosDec = Math.cos((decDeg * Math.PI) / 180);
      const dW = frame.rectWidthDeg / 2 / (cosDec || 1);
      const dH = frame.rectHeightDeg / 2;
      overlay.add(
        A.polygon([
          [raDeg - dW, decDeg - dH],
          [raDeg + dW, decDeg - dH],
          [raDeg + dW, decDeg + dH],
          [raDeg - dW, decDeg + dH],
        ])
      );
    } else {
      overlay.add(A.circle(raDeg, decDeg, frame.fovDegrees / 2));
    }
  }, [open, ready, preset, scopeFl, epFl, epAfov, camScopeFl, sensorW, sensorH, raDeg, decDeg]);

  function handleClose() {
    // Aladin throws resize errors if its container goes display:none while alive — tear it down.
    const div = document.getElementById(ALADIN_CONTAINER_ID);
    if (div) div.innerHTML = "";
    aladinRef.current = null;
    overlayRef.current = null;
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
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
          <Icon name="scan" className="h-5 w-5 text-purple-400" />
          FOV Simulator: {targetName}
        </h2>

        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="min-w-20 text-xs text-zinc-400">Equipment:</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as FovPreset)}
              className="min-w-[200px] flex-1 rounded-md border border-white/15 bg-slate-800 px-2.5 py-1.5 text-sm text-white outline-none"
            >
              {FOV_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {preset === "custom_visual" && (
            <div className="flex flex-wrap gap-4 border-t border-white/5 pt-2.5">
              <NumberField label="Scope Focal Length (mm)" value={scopeFl} onChange={setScopeFl} />
              <NumberField label="Eyepiece Focal Length (mm)" value={epFl} onChange={setEpFl} />
              <NumberField label="Eyepiece AFOV (degrees)" value={epAfov} onChange={setEpAfov} />
            </div>
          )}

          {preset === "custom_sensor" && (
            <div className="flex flex-wrap gap-4 border-t border-white/5 pt-2.5">
              <NumberField label="Scope Focal Length (mm)" value={camScopeFl} onChange={setCamScopeFl} />
              <NumberField label="Sensor Width (mm)" value={sensorW} onChange={setSensorW} step="0.1" />
              <NumberField label="Sensor Height (mm)" value={sensorH} onChange={setSensorH} step="0.1" />
            </div>
          )}
        </div>

        <div
          id={ALADIN_CONTAINER_ID}
          className="h-[400px] w-full rounded-lg border border-white/10 bg-black"
        >
          {!ready && (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Loading sky viewer...
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

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="flex min-w-[100px] flex-1 flex-col gap-1">
      <label className="text-[0.7rem] text-zinc-500">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="rounded border border-white/15 bg-slate-800 px-2 py-1 text-sm text-white outline-none"
      />
    </div>
  );
}
