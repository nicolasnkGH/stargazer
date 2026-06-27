"use client";

import { useState, useEffect } from "react";
import { Rocket, Telescope, Sparkles } from "lucide-react";

interface IssPass {
  rise: string;
  set: string;
  peak_alt: number;
  peak_az: string;
  visible: boolean;
}

interface NeoObject {
  name: string;
  diameter_m: number;
  closest_approach_au: number;
  velocity_kms: number;
  hazardous: boolean;
  date: string;
}

interface CometData {
  name: string;
  magnitude: number;
  constellation: string;
  visible: boolean;
  perihelion_date: string;
  description: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const TABS = [
  { key: "iss", label: "ISS Passes", icon: Rocket },
  { key: "neo", label: "Near-Earth Objects", icon: Telescope },
  { key: "comets", label: "Comets", icon: Sparkles },
];

export default function SkyMotion() {
  const [tab, setTab] = useState("iss");
  const [passes, setPasses] = useState<IssPass[]>([]);
  const [neos, setNeos] = useState<NeoObject[]>([]);
  const [comets, setComets] = useState<CometData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [issRes, neoRes] = await Promise.all([
          fetch(`${API_BASE}/iss?count=3`),
          fetch(`${API_BASE}/asteroids?limit=5`),
        ]);
        if (issRes.ok) {
          const issData = await issRes.json();
          setPasses(issData.passes || []);
        }
        if (neoRes.ok) setNeos(await neoRes.json());
        setComets([]); // No backend endpoint for comets currently
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch sky motion data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <section id="card-motion" className="w-full">
        <div className="card animate-pulse p-5">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-24 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-motion" className="w-full">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  const visiblePasses = passes.filter((p) => p.visible);

  return (
    <section id="card-motion" className="card w-full">
      <div className="card-header">
        <Rocket className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2>Sky Objects in Motion</h2>
      </div>
      <div className="card-body">

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ISS Passes tab */}
      {tab === "iss" && (
        visiblePasses.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            No ISS passes visible right now. Check back later!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {passes.map((p, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  p.visible
                    ? "border-sky-500/20 bg-sky-500/[0.05]"
                    : "border-white/10 bg-white/[0.03] opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛰️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-zinc-100">ISS Pass #{i + 1}</p>
                      {p.visible && (
                        <span className="rounded bg-green-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-green-400">
                          Visible
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                      <span>Rise: <span className="font-mono text-zinc-300">{formatTime(p.rise)}</span></span>
                      <span>Set: <span className="font-mono text-zinc-300">{formatTime(p.set)}</span></span>
                      <span>Peak: <span className="font-mono text-zinc-300">{p.peak_alt}° {p.peak_az}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* NEO tab */}
      {tab === "neo" && (
        neos.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            No Near-Earth Objects currently tracked.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {neos.map((n, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  n.hazardous
                    ? "border-red-500/20 bg-red-500/[0.04]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-zinc-100">{n.name}</p>
                  {n.hazardous && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-red-400">
                      Potentially Hazardous
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                  <span>Diameter: <span className="font-mono text-zinc-300">{n.diameter_m}m</span></span>
                  <span>Closest: <span className="font-mono text-zinc-300">{n.closest_approach_au} AU</span></span>
                  <span>Velocity: <span className="font-mono text-zinc-300">{n.velocity_kms} km/s</span></span>
                  <span>Date: <span className="font-mono text-zinc-300">{n.date}</span></span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Comets tab */}
      {tab === "comets" && (
        comets.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            No Comets currently visible in the sky.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {comets.map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  c.visible
                    ? "border-purple-500/20 bg-purple-500/[0.04]"
                    : "border-white/10 bg-white/[0.03] opacity-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-zinc-100">{c.name}</p>
                  {c.visible && (
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-green-400">
                      Visible
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                  <span>Mag <span className="font-mono text-zinc-300">{c.magnitude}</span></span>
                  <span>In <span className="font-mono text-zinc-300">{c.constellation}</span></span>
                  <span>Perihelion: <span className="font-mono text-zinc-300">{c.perihelion_date}</span></span>
                </div>
                {c.description && (
                  <p className="text-xs text-zinc-500 mt-1.5 italic">{c.description}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
      </div>
    </section>
  );
}
