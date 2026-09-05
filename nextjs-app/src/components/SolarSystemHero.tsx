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

  return (
    <section id="hero-section" className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D Three.js Solar System Canvas */}
      <SolarSystemCanvas
        selectedBody={selectedBody}
        onSelectBody={setSelectedBody}
        timeMultiplier={timeMultiplier}
        isPaused={isPaused}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        resetCount={resetCount}
      />

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
