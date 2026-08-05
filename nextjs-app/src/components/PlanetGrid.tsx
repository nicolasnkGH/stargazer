import { Orbit, Info } from "lucide-react";
import type { PlanetData } from "@/types";

function PlanetCard({ planet }: { planet: PlanetData }) {
  const altStr = `${planet.altitude_deg}° ${planet.direction}`;
  const magStr = `Mag ${planet.magnitude_approx}`;
  const distStr = `${planet.distance_mkm}M km (${planet.light_time_minutes} min light)`;

  return (
    <div className={`flex flex-col card transition-colors hover:border-sky-400/18 ${planet.visible_tonight ? "" : "opacity-45"}`}>
      {/* 3D canvas placeholder — planets3d.js mounts here */}
      <div
        className="relative h-[200px] w-full flex-shrink-0 overflow-hidden bg-transparent"
        style={{
          background: "radial-gradient(circle at center, rgba(30,40,60,0.3) 0%, transparent 70%)",
        }}
        data-planet={planet.name.toLowerCase()}
      >
        <canvas className="h-full w-full" />
      </div>

      {/* Info column */}
      <div className="flex flex-col gap-1.5 p-4">
        {/* Name row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <span className="text-xl">{planet.emoji}</span>
            {planet.name}
          </span>
          {planet.naked_eye && (
            <span className="rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-purple-400">
              Naked Eye
            </span>
          )}
        </div>

        {/* Constellation pill */}
        <span className="inline-block w-fit rounded border border-zinc-600/30 bg-zinc-700/15 px-2 py-0.5 text-[0.7rem] text-zinc-300">
          {planet.constellation}
        </span>

        {/* Meta rows */}
        <div className="flex flex-col gap-1 font-mono text-[0.75rem]">
          <span className="block w-full truncate text-sky-400 font-medium" title={altStr}>
            {altStr}
          </span>
          <span className="block w-full truncate text-amber-300" title={magStr}>
            {magStr}
          </span>
          <span className="block w-full truncate text-zinc-400" title={distStr}>
            {distStr}
          </span>
        </div>

        {/* Bottom info */}
        <div className="mt-2 border-t border-purple-500/18 pt-2 text-[0.78rem] text-zinc-400 flex flex-col gap-0.5">
          <span className={`font-semibold text-[0.78rem] ${planet.visible_tonight ? "text-purple-300" : "text-zinc-500"}`}>
            <span
              className={`mr-1.5 inline-block h-[7px] w-[7px] rounded-full ${planet.visible_tonight ? "bg-green-500" : "bg-zinc-600"}`}
            />
            {planet.visible_tonight ? "Visible tonight" : "Not visible tonight"}
          </span>
          <span className="truncate">{planet.how_to_find}</span>
          <span className="text-zinc-500">
            Rise: {planet.rise_time} · Set: {planet.set_time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetGrid({ planets = [] }: { planets?: PlanetData[] }) {
  return (
    <section className="card card-planets">
      {/* Card header */}
      <div className="card-header">
        <Orbit className="h-5 w-5" strokeWidth={1.6} />
        <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">
          Planets Tonight
        </h2>
        <span
          className="ml-1.5 flex cursor-pointer items-center"
          title="Calculated locally via Skyfield Ephemeris"
        >
          <Info className="h-[14px] w-[14px] stroke-zinc-500/60" strokeWidth={1.5} />
        </span>
      </div>

      {/* Card body — responsive grid */}
      <div className="p-5">
        {planets.length === 0 ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            Planet data unavailable.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {planets.map((p) => (
              <PlanetCard key={p.name} planet={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
