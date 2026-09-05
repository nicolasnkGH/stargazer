"use client";

import React, { useState } from "react";
import type { PlanetData } from "@/orrery/types";
import type { TwilightTimeline } from "@/types";
import { SolarSystemCanvas } from "@/orrery/3d/SolarSystemCanvas";
import { CenterOverlay } from "@/orrery/ui/CenterOverlay";
import { PlanetDetailDrawer } from "@/orrery/ui/PlanetDetailDrawer";
import { DashboardControls } from "@/orrery/ui/DashboardControls";

interface SolarSystemHeroProps {
  twilight?: TwilightTimeline | null;
  bortle?: number | null;
}

export default function SolarSystemHero({ }: SolarSystemHeroProps) {
  const [selectedBody, setSelectedBody] = useState<PlanetData | null>(null);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resetCount, setResetCount] = useState<number>(0);
  const [touchMode, setTouchMode] = useState<"scroll" | "orbit">("scroll");

  const handlePan = (dir: 'up' | 'down' | 'left' | 'right' | 'reset') => {
    const step = 6;
    if (dir === 'up') setPanOffset((p) => ({ ...p, y: p.y + step }));
    else if (dir === 'down') setPanOffset((p) => ({ ...p, y: p.y - step }));
    else if (dir === 'left') setPanOffset((p) => ({ ...p, x: p.x - step }));
    else if (dir === 'right') setPanOffset((p) => ({ ...p, x: p.x + step }));
    else {
      setPanOffset({ x: 0, y: 0 });
      setSelectedBody(null);
      setZoomLevel(6);
      setResetCount((c) => c + 1);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 1));
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY < 0) {
        handleZoomIn();
      } else if (e.deltaY > 0) {
        handleZoomOut();
      }
    }
  };

  return (
    <section
      id="hero-section"
      className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-slate-950 font-sans select-none touch-pan-y"
      onWheel={handleWheel}
    >
      {/* 3D Three.js Solar System Canvas */}
      <SolarSystemCanvas
        selectedBody={selectedBody}
        onSelectBody={setSelectedBody}
        timeMultiplier={timeMultiplier}
        isPaused={isPaused}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        resetCount={resetCount}
        touchMode={touchMode}
      />

      {/* Mobile Touch Mode Switcher (Allows smooth page scroll vs 3D camera rotation) */}
      <div className="absolute top-4 left-4 z-20 md:hidden flex items-center gap-1.5 bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md rounded-full p-1 shadow-lg">
        <button
          type="button"
          onClick={() => setTouchMode("scroll")}
          className={`px-3 py-1 rounded-full text-[0.68rem] font-bold tracking-wide transition-all cursor-pointer ${
            touchMode === "scroll"
              ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📱 Scroll Page
        </button>
        <button
          type="button"
          onClick={() => setTouchMode("orbit")}
          className={`px-3 py-1 rounded-full text-[0.68rem] font-bold tracking-wide transition-all cursor-pointer ${
            touchMode === "orbit"
              ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🔄 3D Orbit
        </button>
      </div>

      {/* Center Overview Title Overlay (Visible when no planet is selected) */}
      <CenterOverlay
        isVisible={!selectedBody}
      />

      {/* Right Side Glassmorphic Planet Detail Drawer */}
      <PlanetDetailDrawer
        planet={selectedBody}
        onReturnToSystem={() => setSelectedBody(null)}
      />

      {/* Dashboard Interactive Controls (D-Pad, Zoom slider, Quick jump, Speed controls) */}
      <DashboardControls
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        timeMultiplier={timeMultiplier}
        onSetTimeMultiplier={setTimeMultiplier}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onSelectBody={setSelectedBody}
        selectedBody={selectedBody}
        onPan={handlePan}
      />
    </section>
  );
}
