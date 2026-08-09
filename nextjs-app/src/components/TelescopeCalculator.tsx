"use client";

import { useState } from "react";
import { FiCopy, FiInfo } from "react-icons/fi";
import { LuTelescope } from "react-icons/lu";
import { OPTICS_TARGET_TYPES, OPTICS_RECOMMENDATIONS, OPTICS_DEFAULTS } from "@/lib/constants";
import { computeOptics } from "@/lib/telescope-math";

function Metric({ label, value, tooltip, color }: { label: string; value: string; tooltip: string; color: string }) {
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {});
  }
  return (
    <div className="flex-1 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1" title={tooltip}>
        {label} <FiInfo className="h-3 w-3 opacity-60" />
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-lg font-bold" style={{ color }}>{value}</span>
        <button onClick={copy} title={`Copy ${label}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <FiCopy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function TelescopeCalculator() {
  const [targetType, setTargetType] = useState<string>(OPTICS_TARGET_TYPES[0].value);
  const [scopeFl, setScopeFl] = useState(OPTICS_DEFAULTS.scopeFocalLength);
  const [scopeAp, setScopeAp] = useState(OPTICS_DEFAULTS.scopeAperture);
  const [epFl, setEpFl] = useState(OPTICS_DEFAULTS.eyepieceFocalLength);
  const [epAfov, setEpAfov] = useState(OPTICS_DEFAULTS.eyepieceApparentFov);

  const result = computeOptics(scopeFl, scopeAp, epFl, epAfov);

  return (
    <section id="card-optics" className="card w-full">
      <div className="card-header">
        <LuTelescope className="h-5 w-5 text-sky-400" />
        <h2>Telescope Optics &amp; Eyepiece Guide</h2>
      </div>
      <div className="card-body">
        <p className="text-sm text-zinc-400 mb-3">
          Not sure what eyepiece to use? Select what you want to look at, and we&apos;ll tell you what you need!
        </p>

        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-1">What do you want to observe?</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            {OPTICS_TARGET_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-r bg-sky-500/10 border-l-[3px] border-sky-500 px-3 py-2.5 text-sm text-zinc-100 mb-4">
          {OPTICS_RECOMMENDATIONS[targetType]}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-zinc-400">Telescope Focal Length (mm)</label>
            <input
              type="number"
              value={scopeFl}
              onChange={(e) => setScopeFl(Number(e.target.value) || 0)}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Telescope Aperture (mm)</label>
            <input
              type="number"
              value={scopeAp}
              onChange={(e) => setScopeAp(Number(e.target.value) || 0)}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Eyepiece Focal Length (mm)</label>
            <input
              type="number"
              value={epFl}
              onChange={(e) => setEpFl(Number(e.target.value) || 0)}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Apparent FOV (°)</label>
            <input
              type="number"
              value={epAfov}
              onChange={(e) => setEpAfov(Number(e.target.value) || 0)}
              className="w-full rounded bg-black/20 border border-white/10 px-2.5 py-1.5 text-sm text-zinc-100"
            />
          </div>
        </div>

        <div className="flex justify-between gap-2 rounded-lg bg-white/5 p-3">
          <Metric label="Magnification" value={`${Math.round(result.magnification)}x`} tooltip="How many times larger the object appears." color="#4a9eff" />
          <Metric label="Exit Pupil" value={`${result.exitPupilMm.toFixed(1)}mm`} tooltip="The diameter of the light beam coming out of the eyepiece. A 5-7mm exit pupil is ideal for dark skies; smaller for light-polluted skies or older observers." color="#22c55e" />
          <Metric label="True FOV" value={`${result.trueFovDeg.toFixed(2)}°`} tooltip="How much actual sky you can see at once (e.g. the full Moon is ~0.5° wide)." color="#f97316" />
          <Metric label="Max Useful" value={`${Math.round(result.maxUsefulMagnification)}x`} tooltip="The maximum useful magnification before the image gets too blurry for this aperture." color="#a855f7" />
        </div>
      </div>
    </section>
  );
}
