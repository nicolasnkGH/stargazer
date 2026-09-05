"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import MotionFactCard from "./MotionFactCard";
import SourceTooltip from "./SourceTooltip";
import type { IssPass, MeteorShower, CometData, NeoObject } from "@/types";
import { API_BASE } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TABS = [
  { key: "iss", labelKey: "tab_iss_passes", icon: "orbit" },
  { key: "meteors", labelKey: "tab_meteor_showers", icon: "sparkles" },
  { key: "comets", labelKey: "tab_comets", icon: "sparkles" },
  { key: "neo", labelKey: "tab_asteroids", icon: "circle-dot" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatTime(str: string | undefined): string {
  if (!str) return "--:--";
  const trimmed = str.trim();
  if (/^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return trimmed;
  }
}

export default function SkyMotion() {
  const t = useTranslations();
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
    <section id="card-motion" className="card flex-1 min-w-[280px] border border-cyan-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">{t("objects_in_motion")}</h2>
        </div>
        <SourceTooltip
          source="NORAD & NASA CNEOS"
          description={t("source_skymotion_desc")}
          attribution={t("source_skymotion_attr")}
        />
      </div>

      <div className="card-body p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5 pb-3 border-b border-white/10">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                tab === tb.key
                  ? "bg-cyan-950/80 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <Icon name={tb.icon} className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t(tb.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Container with fixed height to match other dashboard cards */}
        <div className="flex-grow overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent max-h-[300px] min-h-[300px]">
          {/* ISS Passes tab */}
          {tab === "iss" && (
            <div className="space-y-3">
              <MotionFactCard type="iss" />
              {visiblePasses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  {t("iss_no_passes")}
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
                            <p className="text-xs sm:text-sm font-bold text-slate-100">{t("iss_pass_num", { num: i + 1 })}</p>
                            {p.visible && (
                              <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                                {t("badge_visible")}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                            <span>{t("lbl_rise")} <span className="font-mono text-cyan-300 font-bold">{formatTime(p.rise)}</span></span>
                            <span>{t("lbl_set")} <span className="font-mono text-cyan-300 font-bold">{formatTime(p.set)}</span></span>
                            <span>{t("lbl_peak")} <span className="font-mono text-amber-300 font-bold">{p.peak_alt}° {p.peak_az}</span></span>
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
                {t("neo_none_tracked")}
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
                          {t("neo_hazardous")}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 mt-2">
                      <div>
                        <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">{t("lbl_diameter")}</span>
                        <span className="font-mono text-cyan-300 font-bold">{n.diameter_m}m</span>
                      </div>
                      <div>
                        <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">{t("lbl_closest")}</span>
                        <span className="font-mono text-amber-300 font-bold">{n.closest_approach_au} AU</span>
                      </div>
                      <div>
                        <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">{t("lbl_velocity")}</span>
                        <span className="font-mono text-purple-300 font-bold">{n.velocity_kms} km/s</span>
                      </div>
                      <div>
                        <span className="text-[0.65rem] text-slate-400 block uppercase font-semibold">{t("lbl_date")}</span>
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
                  {t("comets_none_visible")}
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
                            {t("badge_visible")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                        <span>{t("lbl_mag")} <span className="font-mono text-amber-300 font-bold">{c.magnitude}</span></span>
                        <span>{t("lbl_in")} <span className="font-mono text-cyan-300 font-bold">{c.constellation}</span></span>
                        <span>{t("lbl_perihelion")} <span className="font-mono text-slate-300">{c.perihelion_date}</span></span>
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
                  const countdown = s.days_until_peak === 0 ? t("peaks_tonight") : s.days_until_peak === 1 ? t("peaks_tomorrow") : t("peaks_in_days", { days: s.days_until_peak });
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
                              {t("badge_next_up")}
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
                        {t("lbl_active")} {s.activity_period} · {t("lbl_best")} {s.hemisphere} Hem. · {t("lbl_parent")} {s.parent_body}
                      </div>
                      {s.notes && <p className="text-xs text-slate-300 mt-2 italic leading-relaxed">{s.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
