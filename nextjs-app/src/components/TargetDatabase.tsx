"use client";

import { useState, useEffect } from "react";
import { Binoculars } from "lucide-react";

interface Target {
  name: string;
  type: string;
  constellation: string;
  magnitude?: number;
  size?: string;
  distance?: string;
  best_month?: string;
  notes?: string;
  emoji?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function TargetDatabase() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [filter, setFilter] = useState("Sco");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch(`${API_BASE}/targets?constellation=${filter}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTargets(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch targets");
      } finally {
        setLoading(false);
      }
    }
    fetchTargets();
  }, [filter]);

  const constellations = ["And", "Ori", "Sco", "Cyg", "Leo", "Vir", "Sgr", "Aql"];

  if (loading) {
    return (
      <section id="card-targets" className="w-full">
        <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-40 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-targets" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  return (
    <section id="card-targets" className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Binoculars className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Target Database</h2>
      </div>

      {/* Constellation filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {constellations.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === c
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {targets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">No targets found for {filter}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {targets.map((t, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{t.emoji ?? "🔭"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-zinc-100">{t.name}</p>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[0.65rem] text-zinc-400">{t.type}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                  {t.magnitude != null && (
                    <span>Mag <span className="font-mono text-zinc-300">{t.magnitude}</span></span>
                  )}
                  {t.size && (
                    <span>{t.size}</span>
                  )}
                  {t.distance && (
                    <span>{t.distance}</span>
                  )}
                  {t.constellation && (
                    <span>{t.constellation}</span>
                  )}
                </div>
                {t.notes && (
                  <p className="text-xs text-zinc-500 mt-1.5 italic">{t.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
