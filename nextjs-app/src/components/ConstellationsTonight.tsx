"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface ConstellationData {
  name: string;
  abbr: string;
  emoji: string;
  altitude_deg: number;
  azimuth_deg: number;
  direction: string;
  visible: boolean;
  rising: boolean;
  setting: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function ConstellationsTonight() {
  const [constellations, setConstellations] = useState<ConstellationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/constellations`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setConstellations(data.constellations || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch constellations");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <section className="w-full">
        <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  const visible = constellations.filter((c) => c.visible).sort((a, b) => b.altitude_deg - a.altitude_deg);
  const rising = visible.filter((c) => c.rising);
  const setting = visible.filter((c) => c.setting);
  const stable = visible.filter((c) => !c.rising && !c.setting);

  return (
    <section id="card-constellations" className="card w-full">
      <div className="card-header">
        <Star className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
        <h2>Constellations Tonight</h2>
      </div>
      <div className="card-body">

      {/* All visible grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-5">
        {visible.map((c) => (
          <div
            key={c.name}
            className={`rounded-lg border p-2.5 flex flex-col items-center text-center gap-1 transition-colors ${
              c.rising
                ? "border-amber-500/20 bg-amber-500/[0.04]"
                : c.setting
                  ? "border-orange-500/20 bg-orange-500/[0.04]"
                  : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <span className="text-xl">{c.emoji}</span>
            <p className="text-[0.7rem] font-medium text-zinc-200 truncate w-full">{c.name}</p>
            <p className="text-[0.6rem] text-zinc-500 font-mono">{c.altitude_deg}°</p>
            {c.rising && <span className="text-[0.55rem] text-amber-400">Rising</span>}
            {c.setting && <span className="text-[0.55rem] text-orange-400">Setting</span>}
          </div>
        ))}
      </div>

      {/* Rising section */}
      {rising.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-amber-400 font-medium mb-2">Rising Tonight</p>
          <div className="flex flex-wrap gap-1.5">
            {rising.map((c) => (
              <span key={c.name} className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-300">
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Setting section */}
      {setting.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-orange-400 font-medium mb-2">Setting Tonight</p>
          <div className="flex flex-wrap gap-1.5">
            {setting.map((c) => (
              <span key={c.name} className="rounded bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs text-orange-300">
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stable section */}
      {stable.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 font-medium mb-2">Stable All Night</p>
          <div className="flex flex-wrap gap-1.5">
            {stable.map((c) => (
              <span key={c.name} className="rounded bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
