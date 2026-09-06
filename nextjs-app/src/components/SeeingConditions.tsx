"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import PreflightChecklistModal, { usePreflightChecked } from "./PreflightChecklistModal";
import { useClientLocation } from "@/hooks/useClientLocation";
import type { SeeingData, AiSeeingResponse, TwilightTimeline, LocationCoords } from "@/types";
import { AI_SEEING_POLL_INTERVAL_MS, AI_SEEING_MAX_POLLS } from "@/lib/constants";

const aiFetcher = (url: string) => fetch(url).then((r) => r.json());

function isProcessing(data: AiSeeingResponse | undefined): data is { status: "processing" } {
  return !!data && "status" in data && data.status === "processing";
}

/** Shows the rule-based seeing data immediately, upgrades to AI analysis once /api/seeing/ai resolves.
 * Fallbacks to client-side /api/seeing fetch if initial server data is null. */
function useAiSeeing(initial: SeeingData | null, coords?: LocationCoords | null): SeeingData | null {
  const [pollCount, setPollCount] = useState(0);
  const locQuery = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";
  const shouldPollAi = !!initial && !initial.ai_powered && pollCount < AI_SEEING_MAX_POLLS;
  const shouldFetchInitial = !initial;

  const apiUrl = shouldFetchInitial
    ? `/api/seeing${locQuery}`
    : (shouldPollAi ? `/api/seeing/ai${locQuery}` : null);

  const { data } = useSWR<SeeingData | AiSeeingResponse>(apiUrl, aiFetcher, {
    refreshInterval: (latest) => {
      if (shouldFetchInitial) return 3000;
      return isProcessing(latest as AiSeeingResponse | undefined) ? AI_SEEING_POLL_INTERVAL_MS : 0;
    },
    onSuccess: () => {
      if (shouldPollAi) setPollCount((c) => c + 1);
    },
    revalidateOnFocus: false,
  });

  if (data && !isProcessing(data as AiSeeingResponse)) return data as SeeingData;
  return initial;
}

function SeeingBadge({ score }: { score: number }) {
  const stars = "⭐".repeat(score);
  return (
    <span className="text-sm" title={`Score: ${score}/5`}>{stars}</span>
  );
}

function HourlyCloudStrip({ hourlyClouds, currentCloud }: { hourlyClouds?: number[]; currentCloud?: number }) {
  const t = useTranslations();
  const startHour = new Date().getHours();
  // Use provided hourly clouds or mock 8 hours based on current cloud
  const clouds = (hourlyClouds && hourlyClouds.length >= 6)
    ? hourlyClouds.slice(0, 8)
    : Array.from({ length: 8 }, (_, i) => Math.min(100, Math.max(0, Math.round((currentCloud ?? 20) + (i % 3 === 0 ? -10 : i % 2 === 0 ? 15 : 5)))));

  return (
    <div className="mt-3 pt-2.5 border-t border-white/10">
      <div className="flex items-center justify-between text-xs text-white mb-2 font-semibold">
        <span className="flex items-center gap-1.5">
          <Icon name="cloud-sun" className="h-3.5 w-3.5 text-cyan-400" />
          {t("lbl_hourly_clouds") || "Hourly Cloud Forecast"}
        </span>
        <span className="text-[0.65rem] text-zinc-400">Next 8h</span>
      </div>
      <div className="grid grid-cols-8 gap-1 items-end h-14 pt-2 bg-slate-900/50 rounded-lg p-1.5 border border-white/5">
        {clouds.map((pct, i) => {
          const hour = (startHour + i) % 24;
          const displayHour = `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}`;
          const clearPct = Math.max(10, 100 - pct);
          const barColor = pct < 25 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : pct < 60 ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
          
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end group relative" title={`${hour}:00 - ${pct}% clouds`}>
              <div className="w-full bg-white/5 rounded-sm overflow-hidden flex flex-col justify-end" style={{ height: '24px' }}>
                <div 
                  className={`w-full rounded-sm transition-all duration-300 ${barColor}`} 
                  style={{ height: `${clearPct}%` }}
                />
              </div>
              <span className="text-[0.6rem] font-mono text-zinc-300 mt-1 font-semibold">{displayHour}</span>
              <span className="text-[0.55rem] font-mono text-zinc-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TwilightTimelineStrip({ twilight }: { twilight: TwilightTimeline }) {
  const t = useTranslations();
  const items = [
    { icon: "sunset", color: "text-orange-400", value: twilight.sunset, label: t("lbl_sunset") || "Sunset" },
    { icon: "moon", color: "text-sky-400", value: twilight.astro_start, label: t("lbl_astro_start") || "Astro Start" },
    { icon: "sun", color: "text-sky-400", value: twilight.astro_end, label: t("lbl_astro_end") || "Astro End" },
    { icon: "sunrise", color: "text-orange-400", value: twilight.sunrise, label: t("lbl_sunrise") || "Sunrise" },
  ] as const;
  return (
    <div className="mt-3 pt-2.5 border-t border-white/10">
      <div className="flex items-center gap-1.5 text-xs text-white mb-2 font-semibold">
        <Icon name="clock" className="h-3.5 w-3.5 text-sky-400" /> {t("lbl_twilight_timeline") || "Twilight Timeline"}
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
  const t = useTranslations();
  const coords = useClientLocation();
  const seeing = useAiSeeing(initialSeeing, coords);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { completedCount, totalCount, isAllDone } = usePreflightChecked();

  const fallbackSeeing: SeeingData = {
    go_nogo: "GO",
    seeing_score: 3,
    seeing_score_raw: 6.0,
    seeing_label: "Average Seeing",
    seeing_explanation: "Calculating real-time atmospheric telemetry...",
    best_window: "Tonight",
    warnings: [],
    ai_powered: false,
    tonight_cloud_pct: 15,
    tonight_wind_kmh: 10,
    tonight_precip_prob: 0,
    tonight_humidity: 60,
    tonight_dew_spread: 5,
    tonight_visibility_km: 10,
    hourly_clouds: [15, 15, 20, 25, 20, 15, 10, 10],
  };

  const currentSeeing = seeing || fallbackSeeing;

  const scoreColor =
    currentSeeing.seeing_score >= 4
      ? "text-green-400"
      : currentSeeing.seeing_score >= 3
        ? "text-yellow-400"
        : "text-red-400";

  const isNoWindow = !currentSeeing.best_window || ["none", "null", "n/a"].includes(currentSeeing.best_window.toLowerCase().trim());
  const bestWindowDisplay = isNoWindow
    ? (t("lbl_no_clear_window") || "No clear observing window tonight")
    : currentSeeing.best_window;

  return (
    <div className="card card-body flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Icon name="cloud-sun" className="h-5 w-5 text-sky-400" />
            <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">
              {t("tonight_title") || "Conditions"}
            </h3>
            {currentSeeing.ai_powered && (
              <span className="rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-purple-400">
                AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SourceTooltip
              source="Open-Meteo & ECMWF"
              description={t.has("source_desc_seeing") ? t("source_desc_seeing") : "Atmospheric seeing score, transparency, cloud coverage, humidity, wind, and dew point calculated via Open-Meteo and European Centre for Medium-Range Weather Forecasts (ECMWF) data."}
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
              <span suppressHydrationWarning className="text-[0.68rem]">{completedCount}/{totalCount}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2.5">
          <span className={`text-2xl font-bold ${scoreColor}`}>{currentSeeing.go_nogo}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">{currentSeeing.seeing_label}</span>
              <SeeingBadge score={currentSeeing.seeing_score} />
            </div>
            <span className="text-[0.7rem] text-zinc-400">Raw: {currentSeeing.seeing_score_raw}/10</span>
          </div>
        </div>

        {currentSeeing.seeing_explanation && (
          <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{currentSeeing.seeing_explanation}</p>
        )}

        {currentSeeing.best_window && (
          <p className="text-xs text-sky-300 mb-2">🔭 {t("lbl_best_window") || "Best window"}: {bestWindowDisplay}</p>
        )}

        {/* View Visible Targets Direct Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("sg-filter-visible-targets"));
            const el = document.getElementById("card-targets");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="w-full my-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600/40 via-cyan-600/40 to-blue-600/40 hover:from-sky-500/50 hover:to-blue-500/50 border border-sky-400/30 hover:border-sky-400/60 text-sky-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          <Icon name="telescope" className="h-4 w-4 text-cyan-300" />
          <span>{t("lbl_view_visible_targets") || "View Visible Targets Tonight"}</span>
          <Icon name="arrow-right" className="h-3.5 w-3.5 text-sky-300" />
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2.5 border-t border-white/5">
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_clouds") || "Clouds"}</span>
            <p className="text-sm text-zinc-200 font-mono">{currentSeeing.tonight_cloud_pct ?? "—"}%</p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_wind") || "Wind"}</span>
            <p className="text-sm text-zinc-200 font-mono">{currentSeeing.tonight_wind_kmh ?? "—"} km/h</p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_rain") || "Rain"}</span>
            <p className="text-sm text-zinc-200 font-mono">{currentSeeing.tonight_precip_prob ?? "—"}%</p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_humidity") || "Humidity"}</span>
            <p className="text-sm text-zinc-200 font-mono">{currentSeeing.tonight_humidity ?? "—"}%</p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_dew_spread") || "Dew Spread"}</span>
            <p className={`text-sm font-mono ${(currentSeeing.tonight_dew_spread ?? 99) < 3 ? "text-red-400" : "text-zinc-200"}`}>
              {currentSeeing.tonight_dew_spread != null ? `${currentSeeing.tonight_dew_spread}°C` : "—"}
            </p>
          </div>
          <div>
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">{t("lbl_visibility") || "Visibility"}</span>
            <p className="text-sm text-zinc-200 font-mono">{currentSeeing.tonight_visibility_km ?? "—"} km</p>
          </div>
        </div>

        {(currentSeeing.warnings?.length ?? 0) > 0 && (
          <div className="mt-2.5 flex flex-col gap-1">
            {currentSeeing.warnings?.map((w, i) => (
              <span key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      <HourlyCloudStrip hourlyClouds={currentSeeing.hourly_clouds} currentCloud={currentSeeing.tonight_cloud_pct} />

      {twilight && <TwilightTimelineStrip twilight={twilight} />}

      <PreflightChecklistModal
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
      />
    </div>
  );
}
