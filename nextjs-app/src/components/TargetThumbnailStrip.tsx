"use client";

import { useState } from "react";
import useSWR from "swr";
import Icon from "./Icon";
import AstroLightbox from "./AstroLightbox";
import { API_BASE } from "@/lib/constants";
import type { GalleryEntry } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

interface TargetThumbnailStripProps {
  targetId: string;
  targetName: string;
}

export default function TargetThumbnailStrip({
  targetId,
  targetName,
}: TargetThumbnailStripProps) {
  const { data: entries, mutate } = useSWR<GalleryEntry[]>(
    targetId ? `${API_BASE}/gallery?target_id=${encodeURIComponent(targetId)}` : null,
    fetcher,
    { dedupingInterval: 30000 }
  );

  const [selectedEntry, setSelectedEntry] = useState<GalleryEntry | null>(null);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="w-full my-3 p-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
          <Icon name="camera" className="h-3.5 w-3.5 text-purple-400" />
          <span>{targetName} Captures ({entries.length})</span>
        </span>
        <span className="text-[0.65rem] text-zinc-400 font-mono">Click photo for Full Lightbox & Slider</span>
      </div>

      {/* Horizontal Swipeable Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className="group relative flex-shrink-0 w-28 sm:w-32 rounded-xl border border-white/10 bg-black overflow-hidden cursor-pointer hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          >
            <div className="relative aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_BASE}/gallery/image/${entry.id}`}
                alt={entry.target_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {entry.has_raw_preview && (
                <div className="absolute top-1 left-1">
                  <span className="rounded bg-black/80 border border-cyan-400/60 px-1 py-0.2 text-[0.55rem] font-bold text-cyan-300">
                    ⚡ Slider
                  </span>
                </div>
              )}
              {entry.total_integration && (
                <div className="absolute bottom-1 right-1">
                  <span className="rounded bg-black/85 border border-amber-400/60 px-1 py-0.2 text-[0.55rem] font-mono text-amber-300">
                    {entry.total_integration}
                  </span>
                </div>
              )}
            </div>

            <div className="p-1.5 bg-slate-950/90 flex flex-col">
              <span className="text-[0.65rem] font-semibold text-zinc-200 truncate font-mono">
                {entry.equipment || entry.gear || "Scope"}
              </span>
              <span className="text-[0.6rem] text-zinc-400 truncate">
                by {entry.author}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Lightbox with Comparison Slider */}
      {selectedEntry && (
        <AstroLightbox
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onReport={() => mutate()}
          onDelete={() => {
            mutate();
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
