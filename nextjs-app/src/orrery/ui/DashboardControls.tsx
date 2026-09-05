import React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Minus,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Sliders,
} from "lucide-react";
import { PlanetData } from "../types";
import { CELESTIAL_BODIES } from "../data/planetsData";

const LOCALIZED_BODIES: Record<string, Record<string, string>> = {
  pt: {
    sun: "SOL", mercury: "MERCÚRIO", venus: "VÊNUS", earth: "TERRA", moon: "LUA",
    mars: "MARTE", jupiter: "JÚPITER", saturn: "SATURNO", uranus: "URANO", neptune: "NETUNO"
  },
  es: {
    sun: "SOL", mercury: "MERCURIO", venus: "VENUS", earth: "TIERRA", moon: "LUNA",
    mars: "MARTE", jupiter: "JÚPITER", saturn: "SATURNO", uranus: "URANO", neptune: "NEPTUNO"
  }
};

interface DashboardControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  timeMultiplier: number;
  onSetTimeMultiplier: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onSelectBody: (body: PlanetData | null) => void;
  selectedBody: PlanetData | null;
  onPan?: (dir: "up" | "down" | "left" | "right" | "reset") => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  timeMultiplier,
  onSetTimeMultiplier,
  isPaused,
  onTogglePause,
  onSelectBody,
  selectedBody,
  onPan,
}) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <>
      {/* Left Side Zoom Slider Control */}
      <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center space-y-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <button
          onClick={onZoomIn}
          className="p-2 rounded-full bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 transition-all active:scale-95"
          title={t("orrery_title_zoom_in")}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Vertical Track Visual */}
        <div className="w-1 h-20 bg-slate-800 rounded-full relative overflow-hidden my-1">
          <div
            className="w-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{ height: `${Math.min(100, Math.max(5, (zoomLevel / 20) * 100))}%` }}
          />
        </div>

        <button
          onClick={onZoomOut}
          className="p-2 rounded-full bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 transition-all active:scale-95"
          title={t("orrery_title_zoom_out")}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Main Controls Deck (Non-overlapping responsive layout) */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-20 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
        {/* Left Side: D-Pad Puck + Speed Pill */}
        <div className="pointer-events-auto flex items-center space-x-3 flex-shrink-0">
          {/* Navigation D-Pad Puck */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center justify-center p-2">
            <button
              onClick={() => onPan && onPan("up")}
              className="absolute top-1 text-slate-400 hover:text-cyan-300 p-1 transition-transform active:scale-90"
              title={t("orrery_title_pan_up")}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPan && onPan("down")}
              className="absolute bottom-1 text-slate-400 hover:text-cyan-300 p-1 transition-transform active:scale-90"
              title={t("orrery_title_pan_down")}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPan && onPan("left")}
              className="absolute left-1 text-slate-400 hover:text-cyan-300 p-1 transition-transform active:scale-90"
              title={t("orrery_title_pan_left")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPan && onPan("right")}
              className="absolute right-1 text-slate-400 hover:text-cyan-300 p-1 transition-transform active:scale-90"
              title={t("orrery_title_pan_right")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Inner Puck Center Reset Button */}
            <button
              onClick={() => {
                onSelectBody(null);
                if (onPan) onPan("reset");
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center text-cyan-300 hover:scale-105 active:scale-95 transition-all"
              title={t("orrery_title_reset_view")}
            >
              <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Time Speed & Orbit Controls */}
          <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-2xl border border-white/10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl text-xs text-white">
            <button
              onClick={onTogglePause}
              className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 transition-all active:scale-95"
              title={isPaused ? t("orrery_title_resume") : t("orrery_title_pause")}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <div className="flex items-center space-x-1 pl-1.5 sm:pl-2 border-l border-white/10">
              {[1, 10, 100, 1000].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onSetTimeMultiplier(speed)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[11px] sm:text-xs font-bold transition-all ${
                    timeMultiplier === speed
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Planet Quick Jump Toolbar */}
        <div className="pointer-events-auto flex items-center space-x-1.5 sm:space-x-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-1.5 sm:p-2 rounded-2xl shadow-2xl text-slate-300 min-w-0 w-full sm:w-auto max-w-full overflow-hidden">
          <div
            className="flex items-center space-x-1 overflow-x-auto w-full pr-2 scrollbar-none"
            style={{
              maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 85%, transparent 100%)",
            }}
          >
            {CELESTIAL_BODIES.slice(0, 9).map((b) => (
              <button
                key={b.id}
                onClick={() => onSelectBody(b)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedBody?.id === b.id
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                    : "hover:bg-white/10 text-slate-300 bg-white/5"
                }`}
              >
                {LOCALIZED_BODIES[locale]?.[b.id] || b.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onSelectBody(null);
              if (onPan) onPan("reset");
            }}
            className="p-2 rounded-xl hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors flex-shrink-0 border-l border-white/10 pl-2 cursor-pointer"
            title={t("orrery_title_reset_view")}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
