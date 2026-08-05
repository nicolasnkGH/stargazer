"use client";

import { useEffect, useState } from "react";
import { User, Flag } from "lucide-react";
import Modal from "./Modal";
import { API_BASE } from "@/lib/constants";
import { compressImage } from "@/lib/compress-image";
import type { GalleryEntry, GalleryUploadPayload } from "@/types";

interface GalleryModalProps {
  targetId: string;
  targetName: string;
  open: boolean;
  onClose: () => void;
}

type Tab = "view" | "upload";

const EMPTY_FORM = { author: "", location: "", gear: "", comment: "", note: "" };

async function fetchEntries(targetId: string): Promise<GalleryEntry[]> {
  const res = await fetch(`${API_BASE}/gallery?target_id=${encodeURIComponent(targetId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function GalleryModal({ targetId, targetName, open, onClose }: GalleryModalProps) {
  const [tab, setTab] = useState<Tab>("view");
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Resets and refetches whenever the modal opens (or a different target is opened) —
  // this is genuinely syncing with an external system (the backend), not derivable state.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab("view");
    setForm(EMPTY_FORM);
    setPreview(null);
    setUploadError(null);
    setUploadNotice(null);
    setReportedIds(new Set());
    setReportNotice(null);
    setLoading(true);
    setLoadError(false);

    fetchEntries(targetId)
      .then(setEntries)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [open, targetId]);

  async function handleReport(id: number) {
    if (!window.confirm("Report this image? It will be hidden pending admin review.")) return;
    setReportNotice(null);
    try {
      const res = await fetch(`${API_BASE}/gallery/image/${id}/report`, { method: "POST" });
      if (!res.ok) throw new Error();
      setReportedIds((prev) => new Set(prev).add(id));
      setReportNotice("Image reported and hidden successfully.");
    } catch {
      setReportNotice("Failed to report image.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    try {
      setPreview(await compressImage(file));
    } catch {
      setUploadError(
        "Unsupported image format. If you're uploading a HEIC/HEIF image (e.g. from an iPhone), convert it to JPEG or PNG first."
      );
      e.target.value = "";
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      setUploadError("Please select an image first.");
      return;
    }
    setSubmitting(true);
    setUploadError(null);

    const payload: GalleryUploadPayload = {
      target_id: targetId,
      target_name: targetName,
      author: form.author.trim(),
      location: form.location.trim(),
      gear: form.gear.trim(),
      comment: form.comment.trim(),
      note: form.note.trim() || null,
      image_data: preview,
    };

    try {
      const res = await fetch(`${API_BASE}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ?? "Upload failed.");
      }
      setUploadNotice("Image shared successfully!");
      setForm(EMPTY_FORM);
      setPreview(null);
      setTab("view");
      setLoading(true);
      const fresh = await fetchEntries(targetId);
      setEntries(fresh);
      setLoading(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

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

      {uploadNotice && (
        <p className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
          🎉 {uploadNotice}
        </p>
      )}

      {tab === "view" && (
        <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto">
          {reportNotice && <p className="text-xs text-zinc-400">{reportNotice}</p>}
          {loading && <p className="py-6 text-center text-sm text-zinc-400">Loading shared images...</p>}
          {loadError && <p className="py-6 text-center text-sm text-red-400">Failed to load shared images.</p>}
          {!loading && !loadError && entries.filter((e) => !reportedIds.has(e.id)).length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-400">
              No photos shared for this object yet. Be the first to share!
            </p>
          )}
          {entries
            .filter((entry) => !reportedIds.has(entry.id))
            .map((entry) => (
              <div
                key={entry.id}
                className="relative rounded-lg border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2"
              >
                <button
                  onClick={() => handleReport(entry.id)}
                  title="Report this image"
                  className="absolute top-2.5 right-2.5 z-10 rounded border border-red-500/40 bg-red-500/20 px-1.5 py-0.5 text-[0.65rem] text-red-300 hover:bg-red-500/30 transition-colors flex items-center gap-1"
                >
                  <Flag className="h-2.5 w-2.5" strokeWidth={1.5} />
                  Report
                </button>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="file"
            accept="image/*"
            required
            onChange={handleFileChange}
            className="w-full rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-3 text-xs text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-sky-500/20 file:px-3 file:py-1.5 file:text-xs file:text-sky-300"
          />
          {preview && (
            <div className="flex max-h-[150px] items-center justify-center overflow-hidden rounded-md bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="max-h-[150px] max-w-full object-contain" />
            </div>
          )}

          <input
            type="text"
            required
            placeholder="Your name"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
          <input
            type="text"
            required
            placeholder="Location (e.g. Cherry Springs Park)"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
          <input
            type="text"
            required
            placeholder="Gear (e.g. Celestron 130SLT, 25mm Eyepiece)"
            value={form.gear}
            onChange={(e) => setForm((f) => ({ ...f, gear: e.target.value }))}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
          <textarea
            required
            placeholder="Comment"
            rows={2}
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            className="resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />

          {uploadError && <p className="text-xs text-red-400">❌ {uploadError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-sky-500/40 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/30 disabled:opacity-50"
          >
            {submitting ? "Verifying Safety & Uploading... ⏳" : "Submit for Safety Verification & Share 🚀"}
          </button>
        </form>
      )}
    </Modal>
  );
}
