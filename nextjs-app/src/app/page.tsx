"use client";

import useSWR from "swr";
import SkyHeroConsole from "@/components/SkyHeroConsole";
import ClearOutsideEmbed from "@/components/ClearOutsideEmbed";
import SeeingConditions from "@/components/SeeingConditions";
import MoonCard from "@/components/MoonCard";
import PlanetGrid from "@/components/PlanetGrid";
import ConstellationGrid from "@/components/ConstellationGrid";
import SkyMotion from "@/components/SkyMotion";
import ApodCard from "@/components/ApodCard";
import TargetDatabase from "@/components/TargetDatabase";
import WeeklyForecast from "@/components/WeeklyForecast";
import NightPlanner from "@/components/NightPlanner";
import TelescopeCalculator from "@/components/TelescopeCalculator";
import SolarSystemExplorerCard from "@/components/SolarSystemExplorerCard";
import LightPollutionCard from "@/components/LightPollutionCard";
import SkyMapCard from "@/components/SkyMapCard";
import ObservationLogger from "@/components/ObservationLogger";
import ExternalResourcesCard from "@/components/ExternalResourcesCard";
import Footer from "@/components/Footer";
import type { TonightReport, Target, LocationCoords } from "@/types";
import { HUD_POLL_INTERVAL_MS } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Page() {
  const { data: tonight } = useSWR<TonightReport>("/api/tonight", fetcher, {
    refreshInterval: HUD_POLL_INTERVAL_MS,
  });

  const seeing = tonight?.seeing ?? null;
  const moon = tonight?.moon ?? null;
  const moonFact = tonight?.moon_fact;
  const planets = tonight?.planets ?? [];
  const apod = tonight?.apod ?? null;
  const weekly = tonight?.weekly ?? null;
  const coords: LocationCoords = {
    lat: tonight?.location?.lat ?? 40.13,
    lon: tonight?.location?.lon ?? -83.04,
    city: tonight?.location?.city ?? "Columbus",
  };

  function handleSelectTarget(t: Target) {
    const el = document.getElementById("card-targets");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="w-full max-w-full flex flex-col items-center overflow-x-hidden">
      {/* 3D Solar System Orrery Hero Console */}
      <SkyHeroConsole onSelectTarget={handleSelectTarget} />

      {/* Main Observing Dashboard Body */}
      <div className="w-full max-w-7xl px-3 sm:px-6 py-6 space-y-8 overflow-x-hidden">
        {/* Conditions & Moon Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <SeeingConditions seeing={seeing} />
          <MoonCard moon={moon} moonFact={moonFact} />
        </div>

        {/* Clear Outside Astronomical Weather Chart */}
        <ClearOutsideEmbed coords={coords} />

        {/* Light Pollution Map */}
        <LightPollutionCard coords={coords} />

        {/* APOD + 7-Day Outlook */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
          <ApodCard apod={apod} />
          <WeeklyForecast report={weekly} />
        </div>

        {/* Planets Tonight */}
        <PlanetGrid planets={planets} />

        {/* Active Constellations */}
        <ConstellationGrid />

        {/* Sky Map */}
        <SkyMapCard coords={coords} />

        {/* Deep Sky Target Database */}
        <TargetDatabase />

        {/* Sky Objects in Motion */}
        <SkyMotion />

        {/* Night Planner */}
        <NightPlanner />

        {/* Telescope Optics Calculator */}
        <TelescopeCalculator />

        {/* 3D Solar System Explorer */}
        <SolarSystemExplorerCard />

        {/* Observation Log */}
        <ObservationLogger />

        {/* Resources & Links */}
        <ExternalResourcesCard />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
