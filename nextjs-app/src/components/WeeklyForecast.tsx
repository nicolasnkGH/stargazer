"use client";

import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";

interface WeekDay {
  date: string;
  moon_phase: string;
  moon_illumination: number;
  weather: string;
  cloud_pct: number;
  temp_c: number;
  highlights: string[];
  rating: string;
}

interface WeeklyReport {
  week_start: string;
  days: WeekDay[];
  best_nights: Array<{ date: string; reason: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function RatingBadge({ rating }: { rating: string }) {
  if (rating.includes("Excellent")) return <span className="text-xs font-medium text-green-400">⭐⭐⭐ Excellent</span>;
  if (rating.includes("Good")) return <span className="text-xs font-medium text-green-300">⭐⭐ Good</span>;
  if (rating.includes("Fair")) return <span className="text-xs font-medium text-yellow-400">⭐ Fair</span>;
  return <span className="text-xs font-medium text-red-400">❌ Poor</span>;
}

function StatusDot({ cloud_pct }: { cloud_pct: number }) {
  if (cloud_pct <= 30) return <span className="h-2 w-2 rounded-full bg-green-400" title="Clear" />;
  if (cloud_pct <= 60) return <span className="h-2 w-2 rounded-full bg-yellow-400" title="Partly Cloudy" />;
  return <span className="h-2 w-2 rounded-full bg-red-400" title="Cloudy" />;
}

export default function WeeklyForecast() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeekly() {
      try {
        const res = await fetch(`${API_BASE}/weekly`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch weekly forecast");
      } finally {
        setLoading(false);
      }
    }
    fetchWeekly();
  }, []);

  if (loading) {
    return (
      <section id="card-weekly" className="w-full">
        <div className="card animate-pulse p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-weekly" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  if (!report) return null;

  return (
    <section id="card-weekly" className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
          <h2>7-Day Forecast</h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{report.week_start}</span>
      </div>
      <div className="card-body">

      {/* Best nights */}
      {report.best_nights.length > 0 && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
          {report.best_nights.map((bn, i) => (
            <span key={i} className="text-xs text-green-300">
              <span className="font-medium">Best:</span> {bn.date} — {bn.reason}
            </span>
          ))}
        </div>
      )}

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {report.days.map((day, i) => (
          <div
            key={i}
            className={`rounded-lg bg-white/[0.02] border p-3 flex flex-col items-center text-center gap-1.5 ${
              day.rating.includes("Excellent") || day.rating.includes("Good")
                ? "border-green-500/15"
                : "border-white/5"
            }`}
          >
            <StatusDot cloud_pct={day.cloud_pct} />
            <span className="text-[0.65rem] text-zinc-500 font-medium">
              {new Date(day.date).toLocaleDateString([], { weekday: "short" })}
            </span>
            <span className="text-xs text-zinc-300 font-mono">
              {new Date(day.date).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
            <span className="text-sm">{day.moon_illumination}%</span>
            <span className="text-[0.65rem] text-zinc-400">{day.moon_phase}</span>
            <span className="text-xs text-zinc-300 font-mono">{day.temp_c}°C</span>
            <RatingBadge rating={day.rating} />
            {day.highlights.length > 0 && (
              <div className="mt-1 w-full pt-1.5 border-t border-white/5">
                {day.highlights.slice(0, 2).map((h, j) => (
                  <p key={j} className="text-[0.6rem] text-zinc-500 leading-tight">{h}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
