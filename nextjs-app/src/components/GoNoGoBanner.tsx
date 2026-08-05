"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface GoNoGoData {
  go_nogo: string;
  confidence: string;
  factors: string[];
  recommendation: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function GoNoGoBanner() {
  const [data, setData] = useState<GoNoGoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGoNoGo() {
      try {
        const res = await fetch(`${API_BASE}/tonight`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        const seeing = d.seeing || {};
        setData({
          go_nogo: seeing.go_nogo || "UNKNOWN",
          confidence: "Rule-based",
          factors: seeing.warnings || [],
          recommendation: seeing.seeing_label || ""
        });
      } catch {
        // Use TonightOutlook data as fallback — handled by parent
      } finally {
        setLoading(false);
      }
    }
    fetchGoNoGo();
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-lg bg-white/[0.02] border border-white/5 h-12 animate-pulse" />
    );
  }

  if (!data) return null;

  const isGo = data.go_nogo === "GO";
  const isMaybe = data.go_nogo === "MAYBE";

  const iconColor = isGo ? "text-green-400" : isMaybe ? "text-yellow-400" : "text-red-400";
  const bgColor = isGo
    ? "bg-green-500/[0.06] border-green-500/20"
    : isMaybe
      ? "bg-yellow-500/[0.06] border-yellow-500/20"
      : "bg-red-500/[0.06] border-red-500/20";

  const Icon = isGo ? CheckCircle2 : isMaybe ? AlertTriangle : XCircle;

  return (
    <div className={`w-full rounded-lg border ${bgColor} px-4 py-3 flex items-center gap-3`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} strokeWidth={1.6} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${iconColor}`}>{data.go_nogo}</span>
          <span className="text-xs text-zinc-500 font-mono">{data.confidence}</span>
        </div>
        <p className="text-xs text-zinc-400 truncate">{data.recommendation}</p>
      </div>
      <div className="hidden sm:flex gap-1.5">
        {data.factors.slice(0, 3).map((f, i) => (
          <span key={i} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
