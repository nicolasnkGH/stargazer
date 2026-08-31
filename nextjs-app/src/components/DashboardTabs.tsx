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
      {/* Sticky Tab Bar */}
      <div className="sticky top-20 sm:top-16 z-30 w-full py-2 bg-slate-950/95 backdrop-blur-2xl border-b border-cyan-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
        <div className="relative max-w-7xl mx-auto flex items-center px-2 sm:px-4">
          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs("left")}
              className="absolute left-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 shadow-lg hover:bg-cyan-500/20 transition-all cursor-pointer"
              title="Scroll tabs left"
              aria-label="Scroll tabs left"
            >
              ‹
            </button>
          )}

          {/* Scrollable Container with Gradient Fade Mask */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto px-2 py-1 scrollbar-none w-full"
            style={{
              maskImage: canScrollLeft && canScrollRight
                ? "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)"
                : canScrollRight
                ? "linear-gradient(to right, black calc(100% - 32px), transparent)"
                : canScrollLeft
                ? "linear-gradient(to right, transparent, black 32px)"
                : undefined,
              WebkitMaskImage: canScrollLeft && canScrollRight
                ? "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)"
                : canScrollRight
                ? "linear-gradient(to right, black calc(100% - 32px), transparent)"
                : canScrollLeft
                ? "linear-gradient(to right, transparent, black 32px)"
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
                  className={`group relative flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer select-none flex-shrink-0 ${
                    isActive
                      ? "text-white bg-gradient-to-r from-sky-600/40 to-indigo-600/40 border border-sky-400/70 shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-1 ring-sky-400/50 scale-[1.02]"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-white/10 bg-slate-900/60"
                  }`}
                >
                  <Icon
                    name={tab.icon}
                    className={`h-4 w-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-sky-400 animate-pulse" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  <span>{label}</span>
                  {badge && (
                    <span
                      className={`text-[0.62rem] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                        isActive
                          ? "bg-sky-500/30 text-sky-200 border border-sky-400/40"
                          : "bg-white/5 text-zinc-500 hidden sm:inline-block"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs("right")}
              className="absolute right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 shadow-lg hover:bg-cyan-500/20 transition-all cursor-pointer"
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
