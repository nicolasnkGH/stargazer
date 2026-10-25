"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, useMemo } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { API_BASE } from "@/lib/constants";
import type { GalleryEntry, GalleryComment } from "@/types";

function subscribeAdmin(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAdminSnapshot() {
  if (typeof window === "undefined") return false;
  const key = localStorage.getItem("stargazer_admin_key");
  return !!key && key.trim().length > 0;
}

interface AstroLightboxProps {
  entry: GalleryEntry | null;
  onClose: () => void;
  onReport?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

type ViewMode = "split" | "processed" | "raw";

export default function AstroLightbox({
  entry,
  onClose,
  onReport,
  onDelete,
  onPrev,
  onNext,
}: AstroLightboxProps) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const isAdmin = useSyncExternalStore(subscribeAdmin, getAdminSnapshot, () => false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteCapture, setConfirmDeleteCapture] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<Record<number, GalleryComment[]>>({});
  const [deletedCommentIds, setDeletedCommentIds] = useState<number[]>([]);
  const [confirmingCommentId, setConfirmingCommentId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentText, setCommentText] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; question: string } | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  const entryId = entry?.id;
  const comments = useMemo(() => {
    if (!entry) return [];
    const base = entry.comments || [];
    const local = (entryId ? localComments[entryId] : undefined) || [];
    return [...base, ...local].filter((c) => !deletedCommentIds.includes(c.id));
  }, [entry, entryId, localComments, deletedCommentIds]);

  const loadChallenge = async () => {
    try {
      const res = await fetch(`${API_BASE}/gallery/challenge`);
      if (res.ok) {
        const data = await res.json();
        setChallenge(data);
      }
    } catch {
      // ignore
    }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !challenge) {
      void loadChallenge();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    if (!commentAuthor.trim() || !commentText.trim()) {
      setCommentError("Please fill out your name and comment.");
      return;
    }
    if (!challengeAnswer.trim() || !challenge) {
      setCommentError("Please answer the security check question.");
      return;
    }
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`${API_BASE}/gallery/image/${entry.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: commentAuthor.trim(),
          comment: commentText.trim(),
          challenge_id: challenge.id,
          challenge_answer: challengeAnswer.trim(),
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.detail || "Failed to post comment.");
        void loadChallenge();
        setChallengeAnswer("");
        return;
      }
      setLocalComments((prev) => ({
        ...prev,
        [entry.id]: [...(prev[entry.id] || []), data.comment],
      }));
      setCommentText("");
      setChallengeAnswer("");
      setCommentSuccess("Comment posted!");
      void loadChallenge();
      setTimeout(() => setCommentSuccess(null), 3000);
    } catch {
      setCommentError("Network error. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!entry) return;
    const adminKey = (typeof window !== "undefined" ? localStorage.getItem("stargazer_admin_key") : null) || "";
    if (!adminKey) {
      setCommentError("Observatory passkey missing in localStorage. Enter it in the upload modal.");
      setConfirmingCommentId(null);
      return;
    }
    setDeletingCommentId(commentId);
    setCommentError(null);
    try {
      const res = await fetch(`${API_BASE}/gallery/image/${entry.id}/comment/${commentId}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        setDeletedCommentIds((prev) => [...prev, commentId]);
        setConfirmingCommentId(null);
        setCommentSuccess("Comment deleted.");
        setTimeout(() => setCommentSuccess(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setCommentError(data.detail || "Failed to delete comment.");
        setConfirmingCommentId(null);
      }
    } catch {
      setCommentError("Network error while deleting comment.");
      setConfirmingCommentId(null);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (!entry) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [entry]);

  // Handle ESC and Arrow keys
  useEffect(() => {
    if (!entry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entry, onClose, onPrev, onNext]);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== "split") return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || viewMode !== "split") return;
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // pointer capture already released
      }
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    const adminKey = typeof window !== "undefined" ? localStorage.getItem("stargazer_admin_key") : null;
    if (!adminKey) {
      alert("Observatory passkey is missing. Please configure it in the upload modal.");
      setConfirmDeleteCapture(false);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/gallery/image/${entry.id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete entry.");
      }
      onDelete?.(entry.id);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete entry.");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteCapture(false);
    }
  };

  if (typeof window === "undefined" || !entry) return null;

  const hasRaw = !!entry.has_raw_preview;
  const processedUrl = `${API_BASE}/gallery/image/${entry.id}`;
  const rawUrl = `${API_BASE}/gallery/image/${entry.id}/raw`;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.target_name} Astrophotography Showcase`}
      className="fixed inset-0 z-[100000] flex flex-col bg-[#030712]/95 backdrop-blur-xl select-none animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex-shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Icon name="camera" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
              {entry.target_name}
            </h2>
            <p className="text-xs text-zinc-400 flex items-center gap-2 font-mono truncate">
              <span>{entry.equipment || entry.gear || "Astrophotography"}</span>
              {entry.total_integration && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400">⏱️ {entry.total_integration}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Controls (if raw preview exists) */}
        <div className="flex items-center gap-2">
          {hasRaw && (
            <div className="hidden sm:flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Before / After Slider
              </button>
              <button
                type="button"
                onClick={() => setViewMode("processed")}
                className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "processed"
                    ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Final Processed
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "raw"
                    ? "bg-amber-600 text-white shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Raw Live Stack
              </button>
            </div>
          )}

          {isAdmin && (
            confirmDeleteCapture ? (
              <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/50 rounded-lg px-2.5 py-1 text-xs animate-in fade-in duration-150">
                <span className="text-red-300 font-semibold">Delete capture?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-200 font-bold hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCapture(false)}
                  disabled={isDeleting}
                  className="text-zinc-400 hover:text-white cursor-pointer ml-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteCapture(true)}
                disabled={isDeleting}
                title="Delete this capture (Owner Only)"
                className="rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 px-2.5 py-1.5 text-xs text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Icon name="trash" className="h-3.5 w-3.5 text-red-400" />
                <span className="hidden sm:inline">Delete Capture</span>
              </button>
            )
          )}

          {onReport && (
            <button
              onClick={() => onReport(entry.id)}
              title="Report this image"
              className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-xs text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="flag" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Report</span>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Close Lightbox"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0 relative">
        {/* Prev / Next navigation buttons */}
        {onPrev && (
          <button
            onClick={onPrev}
            aria-label="Previous image"
            className="hidden sm:flex absolute left-4 z-20 h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-black/90 hover:scale-105 transition-all shadow-xl cursor-pointer"
          >
            <Icon name="chevron-left" className="h-6 w-6" />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            aria-label="Next image"
            className="hidden sm:flex absolute right-4 z-20 h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-black/90 hover:scale-105 transition-all shadow-xl cursor-pointer"
          >
            <Icon name="chevron-right" className="h-6 w-6" />
          </button>
        )}

        {/* Viewport Frame (Locked dimensions to prevent layout shifts per Refinement 3) */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative w-full max-w-5xl h-[52vh] sm:h-[65vh] rounded-2xl border border-white/10 bg-black overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex items-center justify-center ${
            hasRaw && viewMode === "split" ? "cursor-ew-resize" : "cursor-default"
          }`}
        >
          {/* Layer 1: Final Processed Image */}
          {(viewMode === "split" || viewMode === "processed" || !hasRaw) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={processedUrl}
                alt={`${entry.target_name} Processed`}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>
          )}

          {/* Layer 2: Raw Live-Stack Image (clipped when split, or fully visible when raw) */}
          {hasRaw && (viewMode === "split" || viewMode === "raw") && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
              style={
                viewMode === "split"
                  ? {
                      clipPath: `polygon(0% 0%, ${sliderPos}% 0%, ${sliderPos}% 100%, 0% 100%)`,
                    }
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rawUrl}
                alt={`${entry.target_name} Raw Live Stack`}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>
          )}

          {/* Draggable Divider Handle (Only active in Split Mode) */}
          {hasRaw && viewMode === "split" && (
            <>
              {/* Vertical divider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] pointer-events-none z-10"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Central thumb pill */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-slate-950 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.7)]">
                  <div className="flex items-center gap-0.5 text-xs font-bold font-mono">
                    <span>‹</span>
                    <span className="text-[0.6rem] text-cyan-400">|</span>
                    <span>›</span>
                  </div>
                </div>
              </div>

              {/* Floating badges indicating Left (Raw) vs Right (Processed) */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="rounded-lg bg-black/70 border border-amber-500/40 px-2.5 py-1 text-[0.65rem] sm:text-xs font-bold font-mono text-amber-300 backdrop-blur-md shadow-md">
                  🔭 RAW LIVE STACK
                </span>
              </div>
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <span className="rounded-lg bg-black/70 border border-cyan-500/40 px-2.5 py-1 text-[0.65rem] sm:text-xs font-bold font-mono text-cyan-300 backdrop-blur-md shadow-md">
                  ✨ PROCESSED (Siril/AstroWizard)
                </span>
              </div>
            </>
          )}

          {/* Mode label when not split */}
          {!hasRaw && (
            <div className="absolute top-4 right-4 z-10 pointer-events-none">
              <span className="rounded-lg bg-black/70 border border-cyan-500/40 px-2.5 py-1 text-[0.65rem] sm:text-xs font-bold font-mono text-cyan-300 backdrop-blur-md shadow-md">
                🔭 ASTROPHOTOGRAPHY
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Pill Strip */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-6 pt-2 z-20 flex-shrink-0">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
          {/* Telemetry Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {entry.equipment && (
              <span className="rounded-lg bg-purple-950/50 border border-purple-500/30 px-2.5 py-1 text-xs font-medium text-purple-200 flex items-center gap-1.5">
                <span>🔭</span> {entry.equipment}
              </span>
            )}
            {entry.exposure_details && (
              <span className="rounded-lg bg-sky-950/50 border border-sky-500/30 px-2.5 py-1 text-xs font-medium text-sky-200 flex items-center gap-1.5">
                <span>⏱️</span> {entry.exposure_details}
              </span>
            )}
            {entry.total_integration && (
              <span className="rounded-lg bg-indigo-950/50 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <span>⏳ Total:</span> {entry.total_integration}
              </span>
            )}
            {entry.gain_iso && (
              <span className="rounded-lg bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-200 flex items-center gap-1.5">
                <span>🎛️</span> {entry.gain_iso}
              </span>
            )}
            {entry.filter && (
              <span className="rounded-lg bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-200 flex items-center gap-1.5">
                <span>🌈</span> {entry.filter}
              </span>
            )}
            {entry.processing_software && entry.processing_software.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {entry.processing_software.map((sw) => (
                  <span
                    key={sw}
                    className="rounded-lg bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 text-[0.7rem] font-mono text-cyan-300"
                  >
                    💻 {sw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Author, Location, Date, Comment & Comments Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-zinc-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-zinc-200 font-semibold flex items-center gap-1">
                <Icon name="user" className="h-3.5 w-3.5 text-zinc-400" />
                {entry.author}
              </span>
              {entry.location && (
                <span className="flex items-center gap-1">
                  <Icon name="map-pin" className="h-3.5 w-3.5 text-zinc-500" />
                  {entry.location}
                </span>
              )}
              {entry.capture_date && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar" className="h-3.5 w-3.5 text-zinc-500" />
                  {entry.capture_date}
                </span>
              )}
              {entry.comment && (
                <p className="text-zinc-300 italic max-w-sm sm:max-w-md truncate">
                  &ldquo;{entry.comment}&rdquo;
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={toggleComments}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none self-start sm:self-auto ${
                showComments
                  ? "bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900 border border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-white"
              }`}
            >
              <span>💬 Comments</span>
              <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.2 text-[0.65rem] font-mono text-cyan-300">
                {comments.length}
              </span>
              <span className="text-[0.65rem] font-mono">{showComments ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Expandable Comments Drawer */}
          {showComments && (
            <div className="mt-2 pt-3 border-t border-cyan-500/20 flex flex-col gap-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                  💬 Community Notes & Discussion ({comments.length})
                </span>
                <span className="text-[0.65rem] text-zinc-500">
                  Ask a question or share processing feedback
                </span>
              </div>

              {/* Comments List */}
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {comments.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">
                    No comments yet. Be the first to leave feedback or ask about capture settings!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{c.author}</span>
                          <span className="text-[0.65rem] text-zinc-500 font-mono">
                            {c.created_at || "recently"}
                          </span>
                        </div>
                        {isAdmin && (
                          confirmingCommentId === c.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/40 rounded-lg px-2 py-0.5 text-[0.68rem] animate-in fade-in duration-150">
                              <span className="text-rose-300 font-semibold">Delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deletingCommentId === c.id}
                                className="text-rose-200 font-bold hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {deletingCommentId === c.id ? "..." : "Yes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingCommentId(null)}
                                disabled={deletingCommentId === c.id}
                                className="text-zinc-400 hover:text-white cursor-pointer ml-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCommentError(null);
                                setConfirmingCommentId(c.id);
                              }}
                              className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Delete comment (Owner)"
                            >
                              <Icon name="trash" className="h-3 w-3" />
                            </button>
                          )
                        )}
                      </div>
                      <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Submission Form */}
              <form onSubmit={handleAddComment} className="pt-2 border-t border-white/5 flex flex-col gap-2">
                {commentError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1">
                    ⚠️ {commentError}
                  </p>
                )}
                {commentSuccess && (
                  <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                    ✓ {commentSuccess}
                  </p>
                )}

                {/* Hidden Honeypot Input for anti-spam bots */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name / Astro Handle *"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    maxLength={60}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400/50"
                  />
                  {/* Anti-Spam Verification Challenge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[0.68rem] text-cyan-300 whitespace-nowrap font-mono">
                      🔒 {challenge?.question || "Verification check..."}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Answer"
                      value={challengeAnswer}
                      onChange={(e) => setChallengeAnswer(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <textarea
                    required
                    rows={2}
                    placeholder="Leave a comment, equipment tip, or question... *"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={600}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 p-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400/50 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="h-14 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] whitespace-nowrap"
                  >
                    {submittingComment ? "Posting..." : "Post 💬"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </footer>
    </div>
  );

  return createPortal(content, document.body);
}
