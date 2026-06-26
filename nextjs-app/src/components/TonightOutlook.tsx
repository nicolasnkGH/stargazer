"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CloudSun, Moon, Eye, Telescope, Sparkles, CheckSquare, Square } from "lucide-react";

interface SeeingData {
  seeing_score: number;
  seeing_score_raw: number;
  seeing_label: string;
  seeing_explanation: string;
  best_window: string;
  warnings: string[];
  go_nogo: string;
  tonight_cloud_pct?: number;
  tonight_wind_kmh?: number;
  tonight_precip_prob?: number;
  tonight_humidity?: number;
  tonight_dew_spread?: number;
  tonight_visibility_km?: number;
  tonight_temp_c?: number;
  ai_powered: boolean;
}

interface TonightReport {
  date: string;
  time_generated: string;
  location_timezone: string;
  astronomical_dusk: string;
  astronomical_dawn: string;
  observing_window_hours: number;
  seeing: SeeingData;
  moon: {
    phase_name: string;
    illumination_pct: number;
    emoji?: string;
    altitude_deg?: number;
    direction?: string;
  };
  visible_planets: Array<{
    name: string;
    emoji: string;
    altitude_deg: number;
    direction: string;
    azimuth_deg: number;
  }>;
  best_targets_tonight: Array<{
    name: string;
    type: string;
    magnitude?: number;
    constellation?: string;
    emoji?: string;
  }>;
  must_see: Array<{
    title: string;
    subtitle: string;
    icon: string;
    meta: string;
    type: string;
  }>;
  planet_fact: string;
  telescope: {
    aperture_mm: number;
    bortle: number;
    limiting_mag: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function SeeingBadge({ score }: { score: number }) {
  const stars = "⭐".repeat(score);
  return (
    <span className="text-sm" title={`Score: ${score}/5`}>{stars}</span>
  );
}

function SeeingCard({ seeing }: { seeing: SeeingData }) {
  const scoreColor =
    seeing.seeing_score >= 4
      ? "text-green-400"
      : seeing.seeing_score >= 3
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Seeing Conditions</h3>
        {seeing.ai_powered && (
          <span className="ml-auto rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-purple-400">
            AI
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className={`text-3xl font-bold ${scoreColor}`}>{seeing.go_nogo}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{seeing.seeing_label}</span>
            <SeeingBadge score={seeing.seeing_score} />
          </div>
          <span className="text-xs text-zinc-400">Raw: {seeing.seeing_score_raw}/10 · {seeing.best_window}</span>
        </div>
      </div>

      {seeing.seeing_explanation && (
        <p className="text-sm text-zinc-300 mb-3">{seeing.seeing_explanation}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Clouds</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_cloud_pct ?? "—"}%</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Wind</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_wind_kmh ?? "—"} km/h</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Humidity</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_humidity ?? "—"}%</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Dew Spread</span>
          <p className={`text-sm font-mono ${(seeing.tonight_dew_spread ?? 99) < 3 ? "text-red-400" : "text-zinc-200"}`}>
            {seeing.tonight_dew_spread != null ? `${seeing.tonight_dew_spread}°C` : "—"}
          </p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Visibility</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_visibility_km ?? "—"} km</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Temp</span>
          <p className="text-sm text-zinc-200 font-mono">{seeing.tonight_temp_c != null ? `${seeing.tonight_temp_c}°C` : "—"}</p>
        </div>
      </div>

      {seeing.warnings.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {seeing.warnings.map((w, i) => (
            <span key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MoonCard({ moon }: { moon: TonightReport["moon"] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Moon</h3>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <span className="text-4xl">{moon.emoji ?? "🌙"}</span>
        <div>
          <p className="text-lg font-semibold text-zinc-100">{moon.phase_name}</p>
          <p className="text-sm text-zinc-400">{moon.illumination_pct}% illuminated</p>
        </div>
      </div>

      {/* Illumination bar */}
      <div className="w-full rounded-full bg-white/10 h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all"
          style={{ width: `${moon.illumination_pct}%` }}
        />
      </div>

      {moon.altitude_deg != null && (
        <p className="mt-3 text-xs text-zinc-400 font-mono">
          {moon.altitude_deg}° {moon.direction}
        </p>
      )}
    </div>
  );
}

function MustSeeCard({ items }: { items: TonightReport["must_see"] }) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-purple-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Must See Tonight</h3>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3">
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
              <p className="text-xs text-zinc-400">{item.subtitle}</p>
              {item.meta && (
                <p className="text-[0.7rem] text-zinc-500 font-mono mt-0.5">{item.meta}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelescopeInfo({ telescope }: { telescope: TonightReport["telescope"] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Telescope className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Your Setup</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Aperture</span>
          <p className="text-sm text-zinc-200 font-mono">{telescope.aperture_mm}mm</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Bortle</span>
          <p className="text-sm text-zinc-200 font-mono">{telescope.bortle}/10</p>
        </div>
        <div>
          <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Limiting Mag</span>
          <p className="text-sm text-zinc-200 font-mono">{telescope.limiting_mag}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-zinc-400 italic">{telescope.aperture_mm}mm aperture at Bortle {telescope.bortle} — limiting magnitude ~{telescope.limiting_mag}</p>
      </div>
    </div>
  );
}

function PreflightChecklist({ seeing }: { seeing: SeeingData }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const checks = [
    { id: "scope", label: "Scope cooled to ambient temp", required: true },
    { id: "dark", label: "Bortle ≤ 6 or light pollution managed", required: seeing.seeing_score >= 3 },
    { id: "moon", label: "Moon phase < 70% or positioned away from target", required: false },
    { id: "dew", label: "Dew shield heater on (dew spread < 5°C)", required: seeing.tonight_dew_spread != null && seeing.tonight_dew_spread < 5 },
    { id: "filters", label: "Appropriate filters selected", required: true },
    { id: "power", label: "Battery / power supply charged", required: true },
    { id: "camera", label: "Camera/memory card ready", required: false },
  ];

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const allDone = checks.every((c) => checked[c.id]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-400" strokeWidth={1.6} />
          <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Pre-flight Checklist</h3>
        </div>
        {allDone && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-green-400">
            Ready to observe
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
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
            {c.required && (
              <span className="ml-auto text-[0.55rem] text-zinc-600">required</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Moon3DWidget({ moon }: { moon: TonightReport["moon"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawMoon = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(canvas.clientWidth, 180);
    canvas.width = size * 2;
    canvas.height = size * 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = canvas.width * 0.38;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shadow gradient based on illumination
    const illum = moon.illumination_pct / 100;
    const shadowX = cx + r * (1 - 2 * illum);

    // Moon body
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "#e8e0d0");
    grad.addColorStop(0.7, "#c8bfa8");
    grad.addColorStop(1, "#8a8070");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shadow overlay
    if (illum < 1) {
      const shadowGrad = ctx.createLinearGradient(shadowX - r, 0, shadowX + r, 0);
      shadowGrad.addColorStop(0, "rgba(5,5,16,0)");
      shadowGrad.addColorStop(0.5, "rgba(5,5,16,0.7)");
      shadowGrad.addColorStop(1, "rgba(5,5,16,0.95)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = shadowGrad;
      ctx.fill();
    }

    // Craters
    const craters = [
      { x: cx - r * 0.2, y: cy - r * 0.15, r: r * 0.12 },
      { x: cx + r * 0.25, y: cy + r * 0.1, r: r * 0.09 },
      { x: cx - r * 0.1, y: cy + r * 0.3, r: r * 0.07 },
      { x: cx + r * 0.05, y: cy - r * 0.35, r: r * 0.06 },
    ];
    craters.forEach((cr) => {
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100,90,75,0.25)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cr.x + 1, cr.y + 1, cr.r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80,70,55,0.15)";
      ctx.fill();
    });
  }, [moon.illumination_pct]);

  useEffect(() => {
    drawMoon();
    window.addEventListener("resize", drawMoon);
    return () => window.removeEventListener("resize", drawMoon);
  }, [drawMoon]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className="w-full max-w-[180px] h-auto"
        style={{ filter: "drop-shadow(0 0 12px rgba(200,190,170,0.15))" }}
      />
      <p className="text-[0.65rem] text-zinc-500 font-mono">{moon.illumination_pct}% illuminated</p>
    </div>
  );
}

export default function TonightOutlook() {
  const [report, setReport] = useState<TonightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTonight() {
      try {
        const res = await fetch(`${API_BASE}/tonight`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch tonight's report");
      } finally {
        setLoading(false);
      }
    }
    fetchTonight();
  }, []);

  if (loading) {
    return (
      <section id="card-tonight" className="w-full">
        <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-48 bg-white/5 rounded" />
            <div className="h-48 bg-white/5 rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-tonight" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  if (!report) return null;

  return (
    <section id="card-tonight" className="w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudSun className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
          <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Tonight's Outlook</h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{report.date} · Generated {report.time_generated}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SeeingCard seeing={report.seeing} />
        <div className="flex flex-col gap-5">
          <MoonCard moon={report.moon} />
          <Moon3DWidget moon={report.moon} />
        </div>
      </div>

      <PreflightChecklist seeing={report.seeing} />

      <MustSeeCard items={report.must_see} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TelescopeInfo telescope={report.telescope} />

        {/* Dusk/Dawn + Planet Fact */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide mb-3">Dark Window</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Dusk</span>
              <p className="text-sm text-zinc-200 font-mono">{report.astronomical_dusk}</p>
            </div>
            <div className="text-right">
              <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Dawn</span>
              <p className="text-sm text-zinc-200 font-mono">{report.astronomical_dawn}</p>
            </div>
          </div>
          <div className="w-full rounded-full bg-white/10 h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600"
              style={{ width: `${Math.min(report.observing_window_hours / 14 * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-2">{report.observing_window_hours}h of darkness</p>

          {report.visible_planets.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <span className="text-[0.7rem] text-zinc-500 uppercase tracking-wider">Visible Planets</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {report.visible_planets.map((p) => (
                  <span key={p.name} className="rounded bg-white/5 px-2.5 py-1 text-xs text-zinc-200">
                    {p.emoji} {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
