"use client";

import React from "react";
import Icon from "./Icon";
import type { ApodData } from "@/types";

interface ApodCardProps {
  apod: ApodData | null;
}

const DEFAULT_APOD: ApodData = {
  title: "Eclipse Pair",
  date: "2026-08-29",
  explanation:
    "Eclipses tend to come in pairs. Twice a year, during an eclipse season that lasts about 34 days, Sun, Moon, and Earth can nearly align. Then the new and full phases of the Moon, separated by just over 14 days, create a solar and a lunar eclipse.",
  url: "https://apod.nasa.gov/apod/image/2404/EclipsePair_Blanck_1080.jpg",
  hdurl: "https://apod.nasa.gov/apod/image/2404/EclipsePair_Blanck_1080.jpg",
  media_type: "image",
  copyright: "© Gwenaël Blanck",
};

export default function ApodCard({ apod }: ApodCardProps) {
  const data = apod && apod.url ? apod : DEFAULT_APOD;

  return (
    <section id="apod-card" className="card w-full mb-8 border border-sky-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="card-header justify-between flex-wrap gap-2 border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="image" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">🌌 NASA Astronomy Picture of the Day</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-slate-400">{data.date}</span>
          <span className="rounded-full border border-sky-400/40 bg-sky-950/40 px-3 py-1 text-xs font-bold text-sky-300 shadow-sm">
            Powered by NASA
          </span>
        </div>
      </div>

      {/* Body matching Screenshot 5 layout */}
      <div className="card-body p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="relative rounded-2xl overflow-hidden bg-black/60 min-h-[260px] flex items-center justify-center border border-white/10 shadow-lg group">
          {data.media_type === "video" ? (
            <iframe src={data.url} title={data.title} className="w-full h-[320px] border-0 rounded-2xl" allowFullScreen />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.url}
              alt={data.title}
              title="Click to view in HD"
              className="w-full h-auto max-h-[380px] object-cover rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
            />
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 py-2">
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-white leading-snug">{data.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">{data.explanation}</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs font-semibold text-slate-400">{data.copyright || "© NASA"}</span>
            <a
              href="https://apod.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Full Archive</span>
              <Icon name="external-link" className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
