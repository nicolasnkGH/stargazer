"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import Modal from "./Modal";
import AstroLightbox from "./AstroLightbox";
import {
  API_BASE,
  ASTRO_EQUIPMENT_PRESETS,
  ASTRO_FILTER_PRESETS,
  ASTRO_SOFTWARE_PRESETS,
} from "@/lib/constants";
import { compressImage } from "@/lib/compress-image";
import type { GalleryEntry, GalleryUploadPayload } from "@/types";

interface GalleryModalProps {
  targetId: string;
  targetName: string;
  open: boolean;
  onClose: () => void;
  availableTargets?: Array<{ id: string; name: string }>;
  initialTab?: Tab;
}

type Tab = "view" | "upload";

const EMPTY_FORM = {
  author: "",
  location: "",
  equipment: "DWARF 3 Telephoto",
  customEquipment: "",
  subframesCount: "",
  subframeDuration: "45s",
  totalIntegration: "",
  gainIso: "Gain 90",
  filter: "Duo-Band",
  comment: "",
  note: "",
  captureDate: new Date().toISOString().split("T")[0],
};

async function fetchEntries(targetId: string): Promise<GalleryEntry[]> {
  const query = targetId ? `?target_id=${encodeURIComponent(targetId)}` : "";
  const res = await fetch(`${API_BASE}/gallery${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function GalleryModal({
  targetId: initialTargetId,
  targetName: initialTargetName,
  open,
  onClose,
  availableTargets = [],
  initialTab = "view",
}: GalleryModalProps) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [targetName, setTargetName] = useState(initialTargetName);

  // Decoupled upload form target state so typing never triggers view-tab refetches or tab resets
  const [uploadTargetId, setUploadTargetId] = useState(initialTargetId || "m42");
  const [uploadTargetName, setUploadTargetName] = useState(initialTargetName || "Orion Nebula (M42)");
  const [showPasskey, setShowPasskey] = useState(false);

  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>(["Siril"]);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stargazer_admin_key");
      if (saved) setAdminKey(saved);
    }
  }, []);

  const handleAdminKeyChange = (val: string) => {
    setAdminKey(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("stargazer_admin_key", val);
    }
  };

  // Lightbox modal state
  const [activeLightboxEntry, setActiveLightboxEntry] = useState<GalleryEntry | null>(null);

  // Resets and refetches ONLY when the modal is opened/closed
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setForm(EMPTY_FORM);
    setSelectedSoftware(["Siril"]);
    setPreview(null);
    setRawPreview(null);
    setUploadError(null);
    setUploadNotice(null);
    setReportedIds(new Set());
    setReportNotice(null);
    setLoading(true);
    setLoadError(false);

    setTargetId(initialTargetId);
    setTargetName(initialTargetName);
    setUploadTargetId(initialTargetId || "m42");
    setUploadTargetName(initialTargetName || "Orion Nebula (M42)");

    fetchEntries(initialTargetId)
      .then(setEntries)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [open, initialTab, initialTargetId, initialTargetName]);

  // Auto-calculate total integration if count and duration are present
  const handleCalcIntegration = (countStr: string, durStr: string) => {
    const count = parseInt(countStr, 10);
    const durSec = parseInt(durStr.replace(/\D/g, ""), 10);
    if (!isNaN(count) && !isNaN(durSec) && count > 0 && durSec > 0) {
      const totalSec = count * durSec;
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
      }
      return `${mins}m`;
    }
    return "";
  };

  async function handleReport(id: number) {
    if (!window.confirm("Report this image? It will be hidden pending admin review.")) return;
    setReportNotice(null);
    try {
      const res = await fetch(`${API_BASE}/gallery/image/${id}/report`, { method: "POST" });
      if (!res.ok) throw new Error();
      setReportedIds((prev) => new Set(prev).add(id));
      setReportNotice("Image reported and hidden successfully.");
      if (activeLightboxEntry?.id === id) {
        setActiveLightboxEntry(null);
      }
    } catch {
      setReportNotice("Failed to report image.");
    }
  }

  async function handlePrimaryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    try {
      // Per Refinement 1: 2048px max dimension and 0.90 quality for pinpoint stars
      setPreview(await compressImage(file));
    } catch {
      setUploadError(
        "Unsupported image format. If uploading HEIC/HEIF (e.g. from iPhone), convert to JPEG/PNG first."
      );
      e.target.value = "";
      setPreview(null);
    }
  }

  async function handleRawFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setRawPreview(null);
      return;
    }
    try {
      setRawPreview(await compressImage(file));
    } catch {
      e.target.value = "";
      setRawPreview(null);
    }
  }

  const toggleSoftware = (sw: string) => {
    setSelectedSoftware((prev) =>
      prev.includes(sw) ? prev.filter((s) => s !== sw) : [...prev, sw]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      setUploadError("Please select the processed image first.");
      return;
    }
    const chosenTargetName = uploadTargetName.trim() || uploadTargetId.trim();
    if (!chosenTargetName) {
      setUploadError("Please enter or select a celestial target.");
      return;
    }
    const chosenTargetId =
      uploadTargetId.trim() ||
      chosenTargetName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      "custom";

    if (!adminKey.trim()) {
      setUploadError("Observatory passkey is required to publish captures.");
      return;
    }
    setSubmitting(true);
    setUploadError(null);

    const chosenEquipment =
      form.equipment === "Custom Setup" && form.customEquipment.trim()
        ? form.customEquipment.trim()
        : form.equipment;

    const exposureDetails =
      form.subframesCount && form.subframeDuration
        ? `${form.subframesCount} × ${form.subframeDuration}`
        : "";

    const payload: GalleryUploadPayload = {
      target_id: chosenTargetId,
      target_name: chosenTargetName,
      author: form.author.trim(),
      location: form.location.trim(),
      gear: chosenEquipment,
      equipment: chosenEquipment,
      comment: form.comment.trim(),
      note: form.note.trim() || null,
      notes: form.note.trim() || null,
      image_data: preview,
      raw_image_data: rawPreview || null,
      exposure_details: exposureDetails,
      total_integration: form.totalIntegration.trim(),
      gain_iso: form.gainIso.trim(),
      filter: form.filter,
      processing_software: selectedSoftware,
      capture_date: form.captureDate,
      admin_key: adminKey.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/gallery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey.trim(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ?? "Upload failed.");
      }
      setUploadNotice("🎉 Capture published to observatory log!");
      setForm(EMPTY_FORM);
      setPreview(null);
      setRawPreview(null);
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

  const visibleEntries = entries.filter((e) => !reportedIds.has(e.id));

  return (
    <>
      <Modal open={open} onClose={onClose} title={tab === "upload" ? "Log Astrophotography Capture 🔭" : t("gallery_modal_title", { target: targetName || "Observatory" })}>
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 mb-4">
          <button
            type="button"
            onClick={() => setTab("view")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "view"
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
            }`}
          >
            <Icon name="image" className="h-3.5 w-3.5" />
            <span>{t("tab_shared_images")} ({visibleEntries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "upload"
                ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
            }`}
          >
            <Icon name="camera" className="h-3.5 w-3.5" />
            <span>{t("tab_upload_photo")}</span>
          </button>
        </div>

        {uploadNotice && (
          <p className="mb-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-xs text-green-300">
            {uploadNotice}
          </p>
        )}

        {/* View Gallery Tab */}
        {tab === "view" && (
          <div className="flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-1">
            {reportNotice && <p className="text-xs text-zinc-400">{reportNotice}</p>}
            {loading && <p className="py-8 text-center text-sm text-zinc-400 font-mono">{t("loading_shared_images")}</p>}
            {loadError && <p className="py-8 text-center text-sm text-red-400">{t("failed_load_images")}</p>}
            {!loading && !loadError && visibleEntries.length === 0 && (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <span className="text-3xl">🔭</span>
                <p className="text-sm text-zinc-300 font-semibold">{t("no_photos_shared")}</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Be the first to share an astrophoto or smart-scope live stack of {targetName}!
                </p>
                <button
                  onClick={() => setTab("upload")}
                  className="mt-2 rounded-xl border border-purple-500/40 bg-purple-600/20 px-4 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition-all cursor-pointer"
                >
                  Upload First Capture ✨
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setActiveLightboxEntry(entry)}
                  className="group relative rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-purple-500/40 p-2.5 flex flex-col gap-2 transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-[4/3] w-full rounded-lg bg-black overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${API_BASE}/gallery/image/${entry.id}`}
                      alt={entry.target_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Overlay Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      {entry.has_raw_preview && (
                        <span className="rounded bg-black/75 border border-cyan-400/50 px-1.5 py-0.5 text-[0.62rem] font-bold text-cyan-300 backdrop-blur-md">
                          ⚡ Before / After
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      {entry.total_integration && (
                        <span className="rounded bg-black/75 border border-amber-400/50 px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300 backdrop-blur-md">
                          ⏱️ {entry.total_integration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Telemetry */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                      <span className="truncate">{entry.equipment || entry.gear || "Astro Scope"}</span>
                      {entry.filter && (
                        <span className="text-[0.65rem] text-emerald-400 font-mono">{entry.filter}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[0.7rem] text-zinc-400 font-mono">
                      <span>👤 {entry.author}</span>
                      <span>📅 {entry.capture_date || entry.created_at.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Astrophotography Tab */}
        {tab === "upload" && (
          <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
            {/* Celestial Target: Free manual entry with autocomplete suggestions */}
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1 flex items-center justify-between">
                <span>Celestial Target *</span>
                <span className="text-[0.68rem] text-cyan-400 font-mono">✍️ Type any target manually</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="celestial_target"
                  id="celestial_target_field"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  required
                  list="target-preset-suggestions"
                  placeholder="e.g. Orion Nebula (M42), Rosette Nebula, M33, Saturn..."
                  value={uploadTargetName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadTargetName(val);
                    const match = availableTargets.find(
                      (t) =>
                        t.name.toLowerCase() === val.trim().toLowerCase() ||
                        t.id.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      setUploadTargetId(match.id);
                    } else {
                      const slug = val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");
                      setUploadTargetId(slug || "custom");
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
                />
                {availableTargets.length > 0 && (
                  <datalist id="target-preset-suggestions">
                    {availableTargets.map((tgt) => (
                      <option key={tgt.id} value={tgt.name} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            {/* Image Upload Area: Primary Processed + Optional Raw Live Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary Final Processed Image */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-purple-300 flex items-center justify-between">
                  <span>Final Processed Image *</span>
                  <span className="text-[0.65rem] text-zinc-500">2048px Hi-Res</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handlePrimaryFileChange}
                  className="w-full rounded-xl border border-dashed border-purple-500/30 bg-purple-950/20 p-2.5 text-xs text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-purple-600/30 file:px-2.5 file:py-1 file:text-xs file:text-purple-200"
                />
                {preview && (
                  <div className="relative aspect-[4/3] rounded-lg bg-black overflow-hidden flex items-center justify-center border border-purple-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Processed Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* Optional Raw Live-Stack Preview (for Before/After comparison) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-cyan-300 flex items-center justify-between">
                  <span>Raw Stack Preview (Optional)</span>
                  <span className="text-[0.65rem] text-cyan-400">⚡ For Before/After</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRawFileChange}
                  className="w-full rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/20 p-2.5 text-xs text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-cyan-600/30 file:px-2.5 file:py-1 file:text-xs file:text-cyan-200"
                />
                {rawPreview && (
                  <div className="relative aspect-[4/3] rounded-lg bg-black overflow-hidden flex items-center justify-center border border-cyan-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rawPreview} alt="Raw Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Selection */}
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1 block">🔭 Telescope & Optics</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={form.equipment}
                  onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                >
                  {ASTRO_EQUIPMENT_PRESETS.map((equip) => (
                    <option key={equip} value={equip}>
                      {equip}
                    </option>
                  ))}
                </select>
                {form.equipment === "Custom Setup" && (
                  <input
                    type="text"
                    placeholder="Specify optic/sensor (e.g. 80ED + ASI533MC)"
                    value={form.customEquipment}
                    onChange={(e) => setForm((f) => ({ ...f, customEquipment: e.target.value }))}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                  />
                )}
              </div>
            </div>

            {/* Exposure, Integration & Gain */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[0.7rem] font-bold text-zinc-400 mb-1 block">Subframes</label>
                <input
                  type="text"
                  placeholder="e.g. 120"
                  value={form.subframesCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoInt = handleCalcIntegration(val, form.subframeDuration);
                    setForm((f) => ({
                      ...f,
                      subframesCount: val,
                      totalIntegration: autoInt || f.totalIntegration,
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="text-[0.7rem] font-bold text-zinc-400 mb-1 block">Sub Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 45s"
                  value={form.subframeDuration}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoInt = handleCalcIntegration(form.subframesCount, val);
                    setForm((f) => ({
                      ...f,
                      subframeDuration: val,
                      totalIntegration: autoInt || f.totalIntegration,
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[0.7rem] font-bold text-amber-400 mb-1 block">Total Integration</label>
                <input
                  type="text"
                  placeholder="e.g. 1h 30m"
                  value={form.totalIntegration}
                  onChange={(e) => setForm((f) => ({ ...f, totalIntegration: e.target.value }))}
                  className="w-full rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Filter & Gain Presets */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.7rem] font-bold text-zinc-400 mb-1 block">🌈 Filter Used</label>
                <select
                  value={form.filter}
                  onChange={(e) => setForm((f) => ({ ...f, filter: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                >
                  {ASTRO_FILTER_PRESETS.map((flt) => (
                    <option key={flt} value={flt}>
                      {flt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[0.7rem] font-bold text-zinc-400 mb-1 block">🎛️ Gain / ISO</label>
                <input
                  type="text"
                  placeholder="e.g. Gain 90, Gain 60"
                  value={form.gainIso}
                  onChange={(e) => setForm((f) => ({ ...f, gainIso: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            {/* Processing Software Tags */}
            <div>
              <label className="text-[0.7rem] font-bold text-zinc-400 mb-1.5 block">
                💻 Processing Software Used
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ASTRO_SOFTWARE_PRESETS.map((sw) => {
                  const isSelected = selectedSoftware.includes(sw);
                  return (
                    <button
                      key={sw}
                      type="button"
                      onClick={() => toggleSoftware(sw)}
                      className={`rounded-lg px-2.5 py-1 text-[0.7rem] font-mono font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm"
                          : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
                      }`}
                    >
                      {sw}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observer Name, Location & Capture Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                name="astro_author"
                autoComplete="name"
                data-lpignore="true"
                data-1p-ignore="true"
                required
                placeholder={t("ph_your_name")}
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
              />
              <input
                type="text"
                name="astro_location"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                required
                placeholder={t("ph_location")}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
              />
              <input
                type="date"
                value={form.captureDate}
                onChange={(e) => setForm((f) => ({ ...f, captureDate: e.target.value }))}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/40"
              />
            </div>

            <textarea
              required
              placeholder="Observation notes, stacking parameters, or field conditions..."
              rows={2}
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
            />

            {/* Observatory Passkey Field */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="lock" className="h-3.5 w-3.5 text-purple-400" />
                  <span>{t("lbl_passkey_owner")} *</span>
                </span>
                {adminKey && (
                  <span className="text-[0.65rem] text-emerald-400 font-mono">
                    ✓ {t("lbl_passkey_saved")}
                  </span>
                )}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPasskey ? "text" : "password"}
                  name="observatory_admin_key"
                  id="observatory_admin_key"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  required
                  placeholder={t("ph_enter_passkey")}
                  value={adminKey}
                  onChange={(e) => handleAdminKeyChange(e.target.value)}
                  className="w-full rounded-xl border border-purple-500/40 bg-slate-950 px-3 py-2 pr-10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-400 font-mono tracking-wider"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showPasskey ? "Hide passkey" : "Show passkey"}
                >
                  {showPasskey ? "👁️" : "🙈"}
                </button>
              </div>
              <p className="text-[0.68rem] text-zinc-400">
                {t("lbl_passkey_hint")}
              </p>
            </div>

            {uploadError && <p className="text-xs text-red-400">❌ {uploadError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl border border-purple-500/50 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Publishing Astrophotography..." : t("btn_publish_log")}
            </button>
          </form>
        )}
      </Modal>

      {/* AstroLightbox when an entry is selected */}
      {activeLightboxEntry && (
        <AstroLightbox
          entry={activeLightboxEntry}
          onClose={() => setActiveLightboxEntry(null)}
          onReport={handleReport}
          onDelete={(id) => {
            setEntries((prev) => prev.filter((e) => e.id !== id));
            setActiveLightboxEntry(null);
          }}
        />
      )}
    </>
  );
}
