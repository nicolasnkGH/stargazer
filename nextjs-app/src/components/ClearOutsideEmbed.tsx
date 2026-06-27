"use client";

import { CloudSun } from "lucide-react";

export default function ClearOutsideEmbed() {
  return (
    <section className="card w-full">
      <div className="card-header">
        <CloudSun className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2>Astronomical Weather</h2>
      </div>
      <div className="card-body px-0 py-0 overflow-hidden rounded-b-xl">
        <iframe
          src="https://clearoutside.com"
          title="Clear Outside — Astronomical Seeing & Cloud Forecast"
          className="w-full h-[400px] border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        />
      </div>
    </section>
  );
}
