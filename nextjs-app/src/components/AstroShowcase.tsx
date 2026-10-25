"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import Icon from "./Icon";
import AstroLightbox from "./AstroLightbox";
import GalleryModal from "./GalleryModal";
import { API_BASE } from "@/lib/constants";
import type { GalleryEntry } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

const TYPE_PILLS = [
  { id: "all", label: "All Objects" },
  { id: "nebula", label: "Nebulae 🌌" },
  { id: "galaxy", label: "Galaxies 🌀" },
  { id: "solar", label: "Solar System 🪐" },
  { id: "mosaic", label: "Mosaics 🧩" },
] as const;

export default function AstroShowcase() {
  const t = useTranslations();
  const { data: entries, error, isLoading, mutate } = useSWR<GalleryEntry[]>(
    `${API_BASE}/gallery`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [equipFilter, setEquipFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Lightbox selection
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload modal trigger
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    const handleShowcaseNav = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId?: string; targetName?: string }>;
      const name = customEv.detail?.targetName || customEv.detail?.targetId;
      if (name) {
        setSearchQuery(name);
        setTypeFilter("all");
        setEquipFilter("all");
      }
    };
    window.addEventListener("sg-navigate-showcase", handleShowcaseNav);
    return () => window.removeEventListener("sg-navigate-showcase", handleShowcaseNav);
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      // Type filter
      if (typeFilter !== "all") {
        const name = (e.target_name || "").toLowerCase();
        const comment = (e.comment || "").toLowerCase();
        const details = (e.exposure_details || "").toLowerCase();
        if (typeFilter === "nebula") {
          const isNeb = name.includes("nebula") || name.includes("ngc 7000") || name.includes("ic 1396") || name.includes("m42") || name.includes("veil") || comment.includes("nebula");
          if (!isNeb) return false;
        } else if (typeFilter === "galaxy") {
          const isGal = name.includes("galaxy") || name.includes("m31") || name.includes("m81") || name.includes("m82") || name.includes("m51") || comment.includes("galaxy");
          if (!isGal) return false;
        } else if (typeFilter === "solar") {
          const isSol = name.includes("moon") || name.includes("jupiter") || name.includes("saturn") || name.includes("mars") || name.includes("sun") || name.includes("venus");
          if (!isSol) return false;
        } else if (typeFilter === "mosaic") {
          const isMos = details.includes("mosaic") || comment.includes("mosaic") || (e.notes || "").toLowerCase().includes("mosaic");
          if (!isMos) return false;
        }
      }

      // Equipment filter
      if (equipFilter !== "all") {
        const gear = (e.equipment || e.gear || "").toLowerCase();
        if (!gear.includes(equipFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (e.target_name || "").toLowerCase().includes(q) ||
          (e.author || "").toLowerCase().includes(q) ||
          (e.equipment || e.gear || "").toLowerCase().includes(q) ||
          (e.comment || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [entries, typeFilter, equipFilter, searchQuery]);

  const activeEntry = lightboxIndex !== null && filteredEntries[lightboxIndex] ? filteredEntries[lightboxIndex] : null;

  return (
    <section id="card-showcase" className="w-full space-y-6">
      {/* Header & Controls Card */}
      <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/30 via-slate-950/80 to-slate-950/90 p-5 sm:p-7 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Icon name="camera" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  {t("showcase_title")}
                </h2>
                <p className="text-xs sm:text-sm text-purple-200/70 font-mono">
                  {t("showcase_subtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60 px-4 py-2.5 text-xs font-bold text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:border-purple-400/60 transition-all cursor-pointer active:scale-95"
            >
              <Icon name="lock" className="h-3.5 w-3.5 text-purple-400" />
              <span>{t("btn_add_capture_owner")}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Object Type Pills + Equipment Dropdown + Search Input */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Object Type Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {TYPE_PILLS.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setTypeFilter(pill.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  typeFilter === pill.id
                    ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/60"
                    : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Equipment Filter & Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">🔭 All Optics</option>
              <option value="dwarf">DWARF 3</option>
              <option value="sct">5&quot; SCT (1250mm)</option>
              <option value="130eq">130EQ Newton</option>
              <option value="seestar">Seestar S50</option>
              <option value="dslr">DSLR Camera</option>
            </select>

            <div className="relative flex-1 sm:w-48">
              <input
                type="text"
                placeholder="Search object, gear, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40"
              />
              <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Display: Masonry / Bento Cards */}
      {isLoading && (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Loading Astrophotography Showcase...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center text-sm text-red-300">
          Failed to load gallery exposures. Please refresh or check connection.
        </div>
      )}

      {!isLoading && !error && filteredEntries.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-12 text-center flex flex-col items-center gap-3">
          <span className="text-4xl">🌌</span>
          <h3 className="text-lg font-bold text-white">{t("showcase_empty_title")}</h3>
          <p className="text-xs text-zinc-400 max-w-md">
            {t("showcase_empty_desc")}
          </p>
          <button
            onClick={() => {
              setTypeFilter("all");
              setEquipFilter("all");
              setSearchQuery("");
              setUploadModalOpen(true);
            }}
            className="mt-2 flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-600/30 px-5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-600/50 transition-all cursor-pointer"
          >
            <Icon name="lock" className="h-3.5 w-3.5 text-purple-400" />
            <span>{t("btn_add_capture_owner")}</span>
          </button>
        </div>
      )}

      {!isLoading && !error && filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEntries.map((entry, idx) => (
            <div
              key={entry.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative rounded-2xl border border-white/10 bg-slate-950/80 hover:bg-slate-900/90 hover:border-purple-500/50 p-3 flex flex-col gap-2.5 transition-all cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:-translate-y-1"
            >
              {/* Photo Viewport */}
              <div className="relative aspect-[4/3] w-full rounded-xl bg-black overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_BASE}/gallery/image/${entry.id}`}
                  alt={entry.target_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Glassmorphic Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                  {entry.has_raw_preview && (
                    <span className="rounded-lg bg-black/80 border border-cyan-400/60 px-2 py-0.5 text-[0.65rem] font-bold font-mono text-cyan-300 backdrop-blur-md shadow-lg flex items-center gap-1">
                      <span>⚡</span> Before / After
                    </span>
                  )}
                  {entry.filter && (
                    <span className="rounded-lg bg-black/80 border border-emerald-400/50 px-2 py-0.5 text-[0.65rem] font-semibold font-mono text-emerald-300 backdrop-blur-md">
                      {entry.filter}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 right-2.5">
                  {entry.total_integration && (
                    <span className="rounded-lg bg-black/85 border border-amber-400/60 px-2 py-0.5 text-[0.68rem] font-bold font-mono text-amber-300 backdrop-blur-md shadow-lg">
                      ⏱️ {entry.total_integration}
                    </span>
                  )}
                </div>
              </div>

              {/* Telemetry Summary */}
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white text-sm truncate group-hover:text-purple-300 transition-colors">
                    {entry.target_name}
                  </h3>
                  {entry.gain_iso && (
                    <span className="text-[0.65rem] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.2 rounded">
                      {entry.gain_iso}
                    </span>
                  )}
                </div>

                <p className="text-xs text-purple-200/70 font-mono truncate">
                  🔭 {entry.equipment || entry.gear || "Telescope Setup"}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[0.7rem] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1 truncate max-w-[130px]">
                    <Icon name="user" className="h-3 w-3 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{entry.author}</span>
                  </span>
                  <span>📅 {entry.capture_date || entry.created_at.split(" ")[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AstroLightbox Full-Screen Viewer */}
      {activeEntry && (
        <AstroLightbox
          entry={activeEntry}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex !== null && lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={
            lightboxIndex !== null && lightboxIndex < filteredEntries.length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : undefined
          }
          onReport={() => mutate()}
          onDelete={() => {
            mutate();
            setLightboxIndex(null);
          }}
        />
      )}

      {/* Upload Modal (Global invocation) */}
      <GalleryModal
        targetId=""
        targetName=""
        initialTab="upload"
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          mutate();
        }}
        availableTargets={[
          { id: "m42", name: "Orion Nebula (M42)" },
          { id: "m31", name: "Andromeda Galaxy (M31)" },
          { id: "m33", name: "Triangulum Galaxy (M33)" },
          { id: "m45", name: "Pleiades Star Cluster (M45)" },
          { id: "m81", name: "Bode's Galaxy (M81)" },
          { id: "m82", name: "Cigar Galaxy (M82)" },
          { id: "m51", name: "Whirlpool Galaxy (M51)" },
          { id: "m101", name: "Pinwheel Galaxy (M101)" },
          { id: "ngc2244", name: "Rosette Nebula (NGC 2244)" },
          { id: "ic1396", name: "Elephant's Trunk (IC 1396)" },
          { id: "ngc7000", name: "North America Nebula (NGC 7000)" },
          { id: "ic434", name: "Horsehead & Flame Nebula (IC 434)" },
          { id: "ic1805", name: "Heart Nebula (IC 1805)" },
          { id: "ic1848", name: "Soul Nebula (IC 1848)" },
          { id: "veil", name: "Veil Nebula (NGC 6960 / NGC 6992)" },
          { id: "m57", name: "Ring Nebula (M57)" },
          { id: "m27", name: "Dumbbell Nebula (M27)" },
          { id: "m1", name: "Crab Nebula (M1)" },
          { id: "m13", name: "Great Hercules Cluster (M13)" },
          { id: "moon", name: "The Moon" },
          { id: "jupiter", name: "Jupiter" },
          { id: "saturn", name: "Saturn" },
          { id: "mars", name: "Mars" },
          { id: "venus", name: "Venus" },
        ]}
      />
    </section>
  );
}
