import { cookies } from "next/headers";
import SolarSystemHero from "@/components/SolarSystemHero";
import StarfieldBackground from "@/components/StarfieldBackground";
import PlanetGrid from "@/components/PlanetGrid";
import SeeingConditions from "@/components/SeeingConditions";
import MoonCard from "@/components/MoonCard";
import ActiveConstellation from "@/components/ActiveConstellation";
import ConstellationsTonight from "@/components/ConstellationsTonight";
import TargetDatabase from "@/components/TargetDatabase";
import SkyMotion from "@/components/SkyMotion";
import WeeklyForecast from "@/components/WeeklyForecast";
import GoNoGoBanner from "@/components/GoNoGoBanner";
import ClearOutsideEmbed from "@/components/ClearOutsideEmbed";
import ObservationLog from "@/components/ObservationLog";
import Resources from "@/components/Resources";
import Footer from "@/components/Footer";
import CardRow from "@/components/CardRow";
import AiTargets from "@/components/AiTargets";
import { fetchBackend } from "@/lib/api-proxy";
import { REVALIDATE, LOCATION_COOKIE } from "@/lib/constants";
import { parseLocationCookie } from "@/lib/location-cookie";
import type { TonightReport, WeeklyReport, PlanetsResponse, ConstellationsResponse } from "@/types";

export default async function Home() {
  const cookieStore = await cookies();
  const coords = parseLocationCookie(cookieStore.get(LOCATION_COOKIE)?.value);
  const locSearch = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";

  const [tonight, weekly, planetsData, constellationsData] = await Promise.all([
    fetchBackend<TonightReport>("/tonight", locSearch, REVALIDATE.tonight),
    fetchBackend<WeeklyReport>("/weekly", locSearch, REVALIDATE.weekly),
    fetchBackend<PlanetsResponse>("/planets", locSearch, REVALIDATE.planets),
    fetchBackend<ConstellationsResponse>("/constellations", locSearch, REVALIDATE.constellations),
  ]);

  return (
    <>
      <StarfieldBackground />
      <SolarSystemHero />
      <div className="flex w-full flex-col items-center gap-8">
        <div className="w-full max-w-5xl px-4 sm:px-8 py-8">
          <GoNoGoBanner seeing={tonight?.seeing ?? null} />
          <CardRow id="card-tonight">
            <SeeingConditions seeing={tonight?.seeing ?? null} />
            <MoonCard moon={tonight?.moon ?? null} moonFact={tonight?.seeing?.moon_fact} />
            <SkyMotion />
          </CardRow>
          <AiTargets bestTargets={tonight?.best_targets_tonight} mustSee={tonight?.must_see} />
          <PlanetGrid planets={planetsData?.planets} />
          <ActiveConstellation />
          <ConstellationsTonight constellations={constellationsData?.constellations} />
          <TargetDatabase />
          <WeeklyForecast report={weekly} />
          <ClearOutsideEmbed />
          <ObservationLog />
          <Resources />
          <Footer />
        </div>
      </div>
    </>
  );
}
