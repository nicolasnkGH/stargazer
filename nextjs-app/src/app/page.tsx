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
import ClearOutsideEmbed from "@/components/ClearOutsideEmbed";
import ObservationLog from "@/components/ObservationLog";
import Resources from "@/components/Resources";
import Footer from "@/components/Footer";
import CardRow from "@/components/CardRow";
import AiTargets from "@/components/AiTargets";
import PlanMyNight from "@/components/PlanMyNight";
import TelescopeCalculator from "@/components/TelescopeCalculator";
import SolarSystemExplorerCard from "@/components/SolarSystemExplorerCard";
import LightPollutionCard from "@/components/LightPollutionCard";
import AuroraCard from "@/components/AuroraCard";
import ApodCard from "@/components/ApodCard";
import DashboardTabs from "@/components/DashboardTabs";
import { fetchBackend } from "@/lib/api-proxy";
import { REVALIDATE, LOCATION_COOKIE } from "@/lib/constants";
import { parseLocationCookie } from "@/lib/location-cookie";
import type {
  TonightReport,
  WeeklyReport,
  PlanetsResponse,
  ConstellationsResponse,
  BortleInfo,
  AuroraForecast,
  SpaceWeatherReport,
  ApodData,
} from "@/types";

export default async function Home() {
  const cookieStore = await cookies();
  const coords = parseLocationCookie(cookieStore.get(LOCATION_COOKIE)?.value);
  const locSearch = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";

  const [tonight, weekly, planetsData, constellationsData, bortle, aurora, spaceWeather, apod] = await Promise.all([
    fetchBackend<TonightReport>("/tonight", locSearch, REVALIDATE.tonight),
    fetchBackend<WeeklyReport>("/weekly", locSearch, REVALIDATE.weekly),
    fetchBackend<PlanetsResponse>("/planets", locSearch, REVALIDATE.planets),
    fetchBackend<ConstellationsResponse>("/constellations", locSearch, REVALIDATE.constellations),
    fetchBackend<BortleInfo>("/api/bortle", locSearch, REVALIDATE.bortle),
    fetchBackend<AuroraForecast>("/api/aurora", coords ? `?lat=${coords.lat}` : "", REVALIDATE.aurora),
    fetchBackend<SpaceWeatherReport>("/nasa/space-weather", "", REVALIDATE.spaceWeather),
    fetchBackend<ApodData>("/nasa/apod", "", REVALIDATE.apod),
  ]);

  return (
    <div className="w-full max-w-full overflow-x-hidden flex flex-col items-center">
      <StarfieldBackground />
      <SolarSystemHero
        twilight={tonight?.twilight_timeline}
        bortle={bortle?.bortle}
      />
      <div className="flex w-full flex-col items-center gap-6 overflow-x-hidden">
        <div className="w-full max-w-[1600px] px-2 sm:px-8 py-6 space-y-6 overflow-x-hidden">
          {/* Top Dashboard: Pinned "At-a-Glance" Data */}
          <div className="w-full space-y-6">
            <CardRow id="card-tonight">
              <SeeingConditions seeing={tonight?.seeing ?? null} twilight={tonight?.twilight_timeline} />
              <MoonCard moon={tonight?.moon ?? null} moonFact={tonight?.seeing?.moon_fact} />
              <SkyMotion />
            </CardRow>

            {/* Pinned Weather Forecast Chart */}
            <ClearOutsideEmbed coords={coords} />
          </div>

          {/* Tabbed Navigation Interface */}
          <DashboardTabs
            tabSkyMap={
              <>
                <ActiveConstellation />
                <ConstellationsTonight constellations={constellationsData?.constellations} />
                <AiTargets bestTargets={tonight?.best_targets_tonight} mustSee={tonight?.must_see} />
                <TargetDatabase />
                <PlanMyNight />
              </>
            }
            tabPlanets={
              <>
                <PlanetGrid planets={planetsData?.planets} />
                <SolarSystemExplorerCard />
              </>
            }
            tabTools={
              <>
                <WeeklyForecast report={weekly} />
                <LightPollutionCard bortle={bortle} />
                <AuroraCard aurora={aurora} spaceWeather={spaceWeather} />
                <ApodCard apod={apod} />
                <TelescopeCalculator />
                <ObservationLog />
                <Resources />
              </>
            }
          />

          <Footer />
        </div>
      </div>
    </div>
  );
}
