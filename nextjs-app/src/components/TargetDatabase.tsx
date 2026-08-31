"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { CatalogTarget, GalleryCounts } from "@/types";
import { API_BASE, CONSTELLATION_FILTERS, BORTLE_CLASSES, BORTLE_STORAGE_KEY } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import { showToast } from "@/lib/toast";
import GalleryButton from "./GalleryButton";
import FovModal from "./FovModal";

const galleryFetcher = (url: string) => fetch(url).then((r) => r.json());

const EQUIPMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "seestar", label: "Seestar" },
  { value: "dslr", label: "DSLR" },
  { value: "binos", label: "Binoculars" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", key: "filter_all" },
  { value: "globular", key: "filter_globular" },
  { value: "open", key: "filter_open" },
  { value: "double", key: "filter_double" },
  { value: "star", key: "filter_stars" },
  { value: "galaxy", key: "filter_galaxy" },
  { value: "has-images", key: "filter_has_images" },
] as const;

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "visibility", label: "🔭 In View Now First" },
  { value: "magnitude", label: "✨ Brightest First" },
  { value: "name", label: "🔤 Name (A–Z)" },
] as const;

function matchesEquipment(t: CatalogTarget, equip: string): boolean {
  if (equip === "all") return true;
  const type = t.type?.toLowerCase() ?? "";
  if (equip === "seestar") {
    return ["galaxy", "nebula", "globular cluster", "open cluster"].some((k) => type.includes(k));
  }
  if (equip === "dslr") {
    return ["nebula", "galaxy", "open cluster"].some((k) => type.includes(k));
  }
  if (equip === "binos") {
    return (t.magnitude ?? 99) <= 7.5 || ["open cluster", "star"].some((k) => type.includes(k));
  }
  return true;
}

function matchesType(t: CatalogTarget, type: string, counts: GalleryCounts | undefined): boolean {
  if (type === "all") return true;
  if (type === "has-images") return !!counts && (counts[t.id] ?? 0) > 0;
  const targetType = t.type?.toLowerCase() ?? "";
  if (type === "globular") return targetType.includes("globular");
  if (type === "open") return targetType.includes("open");
  if (type === "double") return targetType.includes("double");
  if (type === "star") return targetType.includes("star") && !targetType.includes("cluster");
  if (type === "galaxy") return targetType.includes("galaxy");
  return true;
}

export default function TargetDatabase() {
  const translate = useTranslations();

  const [targets, setTargets] = useState<CatalogTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>("Visible Now (My Sky)");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [equipFilter, setEquipFilter] = useState<string>("all");
  const [nameQuery, setNameQuery] = useState("");
  const [sortVal, setSortVal] = useState("default");
  const [activeBortle, setActiveBortle] = useState<number | null>(null);
  const [fovTarget, setFovTarget] = useState<CatalogTarget | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(6);
  const constPillsRef = useRef<HTMLDivElement>(null);

  const scrollPills = (dir: "left" | "right") => {
    if (constPillsRef.current) {
      constPillsRef.current.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
    }
  };

  const { data: galleryCounts } = useSWR<GalleryCounts>(`${API_BASE}/gallery/counts`, galleryFetcher, {
    revalidateOnFocus: false,
  });

  // Reset pagination count on filter change
  useEffect(() => {
    setTimeout(() => setDisplayedCount(6), 0);
  }, [filter, typeFilter, equipFilter, nameQuery, sortVal]);

  // Listen for sg-select-constellation custom event from ConstellationsTonight cards & Interactive Constellation Map
  useEffect(() => {
    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const constName = detail.name || detail.abbr;
        if (constName) {
          setFilter(constName);
          setTimeout(() => setDisplayedCount(6), 0);
        }
      }
    };
    window.addEventListener("sg-select-constellation", handleSelect);
    return () => window.removeEventListener("sg-select-constellation", handleSelect);
  }, []);

  useEffect(() => {
    const storedBortle = localStorage.getItem(BORTLE_STORAGE_KEY);
    if (storedBortle) {
      const b = parseInt(storedBortle, 10);
      if (!isNaN(b) && b >= 1 && b <= 9) setTimeout(() => setActiveBortle(b), 0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTargets() {
      setLoading(true);
      setError(null);
      try {
        let url = `${API_BASE}/targets`;
        if (filter === "Visible Now (My Sky)") {
          url = `${API_BASE}/targets?constellation=all&visible_only=true`;
        } else if (filter === "All Constellations (Full DB)") {
          url = `${API_BASE}/targets?constellation=all`;
        } else {
          url = `${API_BASE}/targets?constellation=${encodeURIComponent(filter)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTargets(data.targets || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch targets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTargets();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const filteredTargets = useMemo(() => {
    let result = targets;

    if (activeBortle != null) {
      result = result.filter((t) => t.bortle_class == null || t.bortle_class >= activeBortle);
    }

    result = result.filter((t) => matchesEquipment(t, equipFilter));

    result = result.filter((t) => matchesType(t, typeFilter, galleryCounts));

    if (nameQuery.trim()) {
      const q = nameQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.type && t.type.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (sortVal === "visibility") {
      result = [...result].sort((a, b) => (b.altitude_deg ?? -90) - (a.altitude_deg ?? -90));
    } else if (sortVal === "magnitude") {
      result = [...result].sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
    } else if (sortVal === "name") {
      result = [...result].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    }

    return result;
  }, [targets, typeFilter, equipFilter, nameQuery, sortVal, activeBortle, galleryCounts]);

  const visibleSubset = filteredTargets.slice(0, displayedCount);

  function clearBortleFilter() {
    localStorage.removeItem(BORTLE_STORAGE_KEY);
    setActiveBortle(null);
  }

  if (loading) {
    return (
      <section id="card-targets" className="w-full mb-8">
        <div className="card animate-pulse p-6 bg-slate-900/90 border border-white/10 rounded-2xl">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-40 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="card-targets" className="w-full mb-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      </section>
    );
  }

  const bortleInfo = activeBortle ? BORTLE_CLASSES[activeBortle] : null;

  return (
    <section id="card-targets" className="card w-full mb-8 border border-cyan-500/20 bg-slate-900/90 shadow-xl">
      {/* Dynamic 1:1 Vanilla Section Header */}
      <div className="card-header flex-wrap gap-2 border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="binoculars" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {filter === "Visible Now (My Sky)"
              ? "🌟 All Targets Visible Now"
              : filter === "All Constellations (Full DB)"
              ? "🌌 All Targets (Full Database)"
              : `✨ ${filter} Must-See Targets`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="OpenNGC, Messier & Caldwell"
            description="Comprehensive astronomical deep-sky target database combining OpenNGC, Messier, and Caldwell catalogs with real-time topocentric altitude, azimuth, Bortle visibility limits, and transit times."
            attribution="OpenNGC / SEDS Messier / Skyfield"
          />
          <span className="text-xs text-slate-400 font-mono">
            Showing {visibleSubset.length} of {filteredTargets.length} targets
          </span>
        </div>
      </div>

      <div className="card-body p-6">
        {/* Equipment filter */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-xs text-slate-400 font-semibold mr-1">Equipment:</span>
          {EQUIPMENT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setEquipFilter(o.value)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                equipFilter === o.value
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Object Type filter */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-xs text-slate-400 font-semibold mr-1">Object:</span>
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setTypeFilter(o.value)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === o.value
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {translate(o.key)}
            </button>
          ))}
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl bg-slate-950/60 border border-white/10">
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="text-xs text-slate-400 font-semibold">🔍 Search Constellation:</span>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Type constellation name..."
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[260px]">
            <span className="text-xs text-slate-400 font-semibold">🎯 Filter Target Name:</span>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Type object name (e.g. M31, Mars, Ring)..."
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">↕ Sort:</span>
            <select
              value={sortVal}
              onChange={(e) => setSortVal(e.target.value)}
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Constellation Filters Carousel with Scroll Controls and Edge Mask */}
        <div className="relative mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <span>🌌</span> Constellation Filter:
            </span>
            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollPills("left")}
                className="h-6 w-6 rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="Scroll left"
                aria-label="Scroll constellations left"
              >
                ‹
              </button>
              <span className="text-[0.62rem] font-mono text-zinc-500 px-1 select-none">Swipe / Scroll</span>
              <button
                onClick={() => scrollPills("right")}
                className="h-6 w-6 rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="Scroll right"
                aria-label="Scroll constellations right"
              >
                ›
              </button>
            </div>
          </div>

          <div
            ref={constPillsRef}
            style={{
              maskImage: "linear-gradient(to right, black 88%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 88%, transparent 100%)",
            }}
            className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none"
          >
            <button
              onClick={() => setFilter("Visible Now (My Sky)")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 cursor-pointer ${
                filter === "Visible Now (My Sky)"
                  ? "border-green-500 bg-green-950/70 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              🌟 Visible Now (My Sky)
            </button>

            <button
              onClick={() => setFilter("All Constellations (Full DB)")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 cursor-pointer ${
                filter === "All Constellations (Full DB)"
                  ? "border-purple-500 bg-purple-950/70 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              🌌 All Constellations (Full DB)
            </button>

            {CONSTELLATION_FILTERS.slice(2).map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 cursor-pointer ${
                  filter === c
                    ? "border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-5 italic flex items-center gap-1.5">
          <Icon name="telescope" className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
          <span>Visibility depends on local sky conditions, light pollution, and your equipment. This database highlights the most prominent targets for amateur stargazers.</span>
        </p>

        {activeBortle && bortleInfo && (
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl bg-gradient-to-r from-sky-500/25 to-indigo-500/25 border border-sky-500/40 px-4 py-3 mb-5 text-sm text-white">
            <span>
              ✨ Filtering by targets observable under <strong>Bortle Class {activeBortle}</strong> ({bortleInfo.shortDesc}).
            </span>
            <button
              onClick={clearBortleFilter}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/85 border border-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
            >
              ✖ Show All Targets
            </button>
          </div>
        )}

        {filteredTargets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No targets found for <span className="text-white font-semibold">{filter}</span>.
          </div>
        ) : (
          <>
            {/* 2-Column Grid Layout (1:1 Vanilla Build Port) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {visibleSubset.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 flex flex-col justify-between shadow-lg hover:border-cyan-400/40 transition-all group"
                >
                  <div>
                    {/* Top Header: Icon + Title + mag badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl text-amber-400 font-serif flex-shrink-0">
                          {t.emoji ?? "🔭"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-400">{t.type ?? "Astronomical Target"}</p>
                        </div>
                      </div>
                      {t.magnitude != null && (
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex-shrink-0">
                          mag {t.magnitude}
                        </span>
                      )}
                    </div>

                    {/* Description / Notes */}
                    {(t.description || t.notes) && (
                      <p className="text-xs text-slate-300 leading-relaxed mt-2.5 mb-4">
                        {t.description ?? t.notes}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {t.ra_hours != null && t.dec_degrees != null && (
                        <button
                          onClick={() => setFovTarget(t)}
                          className="rounded-lg border border-purple-500/40 bg-purple-950/50 hover:bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all active:scale-95 shadow-sm"
                        >
                          Simulate View 🔭
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const err = addToPlan(t.id, `${t.emoji ?? "🔭"} ${t.name}`);
                          if (err) showToast(err);
                        }}
                        className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-all active:scale-95 shadow-sm"
                      >
                        Add to Plan +
                      </button>
                      <GalleryButton targetId={t.id} targetName={t.name} />
                    </div>

                    {/* Badges & Footer Telemetry */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300 uppercase">
                          {t.type?.toLowerCase().includes("binocular") ? "BINOCULARS" : "TELESCOPE"}
                        </span>
                        <span className="rounded bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                          ✨ Bortle 6 Observable
                        </span>
                        <span className="rounded bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-sky-300 uppercase">
                          {t.magnitude != null && t.magnitude < 5 ? "EASY" : t.magnitude != null && t.magnitude < 9 ? "MODERATE" : "CHALLENGING"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.7rem] text-slate-400">
                          Alt: {t.altitude_deg != null ? Math.round(t.altitude_deg) + "°" : "60°"} · Az: {t.azimuth_deg != null ? Math.round(t.azimuth_deg) + "°" : "180°"}
                        </span>
                        {t.is_daytime ? (
                          <span className="rounded bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300">
                            ☀️ Daylight (Sunlit Sky)
                          </span>
                        ) : t.altitude_deg != null && t.altitude_deg < 0 ? (
                          <span className="rounded bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-red-300">
                            🔴 Below Horizon
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                            🌙 Dark Sky
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Targets Button */}
            {filteredTargets.length > displayedCount && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={() => setDisplayedCount((prev) => prev + 6)}
                  className="flex items-center gap-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all cursor-pointer active:scale-95"
                >
                  <span>Load More Targets 🔭</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {fovTarget && fovTarget.ra_hours != null && fovTarget.dec_degrees != null && (
        <FovModal
          open
          onClose={() => setFovTarget(null)}
          raDeg={fovTarget.ra_hours * 15}
          decDeg={fovTarget.dec_degrees}
          targetName={fovTarget.name}
        />
      )}
    </section>
  );
}
