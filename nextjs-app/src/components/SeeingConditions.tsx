"use client";

import { useState } from "react";
import useSWR from "swr";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import PreflightChecklistModal, { usePreflightChecked } from "./PreflightChecklistModal";
import type { SeeingData, AiSeeingResponse, TwilightTimeline } from "@/types";
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

function TwilightTimelineStrip({ twilight }: { twilight: TwilightTimeline }) {
  const items = [
    { icon: "sunset", color: "text-orange-400", value: twilight.sunset, label: "Sunset" },
    { icon: "moon", color: "text-sky-400", value: twilight.astro_start, label: "Astro Start" },
    { icon: "sun", color: "text-sky-400", value: twilight.astro_end, label: "Astro End" },
    { icon: "sunrise", color: "text-orange-400", value: twilight.sunrise, label: "Sunrise" },
  ] as const;
  return (
    <div className="mt-3 pt-2.5 border-t border-white/10">
      <div className="flex items-center gap-1.5 text-xs text-white mb-2 font-semibold">
        <Icon name="clock" className="h-3.5 w-3.5 text-sky-400" /> Twilight Timeline
      </div>
      <div className="flex justify-between text-center text-xs text-zinc-400">
        {items.map((it, i) => (
          <div key={i}>
            <Icon name={it.icon} className={`h-4 w-4 mx-auto mb-1 ${it.color}`} />
            <div className="font-semibold text-white">{it.value ?? "--:--"}</div>
            <div className="text-[0.65rem] text-zinc-500">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeeingConditions({
  seeing: initialSeeing,
  twilight,
}: {
  seeing: SeeingData | null;
  twilight?: TwilightTimeline;
}) {
  const seeing = useAiSeeing(initialSeeing);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { completedCount, totalCount, isAllDone } = usePreflightChecked();

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
    <div className="card card-body flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Icon name="cloud-sun" className="h-5 w-5 text-sky-400" />
            <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Conditions</h3>
            {seeing.ai_powered && (
              <span className="rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-purple-400">
                AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SourceTooltip
              source="Open-Meteo & ECMWF"
              description="Atmospheric seeing score, transparency, cloud coverage, humidity, wind, and dew point calculated via Open-Meteo and European Centre for Medium-Range Weather Forecasts (ECMWF) data."
              attribution="Open-Meteo / ECMWF"
            />
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95 ${
                isAllDone
                  ? "bg-green-500/20 text-green-300 border-green-500/40"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
              }`}
              title="Open Pre-Flight Checklist"
            >
              <Icon name="check-square" className={`h-3.5 w-3.5 ${isAllDone ? "text-green-400" : "text-zinc-400"}`} />
              <span className="text-[0.68rem]">{completedCount}/{totalCount}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2.5">
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

        {seeing.best_window && (
          <p className="text-xs text-sky-300 mb-2">🔭 Best window: {seeing.best_window}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2.5 border-t border-white/5">
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
              {seeing.tonight_dew_spread != null ? `${seeing.tonight_dew_spread}°C` : "—"}
            </p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Visibility</span>
            <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_visibility_km ?? "—"} km</p>
          </div>
        </div>

        {seeing.warnings.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1">
            {seeing.warnings.map((w, i) => (
              <span key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {twilight && <TwilightTimelineStrip twilight={twilight} />}

      <PreflightChecklistModal
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
      />
    </div>
  );
}
