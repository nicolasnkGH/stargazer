"use client";

import { useState, useEffect } from "react";
import { Telescope, Sparkles, Star } from "lucide-react";

interface Target {
  title: string;
  subtitle: string;
  icon: string;
  metadata: string;
}

interface MustSeeData {
  best_targets_tonight: Target[];
  must_see: Target[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function AiTargets() {
  const [data, setData] = useState<MustSeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTonight() {
      try {
        const res = await fetch(`${API_BASE}/tonight`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData({
          best_targets_tonight: json.best_targets_tonight ?? [],
          must_see: json.must_see ?? [],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch targets");
      } finally {
        setLoading(false);
      }
    }
    fetchTonight();
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.6} />
          <div className="h-5 w-32 bg-white/10 rounded" />
        </div>
        <div className="h-32 bg-white/5 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const allTargets = [...data.best_targets_tonight, ...data.must_see];
  if (allTargets.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.6} />
          <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Must See Tonight</h3>
        </div>
        <p className="text-sm text-zinc-400">No targets available for tonight.</p>
      </div>
    );
  }

  return (
    <div className="card card-body">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Must See Tonight</h3>
        <span className="ml-auto text-xs text-zinc-500">AI Powered</span>
      </div>

      <div className="flex flex-col gap-3">
        {allTargets.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-zinc-100">{t.title}</h4>
                <Star className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" strokeWidth={2} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1 font-mono">{t.metadata}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
