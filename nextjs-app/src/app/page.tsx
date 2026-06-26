import SolarSystemHero from "@/components/SolarSystemHero";
import StarfieldBackground from "@/components/StarfieldBackground";
import PlanetGrid from "@/components/PlanetGrid";
import TonightOutlook from "@/components/TonightOutlook";
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

export default function Home() {
  return (
    <>
      <StarfieldBackground />
      <SolarSystemHero />
      <div className="flex w-full flex-col items-center gap-8 p-4 sm:p-8">
        <GoNoGoBanner />
        <TonightOutlook />
        <ActiveConstellation />
        <ConstellationsTonight />
        <TargetDatabase />
        <SkyMotion />
        <WeeklyForecast />
        <PlanetGrid />
        <ClearOutsideEmbed />
        <ObservationLog />
        <Resources />
        <Footer />
      </div>
    </>
  );
}
