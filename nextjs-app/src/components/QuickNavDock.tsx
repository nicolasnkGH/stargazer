"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import PreflightChecklistModal from "./PreflightChecklistModal";
import { NIGHT_MODE_STORAGE_KEY } from "@/lib/constants";

export default function QuickNavDock() {
  const [nightMode, setNightMode] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const isNight = localStorage.getItem(NIGHT_MODE_STORAGE_KEY) === "1";
      setNightMode(isNight);
      document.body.classList.toggle("night-mode", isNight);
    } catch {
      // ignore
    }

    const handleScroll = () => {
      setShowTop(window.scrollY > 280);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const handleOpenPreflight = () => setChecklistOpen(true);
    window.addEventListener("sg-open-preflight-modal", handleOpenPreflight);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("sg-open-preflight-modal", handleOpenPreflight);
    };
  }, []);

  const toggleNightMode = () => {
    const next = !nightMode;
    setNightMode(next);
    document.body.classList.toggle("night-mode", next);
    try {
      localStorage.setItem(NIGHT_MODE_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateTo = (tabKey: string, sectionId: string) => {
    window.dispatchEvent(new CustomEvent("sg-navigate-tab", { detail: { tab: tabKey } }));
    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <>
      {/* DESKTOP: Vertical Floating Rail (Right Edge) */}
      <nav
        id="quick-nav-dock"
        aria-label="Quick observatory navigation"
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
      >
        {/* Red Light / Night Mode Button */}
        <div className="relative group">
          <button
            id="btn-night-mode"
            onClick={toggleNightMode}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer select-none ${
              nightMode
                ? "bg-red-600 text-white border border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.85)] scale-105"
                : "bg-slate-900 border border-white/10 text-red-500/80 hover:bg-red-950/20 hover:border-red-500/40 hover:text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
            }`}
            title="Red Light Night Vision Mode"
            aria-label="Toggle Night Vision"
          >
            <Icon name="eye" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-red-300 font-mono shadow-xl z-50">
            {nightMode ? "Exit Red Light" : "Red Light Mode"}
          </span>
        </div>

        {/* Scroll to Top */}
        <div className="relative group">
          <button
            onClick={scrollToTop}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer select-none ${
              showTop
                ? "bg-sky-600 text-white border border-sky-400 shadow-[0_0_18px_rgba(14,165,233,0.85)] scale-105"
                : "bg-slate-900 border border-white/10 text-sky-400/80 hover:bg-sky-950/20 hover:border-sky-500/40 hover:text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.15)]"
            }`}
            title="Back to Top"
            aria-label="Scroll to Top"
          >
            <Icon name="arrow-up" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-sky-300 font-mono shadow-xl z-50">
            Top of Page
          </span>
        </div>

        <div className="w-6 h-px bg-white/10 my-0.5" />

        {/* Plan My Night */}
        <div className="relative group">
          <button
            onClick={() => navigateTo("plan", "card-plan-my-night")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-zinc-300 hover:text-sky-300 hover:bg-sky-950/30 hover:border-sky-500/40 transition-all cursor-pointer select-none"
            title="Plan My Night"
            aria-label="Plan My Night"
          >
            <Icon name="calendar-days" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-sky-300 font-mono shadow-xl z-50">
            Plan My Night
          </span>
        </div>

        {/* Pre-flight Checklist Modal Trigger */}
        <div className="relative group">
          <button
            onClick={() => setChecklistOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-zinc-300 hover:text-emerald-300 hover:bg-emerald-950/30 hover:border-emerald-500/40 transition-all cursor-pointer select-none"
            title="Pre-Flight Observing Checklist"
            aria-label="Observing Checklist"
          >
            <Icon name="check-square" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-emerald-300 font-mono shadow-xl z-50">
            Field Checklist
          </span>
        </div>

        {/* AI Picks */}
        <div className="relative group">
          <button
            onClick={() => navigateTo("ai", "card-ai-targets")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-zinc-300 hover:text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/40 transition-all cursor-pointer select-none"
            title="AI Picks & Must-See"
            aria-label="AI Picks"
          >
            <Icon name="sparkles" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-amber-300 font-mono shadow-xl z-50">
            AI Picks
          </span>
        </div>

        {/* Sky Map */}
        <div className="relative group">
          <button
            onClick={() => navigateTo("sky", "card-active-const")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-zinc-300 hover:text-indigo-300 hover:bg-indigo-950/30 hover:border-indigo-500/40 transition-all cursor-pointer select-none"
            title="Sky Map & 3D Celestial Sphere"
            aria-label="Sky Map"
          >
            <Icon name="compass" className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap rounded-lg bg-slate-900/95 border border-white/10 px-2.5 py-1 text-xs text-indigo-300 font-mono shadow-xl z-50">
            3D Sky Map
          </span>
        </div>
      </nav>

      {/* MOBILE: Sleek Floating Bottom Navigation Pill (Thumb-Friendly) */}
      <nav
        aria-label="Quick mobile navigation"
        className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center justify-around gap-3 px-4 py-2 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.85)] ring-1 ring-white/10 max-w-[92vw]"
      >
        <button
          onClick={toggleNightMode}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all cursor-pointer ${
            nightMode
              ? "bg-red-600 text-white border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)] scale-105"
              : "bg-slate-900 border border-white/10 text-red-500 hover:bg-red-950/20 hover:border-red-500/40 hover:text-red-400"
          }`}
          title="Night Vision"
          aria-label="Night Vision"
        >
          <Icon name="eye" className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigateTo("sky", "card-active-const")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-zinc-300 hover:text-sky-300 transition-colors"
          title="Sky Map"
          aria-label="Sky Map"
        >
          <Icon name="compass" className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigateTo("ai", "card-ai-targets")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-zinc-300 hover:text-amber-300 transition-colors"
          title="AI Picks"
          aria-label="AI Picks"
        >
          <Icon name="sparkles" className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigateTo("plan", "card-plan-my-night")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-zinc-300 hover:text-sky-300 transition-colors"
          title="Plan My Night"
          aria-label="Plan My Night"
        >
          <Icon name="calendar-days" className="h-4 w-4" />
        </button>

        <button
          onClick={() => setChecklistOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-zinc-300 hover:text-emerald-300 transition-colors"
          title="Checklist"
          aria-label="Checklist"
        >
          <Icon name="check-square" className="h-4 w-4" />
        </button>

        <button
          onClick={scrollToTop}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all cursor-pointer ${
            showTop
              ? "bg-sky-600 text-white border border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.6)] scale-105"
              : "bg-slate-900 border border-white/10 text-sky-400 hover:bg-sky-950/20 hover:border-sky-500/40 hover:text-sky-300"
          }`}
          title="Top"
          aria-label="Scroll to Top"
        >
          <Icon name="arrow-up" className="h-4 w-4" />
        </button>
      </nav>

      {/* Globally Triggerable Preflight Checklist Modal */}
      {checklistOpen && (
        <PreflightChecklistModal
          open={checklistOpen}
          onClose={() => setChecklistOpen(false)}
        />
      )}

      {/* Night Vision Mode Overlay portal */}
      {mounted && createPortal(<div id="night-overlay" aria-hidden="true" />, document.body)}
    </>
  );
}
