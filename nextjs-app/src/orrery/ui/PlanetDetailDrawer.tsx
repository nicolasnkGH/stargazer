import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Thermometer, Orbit, RotateCw, Moon, Sparkles, Compass } from 'lucide-react';
import { PlanetData } from '../types';
const TEXTURE_MAP: Record<string, string> = {
  sun: '/assets/2k_sun.jpg',
  mercury: '/assets/mercury.jpg',
  venus: '/assets/venus.jpg',
  earth: '/assets/2k_earth_daymap.jpg',
  moon: '/assets/moon_texture.jpg',
  mars: '/assets/mars.jpg',
  jupiter: '/assets/jupiter.jpg',
  saturn: '/assets/saturn.jpg',
  uranus: '/assets/uranus.jpg',
  neptune: '/assets/neptune.jpg',
};

const LOCALIZED_BODIES: Record<string, Record<string, string>> = {
  pt: {
    sun: "SOL", mercury: "MERCÚRIO", venus: "VÊNUS", earth: "TERRA", moon: "LUA",
    mars: "MARTE", jupiter: "JÚPITER", saturn: "SATURNO", uranus: "URANO", neptune: "NETUNO"
  },
  es: {
    sun: "SOL", mercury: "MERCURIO", venus: "VENUS", earth: "TIERRA", moon: "LUNA",
    mars: "MARTE", jupiter: "JÚPITER", saturn: "SATURNO", uranus: "URANO", neptune: "NEPTUNO"
  }
};

const LOCALIZED_TIPS: Record<string, Record<string, string>> = {
  pt: {
    saturn: "A divisão de Cassini nos anéis de Saturno e sua maior lua, Titã, são alvos deslumbrantes com qualquer telescópio moderado.",
    jupiter: "Observe a Grande Mancha Vermelha e a dança diária das 4 luas Galileanas.",
    mars: "Exibe calotas polares de gelo e marcas escuras na superfície perto da oposição.",
    venus: "Apresenta fases impressionantes semelhantes às da Lua quando observada ao telescópio.",
    mercury: "Melhor observado no crepúsculo perto da elongação máxima.",
    moon: "Crateras, mares lunares e cadeias de montanhas revelam detalhes incríveis no exterminador.",
    sun: "Nunca observe diretamente sem filtros solares ISO 12312-2 dedicados.",
    uranus: "Pequeno disco azul-esverdeado visível com binóculos ou pequenos telescópios.",
    neptune: "Ponto azul fraco no céu profundo; requer telescópio e cartas de busca."
  },
  es: {
    saturn: "La división de Cassini en los anillos de Saturno y su luna más grande, Titán, son objetivos impresionantes a través de cualquier telescopio modesto.",
    jupiter: "Observa la Gran Mancha Roja y el baile diario de las 4 lunas Galileanas.",
    mars: "Muestra casquetes polares de hielo y marcas oscuras en la superficie cerca de la oposición.",
    venus: "Muestra fases impresionantes similares a las de la Luna al observarlo por telescopio.",
    mercury: "Mejor observado durante el crepúsculo cerca de la máxima elongación.",
    moon: "Cráteres, mares lunares y cadenas montañosas revelan detalles increíbles en el terminador.",
    sun: "Nunca lo observes directamente sin filtros solares ISO 12312-2 dedicados.",
    uranus: "Pequeño disco azul verdoso visible con prismáticos o pequeños telescopios.",
    neptune: "Tenue punto azul en el cielo profundo; requiere telescopio y cartas de búsqueda."
  }
};

function formatLocalizedUnit(text: string, locale: string): string {
  if (!text) return text;
  if (locale === "pt") {
    return text
      .replace("Million km", "Milhões de km")
      .replace("Billion km", "Bilhões de km")
      .replace("Million Years", "Milhões de Anos")
      .replace("Billion Years", "Bilhões de Anos")
      .replace("Years", "Anos")
      .replace("Days", "Dias")
      .replace("Hours", "Horas");
  } else if (locale === "es") {
    return text
      .replace("Million km", "Millones de km")
      .replace("Billion km", "Billones de km")
      .replace("Million Years", "Millones de Años")
      .replace("Billion Years", "Billones de Años")
      .replace("Years", "Años")
      .replace("Days", "Días")
      .replace("Hours", "Horas");
  }
  return text;
}

interface PlanetDetailDrawerProps {
  planet: PlanetData | null;
  onReturnToSystem: () => void;
}

export const PlanetDetailDrawer: React.FC<PlanetDetailDrawerProps> = ({
  planet,
  onReturnToSystem,
}) => {
  const t = useTranslations();
  const locale = useLocale();

  if (!planet) return null;

  const displayName = LOCALIZED_BODIES[locale]?.[planet.id] || planet.name;
  const obsTip = LOCALIZED_TIPS[locale]?.[planet.id] || planet.observationTip;

  return (
    <aside className="absolute top-20 right-4 bottom-20 z-30 w-80 sm:w-96 bg-slate-900/70 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] text-white overflow-y-auto space-y-6 animate-slide-left">
      {/* Return to System Action Button */}
      <button
        onClick={onReturnToSystem}
        className="w-full py-3 px-4 rounded-xl bg-cyan-950/40 hover:bg-cyan-500/20 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("orrery_btn_return_system")}</span>
      </button>

      {/* Selected Planet Title */}
      <div className="text-center pt-2">
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {displayName}
        </h2>
        <p className="text-xs text-cyan-300/80 font-medium tracking-wide mt-1">
          {planet.tagline}
        </p>
      </div>

      {/* Visual Planet Sphere Badge / Preview Graphic */}
      <div className="flex justify-center py-2 relative">
        <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] overflow-hidden border border-white/10 group">
          {TEXTURE_MAP[planet.textureType] ? (
            <img
              src={TEXTURE_MAP[planet.textureType]}
              alt={displayName}
              className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110 border border-cyan-400/30"
            />
          ) : (
            <div
              className="w-full h-full rounded-full transition-transform duration-700 group-hover:scale-110"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${planet.color}, #090d16)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-white/20 rounded-full" />
        </div>
      </div>

      {/* Atmospheric Composition Section */}
      <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2">
          <span>{t("orrery_label_atmosphere")}</span>
        </h3>
        <div className="space-y-2.5">
          {planet.atmosphere.map((comp) => (
            <div key={comp.gas} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-200">
                  {comp.formula}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">({comp.gas})</span>
                </span>
                <span className="text-cyan-300">{comp.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]"
                  style={{
                    width: `${comp.percentage}%`,
                    backgroundColor: comp.color || '#38bdf8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Surface Temperature Section */}
      <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2">
          <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t("orrery_label_temp")}</span>
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="block text-[10px] text-slate-400 uppercase">{t("orrery_label_temp_avg")}</span>
            <span className="font-bold text-sm text-cyan-300">{planet.temperature.average}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="block text-[10px] text-slate-400 uppercase">{t("orrery_label_temp_high")}</span>
            <span className="font-bold text-sm text-amber-400">{planet.temperature.high}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="block text-[10px] text-slate-400 uppercase">{t("orrery_label_temp_low")}</span>
            <span className="font-bold text-sm text-blue-400">{planet.temperature.low}</span>
          </div>
        </div>
      </div>

      {/* Distance from Earth Section */}
      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t("orrery_label_distance_earth")}
        </h3>
        <p className="text-2xl font-extrabold text-cyan-300 tracking-tight">
          {formatLocalizedUnit(planet.distanceFromEarth, locale)}
        </p>
      </div>

      {/* Additional Astronomical Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
            <Orbit className="w-3 h-3 text-cyan-400" />
            <span>{t("orrery_label_orbital_period")}</span>
          </div>
          <span className="font-bold text-white text-sm">{formatLocalizedUnit(planet.orbitalPeriod, locale)}</span>
        </div>

        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
            <RotateCw className="w-3 h-3 text-cyan-400" />
            <span>{t("orrery_label_rotation_period")}</span>
          </div>
          <span className="font-bold text-white text-sm">{formatLocalizedUnit(planet.rotationPeriod, locale)}</span>
        </div>

        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
            <Moon className="w-3 h-3 text-cyan-400" />
            <span>{t("orrery_label_moons")}</span>
          </div>
          <span className="font-bold text-white text-sm">{planet.moonsCount}</span>
        </div>

        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>{t("orrery_label_gravity")}</span>
          </div>
          <span className="font-bold text-white text-sm">{planet.gravity}</span>
        </div>
      </div>

      {/* Telescope Observation Tip */}
      <div className="bg-cyan-950/30 p-4 rounded-2xl border border-cyan-500/20 text-xs space-y-1">
        <span className="flex items-center space-x-1.5 font-bold text-cyan-300 text-[11px] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t("orrery_label_obs_guide")}</span>
        </span>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          {obsTip}
        </p>
        <span className="block text-[10px] text-slate-400 pt-1">
          {t("orrery_label_recommended")} <span className="text-cyan-300 font-semibold">{planet.bortleRecommended}</span>
        </span>
      </div>
    </aside>
  );
};
