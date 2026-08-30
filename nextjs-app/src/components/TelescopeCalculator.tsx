"use client";

import { useState } from "react";
import Icon from "./Icon";
import { OPTICS_TARGET_TYPES, OPTICS_RECOMMENDATIONS } from "@/lib/constants/telescope";

export default function TelescopeCalculator() {
  const [focalLength, setFocalLength] = useState<number>(650);
  const [aperture, setAperture] = useState<number>(130);
  const [eyepieceFocalLength, setEyepieceFocalLength] = useState<number>(25);
  const [eyepieceAfov, setEyepieceAfov] = useState<number>(52);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>("planets");

  const magnification = focalLength > 0 && eyepieceFocalLength > 0 ? Math.round(focalLength / eyepieceFocalLength) : 0;
  const exitPupil = aperture > 0 && magnification > 0 ? (aperture / magnification).toFixed(1) : "0.0";
  const trueFov = magnification > 0 && eyepieceAfov > 0 ? (eyepieceAfov / magnification).toFixed(2) : "0.00";
  const maxUsefulMagnification = aperture > 0 ? Math.round(aperture * 2) : 0;

  const recommendation = OPTICS_RECOMMENDATIONS[selectedTargetKey] ?? "";

  return (
    <section id="card-optics" className="card w-full mb-8">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Icon name="telescope" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            Telescope Optics & Eyepiece Guide
          </h2>
        </div>
      </div>

      <div className="card-body p-6 flex flex-col gap-6">
        {/* Target Preset Selector */}
        <div className="mb-2">
          <label htmlFor="target-preset-select" className="text-xs text-zinc-400 mb-1.5 block">
            Not sure what eyepiece to use? Select what you want to view:
          </label>
          <select
            id="target-preset-select"
            aria-label="Target observation type preset"
            value={selectedTargetKey}
            onChange={(e) => setSelectedTargetKey(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sky-400"
          >
            {OPTICS_TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {recommendation && (
            <p className="mt-2.5 text-xs text-sky-300/90 italic bg-sky-950/40 border border-sky-500/20 rounded-lg p-2.5">
              💡 {recommendation}
            </p>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="optics-focal-length" className="text-xs text-zinc-400 mb-1 block">Telescope Focal Length (mm)</label>
            <input
              id="optics-focal-length"
              aria-label="Telescope Focal Length in millimeters"
              type="number"
              value={focalLength}
              onChange={(e) => setFocalLength(Number(e.target.value))}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-sky-400 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label htmlFor="optics-aperture" className="text-xs text-zinc-400 mb-1 block">Aperture (mm)</label>
            <input
              id="optics-aperture"
              aria-label="Telescope Aperture in millimeters"
              type="number"
              value={aperture}
              onChange={(e) => setAperture(Number(e.target.value))}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-sky-400 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label htmlFor="optics-eyepiece-fl" className="text-xs text-zinc-400 mb-1 block">Eyepiece Focal Length (mm)</label>
            <input
              id="optics-eyepiece-fl"
              aria-label="Eyepiece Focal Length in millimeters"
              type="number"
              value={eyepieceFocalLength}
              onChange={(e) => setEyepieceFocalLength(Number(e.target.value))}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-sky-400 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label htmlFor="optics-eyepiece-afov" className="text-xs text-zinc-400 mb-1 block">Eyepiece Apparent FOV (°)</label>
            <input
              id="optics-eyepiece-afov"
              aria-label="Eyepiece Apparent Field of View in degrees"
              type="number"
              value={eyepieceAfov}
              onChange={(e) => setEyepieceAfov(Number(e.target.value))}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-sky-400 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Calculated Readouts */}
        <div className="flex flex-wrap justify-between gap-4 rounded-lg bg-white/5 p-4 border border-white/10">
          <div className="flex flex-col">
            <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider">Magnification</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{magnification}x</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider">Exit Pupil</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">{exitPupil}mm</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider">True FOV</span>
            <span className="text-lg font-bold text-amber-300 font-mono">{trueFov}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider">Max Useful</span>
            <span className="text-lg font-bold text-purple-400 font-mono">{maxUsefulMagnification}x</span>
          </div>
        </div>
      </div>
    </section>
  );
}
