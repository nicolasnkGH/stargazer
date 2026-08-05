"use client";

import { useState, useEffect, useRef } from "react";
import { Telescope, MapPin, Info, Menu } from "lucide-react";

const NAV_LINKS = [
  { href: "#card-tonight", label: "Tonight's Outlook" },
  { href: "#card-active-const", label: "Active Constellation" },
  { href: "#card-targets", label: "Target Database" },
  { href: "#card-motion", label: "Sky Objects in Motion" },
  { href: "#card-weekly", label: "7-Day Forecast" },
];

const LANG_OPTIONS = [
  { value: "en", label: "\u{1F1FA}\u{1F1F8} EN" },
  { value: "es", label: "\u{1F1EA}\u{1F1F8} ES" },
  { value: "pt", label: "\u{1F1F7}\u{1F1F7} PT" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("--:-- --");
  const [currentDate, setCurrentDate] = useState("Loading...");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Clock tick
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-slate-950/90 py-3.5 px-8 backdrop-blur-xl">
      <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <Telescope className="h-6 w-6 animate-float text-sky-400 drop-shadow-[0_0_12px_rgba(74,158,255,0.5)]" strokeWidth={1.5} />
          <div className="flex flex-col items-start">
            <span className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-[1.4rem] font-bold leading-tight tracking-tight text-transparent"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              StarGazer
            </span>
            <span className="text-[0.75rem] text-sky-400/80 transition-opacity hover:opacity-100 hover:underline cursor-pointer">
              Astronomy made simple.
            </span>
            <div className="mt-2 flex flex-col items-start gap-0.5">
              <span className="text-[0.7rem] font-semibold text-zinc-400">Loading location...</span>
              <span className="font-mono text-[0.75rem] text-zinc-500/60 tracking-widest">Lat: --, Lon: --</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          {/* Telemetry group */}
          <div className="flex items-center gap-7 border-r border-white/10 pr-4">
            {/* Live badge */}
            <div className="hidden items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[0.7rem] font-bold tracking-[0.12em] text-green-500 md:flex">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              LIVE
            </div>

            {/* Moon & weather */}
            <div className="flex items-center gap-3 font-mono text-[0.75rem] text-slate-400">
              <span id="hud-moon">🌙 --</span>
              <span id="hud-weather">🌡️ -- | 💨 --</span>
            </div>

            {/* Clock */}
            <div className="hidden items-center gap-2 font-mono md:flex">
              <span id="clock" className="text-[0.85rem]">{currentTime}</span>
              <span id="date-display" className="text-[0.75rem] text-zinc-400">{currentDate}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              title="Toggle Units"
            >
              °C / km
            </button>

            <select className="hidden rounded-lg border border-white/10 bg-slate-900/50 py-1 pl-3 pr-8 text-sm text-zinc-200 outline-none hover:border-white/30 md:block"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
              title="About StarGazer"
            >
              <Info className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Menu button + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 transition hover:bg-purple-600/20 hover:border-purple-500/50"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Navigation"
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
                <span className="hidden text-[0.8rem] font-semibold uppercase tracking-wider md:inline">Menu</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[45px] z-[9999] min-w-[200px] rounded-lg border border-purple-500/40 bg-[rgba(20,20,30,0.95)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
                  {/* Mobile-only clock + lang inside dropdown */}
                  <div className="mb-2 block border-b border-white/10 pb-2 font-mono text-[0.8rem] text-slate-400 md:hidden">
                    <div className="text-zinc-200">{currentTime}</div>
                    <div className="mt-1">{currentDate}</div>
                    <select className="mt-2 w-full rounded border border-white/10 bg-slate-900/50 py-1 pl-3 pr-8 text-sm text-zinc-200"
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                    >
                      {LANG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block rounded px-4 py-2.5 text-[0.9rem] text-zinc-200 transition hover:bg-purple-600/20 hover:text-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
