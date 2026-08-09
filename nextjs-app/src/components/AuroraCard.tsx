import { FiZap, FiAlertTriangle } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import type { AuroraForecast, SpaceWeatherReport } from "@/types";

interface AuroraCardProps {
  aurora: AuroraForecast | null;
  spaceWeather: SpaceWeatherReport | null;
}

const KP_COLORS: Record<string, string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  gray: "#94a3b8",
};

export default function AuroraCard({ aurora, spaceWeather }: AuroraCardProps) {
  const kp = aurora?.kp ?? 0;
  const probabilityLabel = aurora?.probability ?? "Low";
  const ringColor = KP_COLORS[aurora?.color ?? "gray"] ?? KP_COLORS.gray;
  const kpPct = Math.min((kp / 9) * 100, 100);
  const events = spaceWeather?.events ?? [];

  return (
    <section id="card-space-weather" className="card w-full border border-purple-500/20">
      <div className="card-header">
        <FiZap className="h-5 w-5 text-purple-400" />
        <div>
          <h2>Aurora &amp; Space Weather</h2>
          <p className="text-[0.7rem] text-zinc-500 mt-0.5">
            Data powered by{" "}
            <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener" className="text-purple-400 hover:underline">
              NOAA Space Weather Prediction Center
            </a>
          </p>
        </div>
      </div>
      <div className="card-body grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kp-Index meter */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <h3 className="text-sm text-zinc-400 mb-2.5">Planetary Kp-Index</h3>
          <div
            className="relative h-[110px] w-[110px] rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${ringColor} ${kpPct}%, rgba(255,255,255,0.05) ${kpPct}%)`,
            }}
          >
            <div className="absolute h-[86px] w-[86px] rounded-full bg-slate-950 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white leading-none">{kp}</span>
              <span className="text-[0.65rem] text-zinc-500 mt-1 font-semibold">{probabilityLabel}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2.5 leading-tight">{aurora?.message ?? "Forecast unavailable"}</p>
        </div>

        {/* Aurora probability */}
        <div className="flex flex-col justify-center rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="flex items-center gap-1.5 text-sm text-zinc-400 mb-2.5">
            <LuSparkles className="h-4 w-4 text-purple-400" /> Aurora Visibility
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-[2.2rem] font-bold text-purple-400 leading-none">{probabilityLabel}</span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${kpPct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-3 leading-tight">
            {probabilityLabel === "Low"
              ? "Aurora is unlikely to be visible at your current latitude."
              : "Elevated geomagnetic activity — auroras may be visible toward the pole-facing horizon."}
          </p>
        </div>

        {/* Space weather alerts */}
        <div className="flex flex-col justify-center rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="flex items-center gap-1.5 text-sm text-zinc-400 mb-2.5">
            <FiAlertTriangle className="h-4 w-4 text-amber-400" /> Space Weather Alerts
          </h3>
          <div id="space-weather-alerts-container" className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center mt-4">No active space weather alerts.</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
                  <p className="text-xs font-semibold text-zinc-300">{e.type}</p>
                  <p className="text-[0.7rem] text-zinc-500">{e.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
