"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface Constellation {
  name: string;
  abbr: string;
  emoji: string;
  altitude_deg: number;
  azimuth_deg: number;
  direction: string;
  visible: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function ActiveConstellation() {
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConstellations() {
      try {
        const res = await fetch(`${API_BASE}/constellations?filter_famous=true`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setConstellations(data.constellations || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch constellations");
      } finally {
        setLoading(false);
      }
    }
    fetchConstellations();
  }, []);

  if (loading) {
    return (
      <section id="card-active-const" className="w-full">
        <div className="card animate-pulse p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-32 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-active-const" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  const visible = constellations.filter((c) => c.visible).sort((a, b) => b.altitude_deg - a.altitude_deg);
  const highest = visible[0];

  return (
    <section id="card-active-const" className="card w-full">
      <div className="card-header">
        <Star className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
        <h2>Active Constellations</h2>
      </div>
      <div className="card-body">
        {highest ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{highest.emoji}</span>
              <div>
                <p className="text-lg font-bold text-amber-200">{highest.name}</p>
                <p className="text-xs text-amber-300/70">{highest.abbr} · {highest.direction}</p>
              </div>
              <span className="ml-auto text-2xl font-bold text-amber-400 font-mono">
                {highest.altitude_deg}°
              </span>
            </div>
            <div className="w-full rounded-full bg-white/10 h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                style={{ width: `${Math.min(highest.altitude_deg / 90 * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-amber-300/60 mt-2">Azimuth: {highest.azimuth_deg}°</p>
          </div>
        ) : (
          <div className="card card-body mb-5">
            <p className="text-sm text-zinc-400">No famous constellations currently visible above the horizon.</p>
          </div>
        )}

        {/* All visible constellations */}
        {visible.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visible.map((c) => (
              <div key={c.name} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 flex items-center gap-2">
                <span className="text-lg">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[0.65rem] text-zinc-500 font-mono">{c.altitude_deg}° {c.direction}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
