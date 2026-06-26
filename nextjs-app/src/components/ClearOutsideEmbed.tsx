"use client";

import { CloudSun } from "lucide-react";

export default function ClearOutsideEmbed() {
  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <CloudSun className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Astronomical Weather</h2>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <iframe
          src="https://clearoutside.com"
          title="Clear Outside — Astronomical Seeing & Cloud Forecast"
          className="w-full h-[400px] border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        />
      </div>

      <p className="text-[0.65rem] text-zinc-600 mt-2 text-center">
        Powered by <a href="https://clearoutside.com" target="_blank" rel="noopener" className="text-zinc-500 hover:text-zinc-300 underline">ClearOutside.com</a> — seeing, cloud, and transparency forecasts for astronomers
      </p>
    </section>
  );
}
