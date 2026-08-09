"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import type { CatalogTarget, GalleryCounts } from "@/types";
import { API_BASE, CONSTELLATION_FILTERS, BORTLE_CLASSES, BORTLE_STORAGE_KEY } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import GalleryButton from "./GalleryButton";

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
    return (t.magnitude ?? 99) <= 6 || type.includes("open cluster");
  }
  if (equip === "binos") {
    return t.difficulty === "naked_eye" || t.difficulty === "easy" || (t.magnitude ?? 99) <= 7;
  }
  return true;
}

export default function TargetDatabase() {
  const translate = useTranslations();
  const [targets, setTargets] = useState<CatalogTarget[]>([]);
  const [filter, setFilter] = useState("Sco");
  const [typeFilter, setTypeFilter] = useState("all");
  const [equipFilter, setEquipFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [sortVal, setSortVal] = useState<string>("default");
  const [activeBortle, setActiveBortle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: galleryCounts } = useSWR<GalleryCounts>(`${API_BASE}/gallery/counts`, galleryFetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveBortle(localStorage.getItem(BORTLE_STORAGE_KEY));
  }, []);

  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch(`${API_BASE}/targets?constellation=${filter}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTargets(data.targets || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch targets");
      } finally {
        setLoading(false);
      }
    }
    fetchTargets();
  }, [filter]);

  const filteredTargets = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    const bortleLimit = activeBortle ? parseInt(activeBortle, 10) : null;

    let result = targets.filter((t) => {
      let typeMatch = true;
      if (typeFilter !== "all") {
        if (typeFilter === "has-images") {
          typeMatch = !!(galleryCounts && galleryCounts[t.id]);
        } else {
          typeMatch = (t.type ?? "").toLowerCase().includes(typeFilter);
        }
      }
      const equipMatch = matchesEquipment(t, equipFilter);
      const nameMatch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q);
      const bortleMatch = bortleLimit == null || bortleLimit <= (t.bortle_min ?? 9);
      return typeMatch && equipMatch && nameMatch && bortleMatch;
    });

    if (sortVal === "visibility") {
      result = [...result].sort((a, b) => (b.altitude_deg ?? -90) - (a.altitude_deg ?? -90));
    } else if (sortVal === "magnitude") {
      result = [...result].sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
    } else if (sortVal === "name") {
      result = [...result].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    }

    return result;
  }, [targets, typeFilter, equipFilter, nameQuery, sortVal, activeBortle, galleryCounts]);

  function clearBortleFilter() {
    localStorage.removeItem(BORTLE_STORAGE_KEY);
    setActiveBortle(null);
  }

  if (loading) {
    return (
      <section id="card-targets" className="w-full">
        <div className="card animate-pulse p-5">
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

  const bortleInfo = activeBortle ? BORTLE_CLASSES[activeBortle] : null;

  return (
    <section id="card-targets" className="card w-full">
      <div className="card-header flex-wrap gap-2">
        <Icon name="binoculars" className="h-5 w-5 text-sky-400" />
        <h2>Target Database</h2>
      </div>
      <div className="card-body">

      {/* Equipment filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <span className="text-xs text-zinc-400 mr-1">Equipment:</span>
        {EQUIPMENT_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setEquipFilter(o.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              equipFilter === o.value
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-xs text-zinc-400 mr-1">Object:</span>
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setTypeFilter(o.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === o.value
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300"
            }`}
          >
            {translate(o.key)}
          </button>
        ))}
      </div>

      {/* Name search + sort */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <span className="text-xs text-zinc-400">🎯 Filter Target Name:</span>
        <input
          type="text"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="Type object name (e.g. M31, Mars, Ring)..."
          className="rounded-lg bg-black/40 border border-white/15 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none max-w-[260px]"
        />
        <span className="text-xs text-zinc-400 ml-2">↕ Sort:</span>
        <select
          value={sortVal}
          onChange={(e) => setSortVal(e.target.value)}
          className="rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-sm text-zinc-100 outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Constellation filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CONSTELLATION_FILTERS.map((c) => (
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

      {activeBortle && bortleInfo && (
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-gradient-to-r from-sky-500/25 to-indigo-500/25 border border-sky-500/40 px-4 py-3 mb-4 text-sm text-white">
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
        <div className="py-8 text-center text-sm text-zinc-400">
          No targets found for {filter}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredTargets.map((t) => (
            <div key={t.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-4 flex items-start gap-3">
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
                {(t.description || t.notes) && (
                  <p className="text-xs text-zinc-500 mt-1.5 italic">{t.description ?? t.notes}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <GalleryButton targetId={t.id} targetName={t.name} />
                  <button
                    onClick={() => {
                      const err = addToPlan(t.id, `${t.emoji ?? "🔭"} ${t.name}`);
                      if (err) alert(err);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                  >
                    {translate("btn_add_to_plan")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
