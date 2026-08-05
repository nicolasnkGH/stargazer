"use client";

import { useState } from "react";
import useSWR from "swr";
import { CloudSun, CheckSquare, Square } from "lucide-react";
import type { SeeingData, AiSeeingResponse } from "@/types";
import { AI_SEEING_POLL_INTERVAL_MS, AI_SEEING_MAX_POLLS } from "@/lib/constants";

const aiFetcher = (url: string) => fetch(url).then((r) => r.json());

function isProcessing(data: AiSeeingResponse | undefined): data is { status: "processing" } {
  return !!data && "status" in data && data.status === "processing";
}

/** Shows the rule-based seeing data immediately, upgrades to AI analysis once /api/seeing/ai resolves. */
function useAiSeeing(initial: SeeingData | null): SeeingData | null {
  const [pollCount, setPollCount] = useState(0);
  const shouldPoll = !!initial && !initial.ai_powered && pollCount < AI_SEEING_MAX_POLLS;

  const { data } = useSWR<AiSeeingResponse>(shouldPoll ? "/api/seeing/ai" : null, aiFetcher, {
    refreshInterval: (latest) => (isProcessing(latest as AiSeeingResponse | undefined) ? AI_SEEING_POLL_INTERVAL_MS : 0),
    onSuccess: () => setPollCount((c) => c + 1),
    revalidateOnFocus: false,
  });

  if (data && !isProcessing(data)) return data;
  return initial;
}

function SeeingBadge({ score }: { score: number }) {
  const stars = "⭐".repeat(score);
  return (
    <span className="text-sm" title={`Score: ${score}/5`}>{stars}</span>
  );
}

function PreflightChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const checks = [
    { id: "scope", label: "Scope cooled to ambient temp" },
    { id: "dark", label: "Bortle <= 6 or light pollution managed" },
    { id: "moon", label: "Moon phase < 70% or positioned away from target" },
    { id: "dew", label: "Dew shield heater on (dew spread < 5C)" },
    { id: "filters", label: "Appropriate filters selected" },
    { id: "power", label: "Battery / power supply charged" },
    { id: "camera", label: "Camera/memory card ready" },
  ];

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const allDone = checks.every((c) => checked[c.id]);

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100 mb-3">
        <CheckSquare className="h-4 w-4 text-green-400" strokeWidth={1.5} />
        Pre-Flight Checklist
      </h3>
      <div className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`flex items-center gap-2.5 text-left rounded-lg px-2.5 py-1.5 transition-colors ${
              checked[c.id] ? "bg-green-500/[0.06]" : "hover:bg-white/[0.03]"
            }`}
          >
            {checked[c.id] ? (
              <CheckSquare className="h-4 w-4 text-green-400 flex-shrink-0" strokeWidth={1.5} />
            ) : (
              <Square className="h-4 w-4 text-zinc-600 flex-shrink-0" strokeWidth={1.5} />
            )}
            <span className={`text-xs ${checked[c.id] ? "text-zinc-300 line-through" : "text-zinc-400"}`}>
              {c.label}
            </span>
          </button>
        ))}
      </div>
      {allDone && (
        <span className="mt-2 block rounded bg-green-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-green-400">
          Ready to observe
        </span>
      )}
    </div>
  );
}

export default function SeeingConditions({ seeing: initialSeeing }: { seeing: SeeingData | null }) {
  const seeing = useAiSeeing(initialSeeing);

  if (!seeing) {
    return (
      <div className="card p-5 h-full">
        <p className="text-sm text-red-400">Conditions unavailable.</p>
      </div>
    );
  }

  const scoreColor =
    seeing.seeing_score >= 4
      ? "text-green-400"
      : seeing.seeing_score >= 3
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="card card-body flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <CloudSun className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Conditions</h3>
        {seeing.ai_powered && (
          <span className="ml-auto rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-purple-400">
            AI
          </span>
        )}
        <span className="ml-1 text-xs text-zinc-500">{seeing.go_nogo}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl font-bold ${scoreColor}`}>{seeing.go_nogo}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{seeing.seeing_label}</span>
            <SeeingBadge score={seeing.seeing_score} />
          </div>
          <span className="text-[0.7rem] text-zinc-400">Raw: {seeing.seeing_score_raw}/10</span>
        </div>
      </div>

      {seeing.seeing_explanation && (
        <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{seeing.seeing_explanation}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-3 border-t border-white/5 flex-1">
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Clouds</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_cloud_pct ?? "—"}%</p>
        </div>
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Wind</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_wind_kmh ?? "—"} km/h</p>
        </div>
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Rain</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_precip_prob ?? "—"}%</p>
        </div>
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Humidity</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_humidity ?? "—"}%</p>
        </div>
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Dew Spread</span>
          <p className={`text-sm font-mono ${(seeing.tonight_dew_spread ?? 99) < 3 ? "text-red-400" : "text-zinc-200"}`}>
            {seeing.tonight_dew_spread != null ? `${seeing.tonight_dew_spread}C` : "—"}
          </p>
        </div>
        <div>
          <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Visibility</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_visibility_km ?? "—"} km</p>
        </div>
      </div>

      {seeing.warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {seeing.warnings.map((w, i) => (
            <span key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
              {w}
            </span>
          ))}
        </div>
      )}

      <PreflightChecklist />
    </div>
  );
}
