"use client";

import React, { useState, useEffect } from "react";
import type { PlanetData } from "@/orrery/types";
import type { TwilightTimeline } from "@/types";
import { SolarSystemCanvas } from "@/orrery/3d/SolarSystemCanvas";
import { CenterOverlay } from "@/orrery/ui/CenterOverlay";
import { PlanetDetailDrawer } from "@/orrery/ui/PlanetDetailDrawer";
import { DashboardControls } from "@/orrery/ui/DashboardControls";

// ── Dark-in countdown helper ────────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr || timeStr.length < 5) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(minutes: number): string {
  const absMin = Math.abs(Math.round(minutes));
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function useDarkInCountdown(
  astroStart: string | null,
  astroEnd: string | null,
  sunrise: string | null
): string {
  const [display, setDisplay] = useState("12.8h");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      const startMin = parseTimeToMinutes(astroStart);
      const endMin = parseTimeToMinutes(astroEnd) ?? parseTimeToMinutes(sunrise);

      if (startMin === null) {
        setDisplay("12.8h");
        return;
      }

      if (endMin !== null && startMin > endMin) {
        if (currentMin >= startMin) {
          const totalDark = (1440 - startMin) + endMin;
          const elapsed = currentMin - startMin;
          setDisplay(`${formatDuration(totalDark - elapsed)} left`);
        } else if (currentMin < endMin) {
          const remaining = endMin - currentMin;
          setDisplay(`${formatDuration(remaining)} left`);
        } else {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        }
      } else if (endMin !== null) {
        if (currentMin >= startMin && currentMin < endMin) {
          setDisplay(`${formatDuration(endMin - currentMin)} left`);
        } else if (currentMin < startMin) {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        } else {
          setDisplay(`In ${formatDuration(1440 - currentMin + startMin)}`);
        }
      } else {
        if (currentMin < startMin) {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        } else {
          setDisplay(`In ${formatDuration(1440 - currentMin + startMin)}`);
        }
      }
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [astroStart, astroEnd, sunrise]);

  return display;
}

interface SolarSystemHeroProps {
  twilight?: TwilightTimeline | null;
  bortle?: number | null;
}

export default function SolarSystemHero({ twilight, bortle }: SolarSystemHeroProps) {
  const [selectedBody, setSelectedBody] = useState<PlanetData | null>(null);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePan = (dir: 'up' | 'down' | 'left' | 'right' | 'reset') => {
    const step = 6;
    if (dir === 'up') setPanOffset((p) => ({ ...p, y: p.y + step }));
    else if (dir === 'down') setPanOffset((p) => ({ ...p, y: p.y - step }));
    else if (dir === 'left') setPanOffset((p) => ({ ...p, x: p.x - step }));
    else if (dir === 'right') setPanOffset((p) => ({ ...p, x: p.x + step }));
    else setPanOffset({ x: 0, y: 0 });
  };

  const darkInValue = useDarkInCountdown(
    twilight?.astro_start ?? null,
    twilight?.astro_end ?? null,
    twilight?.sunrise ?? null
  );
  const bortleValue = bortle ? `B${bortle}` : "B6";

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 10));
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
      />

      {/* Center Overview Title Overlay (Visible when no planet is selected) */}
      <CenterOverlay
        isVisible={!selectedBody}
        darkInValue={darkInValue}
        bortleValue={bortleValue}
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
