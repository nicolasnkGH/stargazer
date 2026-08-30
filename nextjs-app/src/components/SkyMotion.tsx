"use client";

import { useState } from "react";
import useSWR from "swr";
import Icon from "./Icon";
import MotionFactCard from "./MotionFactCard";
import type { IssPass, MeteorShower, CometData, NeoObject } from "@/types";
import { API_BASE } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TABS = [
  { key: "iss", label: "ISS Passes", icon: "orbit" },
  { key: "meteors", label: "Meteor Showers", icon: "sparkles" },
  { key: "comets", label: "Comets", icon: "sparkles" },
  { key: "neo", label: "Asteroids (NEOs)", icon: "circle-dot" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function SkyMotion() {
  const [tab, setTab] = useState<TabKey>("iss");

  const { data: issData } = useSWR<{ passes?: IssPass[] }>(
    `${API_BASE}/iss`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: meteorsData } = useSWR<{ showers?: MeteorShower[] }>(
    `${API_BASE}/meteors`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: cometsData } = useSWR<{ comets?: CometData[] }>(
    `${API_BASE}/comets`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: neoData } = useSWR<{ neos?: NeoObject[] }>(
    `${API_BASE}/asteroids`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const passes = issData?.passes ?? [];
  const visiblePasses = passes.filter((p) => p.visible);
  const meteors = meteorsData?.showers ?? [];
  const comets = cometsData?.comets ?? [];
  const neos = neoData?.neos ?? [];

  return (
    <section id="card-sky-motion" className="card flex-1 min-w-[280px] border border-cyan-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">Objects in Motion</h2>
        </div>
      </div>

      <div className="card-body p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5 pb-3 border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                tab === t.key
                  ? "bg-cyan-950/80 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <Icon name={t.icon} className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ISS Passes tab */}
        {tab === "iss" && (
          <div className="space-y-3">
            <MotionFactCard type="iss" />
            {visiblePasses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No ISS passes visible right now. Check back later!
              </div>
            ) : (
              <div className="space-y-3">
                {passes.map((p, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 transition-all shadow-md ${
                      p.visible
                        ? "border-emerald-500/40 bg-slate-950/80"
                        : "border-white/10 bg-slate-950/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🛰️</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-100">ISS Pass #{i + 1}</p>
                          {p.visible && (
                            <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                              Visible
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                          <span>Rise: <span className="font-mono text-cyan-300 font-bold">{formatTime(p.rise)}</span></span>
                          <span>Set: <span className="font-mono text-cyan-300 font-bold">{formatTime(p.set)}</span></span>
                          <span>Peak: <span className="font-mono text-amber-300 font-bold">{p.peak_alt}° {p.peak_az}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEO tab */}
        {tab === "neo" && (
          neos.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              No Near-Earth Objects currently tracked.
            </div>
          ) : (
            <div className="space-y-3">
              {neos.map((n, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-md ${
                    n.hazardous
                      ? "border-red-500/40 bg-red-950/30"
                      : "border-white/10 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-100">{n.name}</p>
                    {n.hazardous && (
                      <span className="rounded bg-red-950/80 border border-red-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-red-300">
                        Potentially Hazardous
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 mt-2">
                    <div>
                      <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">Diameter</span>
                      <span className="font-mono text-cyan-300 font-bold">{n.diameter_m}m</span>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">Closest</span>
                      <span className="font-mono text-amber-300 font-bold">{n.closest_approach_au} AU</span>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">Velocity</span>
                      <span className="font-mono text-purple-300 font-bold">{n.velocity_kms} km/s</span>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">Date</span>
                      <span className="font-mono text-slate-200 font-semibold">{n.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Comets tab */}
        {tab === "comets" && (
          <div className="space-y-3">
            <MotionFactCard type="comet" />
            {comets.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No Comets currently visible in the sky.
              </div>
            ) : (
              <div className="space-y-3">
                {comets.map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 shadow-md ${
                      c.visible
                        ? "border-purple-500/40 bg-slate-950/80"
                        : "border-white/10 bg-slate-950/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-100">{c.name}</p>
                      {c.visible && (
                        <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                          Visible
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                      <span>Mag <span className="font-mono text-amber-300 font-bold">{c.magnitude}</span></span>
                      <span>In <span className="font-mono text-cyan-300 font-bold">{c.constellation}</span></span>
                      <span>Perihelion: <span className="font-mono text-slate-300">{c.perihelion_date}</span></span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-slate-300 mt-2 italic leading-relaxed">{c.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meteor Showers tab */}
        {tab === "meteors" && (
          meteors.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              Failed to load meteor shower schedule.
            </div>
          ) : (
            <div className="space-y-3">
              {meteors.map((s, i) => {
                const countdown = s.days_until_peak === 0 ? "Peaks tonight" : s.days_until_peak === 1 ? "Peaks tomorrow" : `Peaks in ${s.days_until_peak} days`;
                return (
                  <div
                    key={s.code}
                    className={`rounded-2xl border p-4 shadow-md ${
                      i === 0 ? "border-cyan-400/50 bg-slate-950/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-white/10 bg-slate-950/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>💫</span>
                        <span>{s.name}</span>
                        {i === 0 && (
                          <span className="rounded bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide font-bold text-cyan-300">
                            NEXT UP
                          </span>
                        )}
                      </p>
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-md">
                        ZHR ~{s.zhr}/hr
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-cyan-300">{s.peak_date}</span>
                      <span>·</span>
                      <span className="text-amber-300 font-semibold">{countdown}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Active: {s.activity_period} · Best: {s.hemisphere} Hem. · Parent: {s.parent_body}
                    </div>
                    {s.notes && <p className="text-xs text-slate-300 mt-2 italic leading-relaxed">{s.notes}</p>}
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
