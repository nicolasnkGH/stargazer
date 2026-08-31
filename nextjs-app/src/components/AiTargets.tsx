import React from "react";
import Icon from "./Icon";
import type { MustSeeTarget } from "@/types";

interface AiTargetsProps {
  bestTargets?: MustSeeTarget[];
  mustSee?: MustSeeTarget[];
}

export default function AiTargets({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bestTargets = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mustSee = [],
}: AiTargetsProps) {
  return (
    <section id="card-ai-targets" className="card w-full mb-8 border border-cyan-500/30 bg-slate-950/95 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="card-header justify-between border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 relative z-20">
        <div className="flex items-center gap-2">
          <Icon name="compass" className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">Must-See &amp; AI Picks</h2>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3.5 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
          Curated for tonight
        </span>
      </div>

      {/* Grid Content with 1:1 Vanilla HUD Screen Scanlines & Glassmorphism */}
      <div className="card-body p-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: AI Observer Briefing with Cyan Glow & Scanline Backdrop */}
          <div className="hud-card relative rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(45,212,191,0.15)] overflow-hidden group">
            {/* Horizontal HUD Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.04)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_rgba(45,212,191,0.9)] z-20" />
            
            <div className="space-y-3 pl-2 relative z-20">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <span>🧁</span>
                <span>AI OBSERVER&#39;S BRIEFING</span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-100/90 italic leading-relaxed font-serif">
                &quot;The extremely high cloud cover (96.4%), low visibility (2.9 km), and significant precipitation probability (63.2%) make astronomical observation impossible tonight. Additionally, the very low dew point spread indicates a high risk of dew formation on optics.&quot;
              </p>
            </div>
            <div className="pl-2 pt-4 border-t border-cyan-500/20 mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300 relative z-20">
              <Icon name="telescope" className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>Best window: <span className="text-cyan-300 font-bold font-mono">N/A</span></span>
            </div>
          </div>

          {/* Card 2: Leo is UP */}
          <div className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="flex items-start justify-between relative z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-slate-200 font-serif">Leo</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-sm">Leo is UP</span>
                    <span className="rounded bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-300">Excellent</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Excellent conditions</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 relative z-20">
              <button className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer">
                Add to Plan +
              </button>
            </div>
          </div>

          {/* Card 3: Jupiter */}
          <div className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="flex items-start justify-between relative z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-slate-200 font-serif">♃</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-sm">Jupiter</span>
                    <span className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">84.3° ESE (114.9°)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">spot the 4 Galilean moons!</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 relative z-20">
              <button className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer">
                Add to Plan +
              </button>
            </div>
          </div>

          {/* Card 4: Mars */}
          <div className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="flex items-start justify-between relative z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-slate-200 font-serif">♂</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-sm">Mars</span>
                    <span className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">64.4° WNW (283.0°)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">look for the polar ice caps!</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 relative z-20">
              <button className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer">
                Add to Plan +
              </button>
            </div>
          </div>

          {/* Card 5: Mercury */}
          <div className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="flex items-start justify-between relative z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-slate-200 font-serif">☿</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-sm">Mercury</span>
                    <span className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">59.0° ESE (104.2°)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">catch it quickly before it sets!</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 relative z-20">
              <button className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer">
                Add to Plan +
              </button>
            </div>
          </div>

          {/* Card 6: Did You Know Trivia with Glowing Purple Glow & Scanlines */}
          <div className="hud-card relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/50 via-slate-900/90 to-slate-950/95 p-5 flex items-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.15)] overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.04)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <span className="text-amber-300 text-sm flex-shrink-0 relative z-20">✨</span>
            <div className="relative z-20">
              <span className="font-bold text-purple-300 text-xs uppercase tracking-wider block mb-1">
                DID YOU KNOW?
              </span>
              <p className="text-xs text-purple-100/90 leading-relaxed font-medium">
                Saturn&#39;s rings are mostly made of chunks of ice and rock.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
