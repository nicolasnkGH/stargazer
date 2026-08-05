"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import Modal from "./Modal";
import { API_BASE } from "@/lib/constants";
import type { GalleryEntry } from "@/types";

interface GalleryModalProps {
  targetId: string;
  targetName: string;
  open: boolean;
  onClose: () => void;
}

type Tab = "view" | "upload";

export default function GalleryModal({ targetId, targetName, open, onClose }: GalleryModalProps) {
  const [tab, setTab] = useState<Tab>("view");
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Resets and refetches whenever the modal opens (or a different target is opened) —
  // this is genuinely syncing with an external system (the backend), not derivable state.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab("view");
    setLoading(true);
    setLoadError(false);

    fetch(`${API_BASE}/gallery?target_id=${encodeURIComponent(targetId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GalleryEntry[]) => setEntries(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [open, targetId]);

  return (
    <Modal open={open} onClose={onClose} title={`Gallery & Astro-Share: ${targetName}`}>
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab("view")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "view"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
          }`}
        >
          Shared Images 🖼️
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "upload"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
          }`}
        >
          Upload Photo 📤
        </button>
      </div>

      {tab === "view" && (
        <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto">
          {loading && <p className="py-6 text-center text-sm text-zinc-400">Loading shared images...</p>}
          {loadError && <p className="py-6 text-center text-sm text-red-400">Failed to load shared images.</p>}
          {!loading && !loadError && entries.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-400">
              No photos shared for this object yet. Be the first to share!
            </p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2">
              <div className="flex max-h-[250px] items-center justify-center overflow-hidden rounded-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_BASE}/gallery/image/${entry.id}`}
                  alt={entry.target_name}
                  className="max-h-[250px] max-w-full object-contain"
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                <User className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                Shared by: {entry.author}
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-zinc-400">
                <span>📍 Location: {entry.location}</span>
                <span>🔭 Gear Used: {entry.gear}</span>
                {entry.note && <span>📝 Note: {entry.note}</span>}
                <span>📅 Date: {entry.created_at}</span>
              </div>
              <div className="rounded-md border border-white/5 bg-black/20 p-2 text-xs text-zinc-300">
                <strong>💬 Comment:</strong> {entry.comment}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "upload" && (
        <p className="py-6 text-center text-sm text-zinc-400">Upload coming shortly.</p>
      )}
    </Modal>
  );
}
