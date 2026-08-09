"use client";

import { useState, useEffect } from "react";
import type { IssPass, NeoObject, CometData, MeteorShower } from "@/types";
import { API_BASE, TABS } from "@/lib/constants";
import MotionFactCard from "./MotionFactCard";
import Icon from "./Icon";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function SkyMotion() {
  const [tab, setTab] = useState("iss");
  const [passes, setPasses] = useState<IssPass[]>([]);
  const [neos, setNeos] = useState<NeoObject[]>([]);
  const [comets, setComets] = useState<CometData[]>([]);
  const [meteors, setMeteors] = useState<MeteorShower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [issRes, neoRes, meteorsRes] = await Promise.all([
          fetch(`${API_BASE}/iss?count=3`),
          fetch(`${API_BASE}/asteroids?limit=5`),
          fetch(`${API_BASE}/meteors?count=5`),
        ]);
        if (issRes.ok) {
          const issData = await issRes.json();
          setPasses(issData.passes || []);
        }
        if (neoRes.ok) setNeos(await neoRes.json());
        if (meteorsRes.ok) {
          const meteorsData = await meteorsRes.json();
          setMeteors(meteorsData.showers || []);
        }
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
        <Icon name="rocket" className="h-5 w-5 text-sky-400" />
        <h2>Sky Objects in Motion</h2>
      </div>
      <div className="card-body">

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300"
            }`}
          >
            <Icon name={t.icon} className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ISS Passes tab */}
      {tab === "iss" && (
        <>
        <MotionFactCard type="iss" />
        {visiblePasses.length === 0 ? (
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
        )}
        </>
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
        <>
        <MotionFactCard type="comet" />
        {comets.length === 0 ? (
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
        )}
        </>
      )}

      {/* Meteor Showers tab */}
      {tab === "meteors" && (
        meteors.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            Failed to load meteor shower schedule.
          </div>
        ) : (
          <div id="meteors-list" className="flex flex-col gap-2">
            {meteors.map((s, i) => {
              const peak = new Date(`${s.peak_date}T00:00:00Z`);
              const peakLabel = peak.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
              const countdown = s.days_until_peak === 0 ? "Peaks tonight" : s.days_until_peak === 1 ? "Peaks tomorrow" : `Peaks in ${s.days_until_peak} days`;
              return (
                <div
                  key={s.code}
                  className={`rounded-xl border p-4 ${
                    i === 0 ? "border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]" : "border-white/10"
                  } bg-white/[0.03]`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-100">
                      💫 {s.name}
                      {i === 0 && (
                        <span className="ml-1.5 rounded bg-sky-500/[0.15] px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-sky-400">
                          Next
                        </span>
                      )}
                    </p>
                    <span className="font-mono text-sm text-purple-400">ZHR ~{s.zhr}/hr</span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    <span className="text-sky-400">{peakLabel}</span> · <span className="text-zinc-400">{countdown}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Active: {s.activity_period} · Best: {s.hemisphere} Hem. · Parent: {s.parent_body}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1.5 italic">{s.notes}</p>
                </div>
              );
            })}
          </div>
        )
      )}
      </div>
    </section>
  );
}
