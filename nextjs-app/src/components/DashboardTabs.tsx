"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";

type TabKey = "sky" | "ai" | "planets" | "plan" | "tools";

interface DashboardTabsProps {
  tabSkyMap: React.ReactNode;
  tabAiPicks: React.ReactNode;
  tabPlanets: React.ReactNode;
  tabPlanMyNight: React.ReactNode;
  tabTools: React.ReactNode;
}

interface TabDef {
  key: TabKey;
  labelKey: string;
  badgeKey?: string;
  icon: string;
  defaultLabel: string;
  defaultBadge?: string;
}

const TABS: TabDef[] = [
  { key: "sky", labelKey: "tab_sky", badgeKey: "tab_sky_badge", icon: "sparkles", defaultLabel: "Sky Map & Targets", defaultBadge: "3D & Catalog" },
  { key: "ai", labelKey: "tab_ai", badgeKey: "tab_ai_badge", icon: "sparkles", defaultLabel: "AI Picks", defaultBadge: "Must-See" },
  { key: "planets", labelKey: "tab_planets", badgeKey: "tab_planets_badge", icon: "orbit", defaultLabel: "Planet Tracker & Solar System", defaultBadge: "Live Positions" },
  { key: "plan", labelKey: "tab_plan", badgeKey: "tab_plan_badge", icon: "calendar-days", defaultLabel: "Plan My Night", defaultBadge: "Checklist & Planner" },
  { key: "tools", labelKey: "tab_tools", badgeKey: "tab_tools_badge", icon: "compass", defaultLabel: "Tools & Maps", defaultBadge: "Forecast & Logs" },
];

const SECTION_TAB_MAP: Record<string, TabKey> = {
  "card-active-const": "sky",
  "card-constellations": "sky",
  "card-targets": "sky",
  "card-ai-targets": "ai",
  "card-planets": "planets",
  "card-solar-system-scope": "planets",
  "card-plan-my-night": "plan",
  "card-preflight": "plan",
  "card-weekly": "tools",
  "card-light-pollution": "tools",
  "card-space-weather": "tools",
  "card-optics": "tools",
  "card-log": "plan",
  "card-resources": "tools",
};

export default function DashboardTabs({
  tabSkyMap,
  tabAiPicks,
  tabPlanets,
  tabPlanMyNight,
  tabTools,
}: DashboardTabsProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>("sky");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (el) {
      const amount = direction === "left" ? -240 : 240;
      el.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  // Sync tab with URL hash if navigated from header or tour
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && SECTION_TAB_MAP[hash]) {
        setActiveTab(SECTION_TAB_MAP[hash]);
      }
    };

    handleHash();
    const handleTabNav = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as TabKey;
      if (tab) setActiveTab(tab);
    };

    window.addEventListener("hashchange", handleHash);
    window.addEventListener("sg-navigate-tab", handleTabNav);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("sg-navigate-tab", handleTabNav);
    };
  }, []);

  const getLabel = (tab: TabDef) => {
    try {
      const val = t(tab.labelKey);
      if (!val || val === tab.labelKey) return tab.defaultLabel;
      return val;
    } catch {
      return tab.defaultLabel;
    }
  };

  const getBadge = (tab: TabDef) => {
    if (!tab.badgeKey) return tab.defaultBadge;
    try {
      const val = t(tab.badgeKey);
      if (!val || val === tab.badgeKey) return tab.defaultBadge;
      return val;
    } catch {
      return tab.defaultBadge;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Ultra-High-Contrast Observatory Sticky Tab Bar */}
      <div className="sticky top-14 sm:top-12 z-40 w-full py-2.5 bg-slate-950/95 backdrop-blur-3xl border-y-2 border-cyan-400/40 shadow-[0_12px_45px_rgba(0,0,0,0.95),0_0_20px_rgba(6,182,212,0.2)]">
        <div className="relative max-w-7xl mx-auto flex items-center px-2 sm:px-4">
          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs("left")}
              className="absolute left-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:bg-cyan-500/30 transition-all cursor-pointer"
              title="Scroll tabs left"
              aria-label="Scroll tabs left"
            >
              ‹
            </button>
          )}

          {/* High-Contrast Capsule Navigation Dock */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto p-2 rounded-2xl bg-slate-900/95 border-2 border-cyan-500/30 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8),0_0_15px_rgba(6,182,212,0.15)] scrollbar-none w-full"
            style={{
              maskImage: canScrollLeft && canScrollRight
                ? "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)"
                : canScrollRight
                ? "linear-gradient(to right, black calc(100% - 36px), transparent)"
                : canScrollLeft
                ? "linear-gradient(to right, transparent, black 36px)"
                : undefined,
              WebkitMaskImage: canScrollLeft && canScrollRight
                ? "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)"
                : canScrollRight
                ? "linear-gradient(to right, black calc(100% - 36px), transparent)"
                : canScrollLeft
                ? "linear-gradient(to right, transparent, black 36px)"
                : undefined,
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const label = getLabel(tab);
              const badge = getBadge(tab);
              return (
                <button
                  key={tab.key}
                  id={`tab-btn-${tab.key}`}
                  data-tab={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                  }}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer select-none flex-shrink-0 ${
                    isActive
                      ? "text-cyan-100 bg-gradient-to-r from-cyan-600/40 via-sky-600/35 to-indigo-600/40 border-2 border-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.65),inset_0_0_15px_rgba(6,182,212,0.25)] ring-2 ring-cyan-400/70 scale-[1.04]"
                      : "text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-cyan-400/60 hover:shadow-[0_0_18px_rgba(6,182,212,0.35)]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-cyan-400/30 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                        : "bg-slate-700/60 text-slate-300 group-hover:text-cyan-300 group-hover:bg-cyan-500/20"
                    }`}
                  >
                    <Icon
                      name={tab.icon}
                      className={`h-4 w-4 transition-transform group-hover:scale-125 ${
                        isActive ? "text-cyan-200 animate-pulse" : ""
                      }`}
                    />
                  </div>
                  <span className="drop-shadow-sm">{label}</span>
                  {badge && (
                    <span
                      className={`text-[0.68rem] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
                        isActive
                          ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                          : "bg-slate-700/80 text-cyan-300 border border-cyan-500/40 group-hover:border-cyan-400 group-hover:bg-cyan-950/80 hidden sm:inline-block"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 rounded-full shadow-[0_0_16px_rgba(6,182,212,1),0_0_30px_rgba(6,182,212,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs("right")}
              className="absolute right-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:bg-cyan-500/30 transition-all cursor-pointer"
              title="Scroll tabs right"
              aria-label="Scroll tabs right"
            >
              ›
            </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div className={activeTab === "sky" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabSkyMap}
      </div>

      <div className={activeTab === "ai" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabAiPicks}
      </div>

      <div className={activeTab === "planets" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabPlanets}
      </div>

      <div className={activeTab === "plan" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabPlanMyNight}
      </div>

      <div className={activeTab === "tools" ? "block space-y-8 animate-fadeIn" : "hidden"}>
        {tabTools}
      </div>
    </div>
  );
}
