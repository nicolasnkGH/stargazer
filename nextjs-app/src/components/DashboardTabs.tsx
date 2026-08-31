"use client";

import React, { useState, useEffect } from "react";
import Icon from "./Icon";

type TabKey = "sky" | "planets" | "tools";

interface DashboardTabsProps {
  tabSkyMap: React.ReactNode;
  tabPlanets: React.ReactNode;
  tabTools: React.ReactNode;
}

const TABS: Array<{ key: TabKey; label: string; icon: string; badge?: string }> = [
  { key: "sky", label: "Sky Map & Targets", icon: "sparkles", badge: "3D & Catalog" },
  { key: "planets", label: "Planet Tracker & Solar System", icon: "orbit", badge: "Live Positions" },
  { key: "tools", label: "Tools & Maps", icon: "compass", badge: "Forecast & Logs" },
];

// Mapping of section IDs to their owning tab
const SECTION_TAB_MAP: Record<string, TabKey> = {
  "card-active-const": "sky",
  "card-constellations": "sky",
  "card-targets": "sky",
  "card-plan-my-night": "sky",
  "card-ai-targets": "sky",
  "card-planets": "planets",
  "card-solar-system-scope": "planets",
  "card-weekly": "tools",
  "card-light-pollution": "tools",
  "card-space-weather": "tools",
  "apod-card": "tools",
  "card-optics": "tools",
  "card-log": "tools",
  "card-resources": "tools",
};

export default function DashboardTabs({
  tabSkyMap,
  tabPlanets,
  tabTools,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("sky");

  // Sync tab with URL hash if navigated from header
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && SECTION_TAB_MAP[hash]) {
        setActiveTab(SECTION_TAB_MAP[hash]);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Sticky Tab Bar */}
      <div className="sticky top-14 z-30 w-full py-2 bg-slate-950/80 backdrop-blur-lg border-b border-white/10 shadow-2xl">
        <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto px-2 scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                }}
                className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? "text-white bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.02]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/5"
                }`}
              >
                <Icon
                  name={tab.icon}
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-sky-400 animate-pulse" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`hidden md:inline-block text-[0.65rem] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels: All mounted in DOM with CSS display toggling for instant switching & test compatibility */}
      <div className={activeTab === "sky" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabSkyMap}
      </div>

      <div className={activeTab === "planets" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabPlanets}
      </div>

      <div className={activeTab === "tools" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabTools}
      </div>
    </div>
  );
}
