"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useTranslations, useLocale, useMessages } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { CatalogTarget, GalleryCounts } from "@/types";
import { API_BASE, BORTLE_CLASSES, BORTLE_STORAGE_KEY } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import { showToast } from "@/lib/toast";
import GalleryButton from "./GalleryButton";
import FovModal from "./FovModal";
import { getClientCoords } from "@/hooks/useClientLocation";

const galleryFetcher = (url: string) => fetch(url).then((r) => r.json());

const EQUIPMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "seestar", label: "Seestar" },
  { value: "dslr", label: "DSLR" },
  { value: "binos", label: "Binoculars" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", key: "filter_all" },
  { value: "backyard-best", key: "filter_backyard_best" },
  { value: "globular", key: "filter_globular" },
  { value: "open", key: "filter_open" },
  { value: "double", key: "filter_double" },
  { value: "star", key: "filter_stars" },
  { value: "galaxy", key: "filter_galaxy" },
  { value: "has-images", key: "filter_has_images" },
] as const;

const SORT_OPTIONS = [
  { value: "default", key: "sort_default" },
  { value: "visibility", key: "sort_visibility" },
  { value: "magnitude", key: "sort_magnitude" },
  { value: "name", key: "sort_name" },
] as const;

function matchesEquipment(t: CatalogTarget, equip: string): boolean {
  if (equip === "all") return true;
  const type = t.type?.toLowerCase() ?? "";
  if (equip === "seestar") {
    return ["galaxy", "nebula", "globular cluster", "open cluster"].some((k) => type.includes(k));
  }
  if (equip === "dslr") {
    return ["nebula", "galaxy", "open cluster"].some((k) => type.includes(k));
  }
  if (equip === "binos") {
    return (t.magnitude ?? 99) <= 7.5 || ["open cluster", "star"].some((k) => type.includes(k));
  }
  return true;
}

function matchesType(t: CatalogTarget, type: string, counts: GalleryCounts | undefined): boolean {
  if (type === "all") return true;
  if (type === "backyard-best") return (t.altitude_deg ?? 0) >= 30;
  if (type === "has-images") return !!counts && (counts[t.id] ?? 0) > 0;
  const targetType = t.type?.toLowerCase() ?? "";
  if (type === "globular") return targetType.includes("globular");
  if (type === "open") return targetType.includes("open");
  if (type === "double") return targetType.includes("double");
  if (type === "star") return targetType.includes("star") && !targetType.includes("cluster");
  if (type === "galaxy") return targetType.includes("galaxy");
  return true;
}

export default function TargetDatabase() {
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const t = useTranslations();

  const getTxt = (key: string, fallback: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = messages[key] || t(key as any);
    return val && val.trim() !== "" ? val : fallback;
  };

  const translateType = (typeStr: string | undefined) => {
    if (!typeStr) return locale === "pt" ? "Alvo Astronômico" : locale === "es" ? "Objetivo Astronómico" : "Astronomical Target";
    if (locale === "en") return typeStr;
    const raw = typeStr.trim();
    const lower = raw.toLowerCase();

    if (lower === "star") return locale === "pt" ? "Estrela" : "Estrella";
    if (lower.includes("red giant")) return locale === "pt" ? "Gigante Vermelha" : "Gigante Roja";
    if (lower.includes("blue giant")) return locale === "pt" ? "Gigante Azul" : "Gigante Azul";
    if (lower.includes("red supergiant")) return locale === "pt" ? "Supergigante Vermelha" : "Supergigante Roja";
    if (lower.includes("blue supergiant")) return locale === "pt" ? "Supergigante Azul" : "Supergigante Azul";
    if (lower.includes("double star") || lower.includes("binary")) return locale === "pt" ? "Estrela Dupla" : "Estrella Doble";
    if (lower.includes("globular")) return locale === "pt" ? "Aglomerado Globular" : "Cúmulo Globular";
    if (lower.includes("open cluster")) return locale === "pt" ? "Aglomerado Aberto" : "Cúmulo Abierto";
    if (lower.includes("spiral galaxy")) return locale === "pt" ? "Galáxia Espiral" : "Galaxia Espiral";
    if (lower.includes("galaxy")) return locale === "pt" ? "Galáxia" : "Galaxia";
    if (lower.includes("emission nebula")) return locale === "pt" ? "Nebulosa de Emissão" : "Nebulosa de Emisión";
    if (lower.includes("planetary nebula")) return locale === "pt" ? "Nebulosa Planetária" : "Nebulosa Planetaria";
    if (lower.includes("nebula")) return locale === "pt" ? "Nebulosa" : "Nebulosa";
    return raw;
  };

  const translateDesc = (id: string, desc: string | undefined) => {
    if (!desc) return "";
    if (locale === "en") return desc;
    const key = `target_${id.toLowerCase()}_desc`;
    if (messages[key]) return messages[key];

    if (desc.includes("One of the brightest stars in")) {
      const constName = desc.split("in ").pop() || "";
      return locale === "pt"
        ? `Uma das estrelas mais brilhantes de ${constName}`
        : `Una de las estrellas más brillantes de ${constName}`;
    }
    if (desc.includes("A rich, loose open cluster")) {
      return locale === "pt"
        ? "Um aglomerado aberto amplo e rico que se destaca perfeitamente no fundo da Via Láctea."
        : "Un cúmulo abierto rico y amplio que destaca perfectamente sobre el fondo de la Vía Láctea.";
    }
    if (desc.includes("A very compact and exceptionally bright globular cluster")) {
      return locale === "pt"
        ? "Um aglomerado globular muito compacto e brilhante. Parece uma bola de neve densa de estrelas em pequenos telescópios."
        : "Un cúmulo globular muy compacto y brillante. Parece una bola de nieve densa de estrellas en pequeños telescopios.";
    }
    if (desc.includes("The single brightest star in the northern celestial hemisphere")) {
      return locale === "pt"
        ? "A estrela individual mais brilhante do hemisfério celestial norte. Uma gigante laranja flamejante facilmente localizada seguindo o arco do Big Dipper."
        : "La estrella individual más brillante del hemisferio celestial norte. Una gigante naranja deslumbrante fácilmente localizada siguiendo el arco del Gran Carro.";
    }
    return desc;
  };

  const [targets, setTargets] = useState<CatalogTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>("Visible Now (My Sky)");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [equipFilter, setEquipFilter] = useState<string>("all");
  const [nameQuery, setNameQuery] = useState("");
  const [sortVal, setSortVal] = useState("default");
  const [activeBortle, setActiveBortle] = useState<number | null>(null);
  const [fovTarget, setFovTarget] = useState<CatalogTarget | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(6);
  const constPillsRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrollPills = (dir: "left" | "right") => {
    if (constPillsRef.current) {
      constPillsRef.current.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
    }
  };

  const { data: galleryCounts } = useSWR<GalleryCounts>(`${API_BASE}/gallery/counts`, galleryFetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setTimeout(() => setDisplayedCount(6), 0);
  }, [filter, typeFilter, equipFilter, nameQuery, sortVal]);

  useEffect(() => {
    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const constName = detail.name || detail.abbr;
        if (constName) {
          setFilter(constName);
          setTimeout(() => setDisplayedCount(6), 0);
        }
      }
    };
    const handleFilterVisible = () => {
      setFilter("Visible Now (My Sky)");
      setSortVal("visibility");
      setTimeout(() => setDisplayedCount(6), 0);
    };
    window.addEventListener("sg-select-constellation", handleSelect);
    window.addEventListener("sg-filter-visible-targets", handleFilterVisible);
    return () => {
      window.removeEventListener("sg-select-constellation", handleSelect);
      window.removeEventListener("sg-filter-visible-targets", handleFilterVisible);
    };
  }, []);

  useEffect(() => {
    const storedBortle = localStorage.getItem(BORTLE_STORAGE_KEY);
    if (storedBortle) {
      const b = parseInt(storedBortle, 10);
      if (!isNaN(b) && b >= 1 && b <= 9) setTimeout(() => setActiveBortle(b), 0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTargets() {
      setLoading(true);
      setError(null);
      try {
        const lang = locale || "en";
        const coords = getClientCoords();
        const locQuery = coords ? `&lat=${coords.lat}&lon=${coords.lon}` : "";

        let url = `${API_BASE}/targets?lang=${lang}${locQuery}`;
        if (filter === "Visible Now (My Sky)") {
          url = `${API_BASE}/targets?constellation=all&visible_only=true&lang=${lang}${locQuery}`;
        } else if (filter === "All Constellations (Full DB)") {
          url = `${API_BASE}/targets?constellation=all&lang=${lang}${locQuery}`;
        } else {
          url = `${API_BASE}/targets?constellation=${encodeURIComponent(filter)}&lang=${lang}${locQuery}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTargets(data.targets || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch targets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTargets();
    return () => {
      cancelled = true;
    };
  }, [filter, locale]);

  const bortleInfo = useMemo(() => {
    if (activeBortle === null) return null;
    return BORTLE_CLASSES[String(activeBortle)] || null;
  }, [activeBortle]);

  const clearBortleFilter = () => {
    setActiveBortle(null);
    localStorage.removeItem(BORTLE_STORAGE_KEY);
  };

  const filteredTargets = useMemo(() => {
    let result = targets.filter((t) => {
      const matchesEquip = matchesEquipment(t, equipFilter);
      const matchesT = matchesType(t, typeFilter, galleryCounts);
      const matchesName =
        !nameQuery ||
        t.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(nameQuery.toLowerCase()) ||
        (t.type && t.type.toLowerCase().includes(nameQuery.toLowerCase()));

      let matchesBortle = true;
      if (activeBortle !== null) {
        const minB = t.bortle_min ?? 1;
        matchesBortle = activeBortle <= minB;
      }

      return matchesEquip && matchesT && matchesName && matchesBortle;
    });

    if (sortVal === "visibility") {
      result = [...result].sort((a, b) => (b.altitude_deg ?? -90) - (a.altitude_deg ?? -90));
    } else if (sortVal === "magnitude") {
      result = [...result].sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
    } else if (sortVal === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [targets, equipFilter, typeFilter, nameQuery, sortVal, activeBortle, galleryCounts]);

  const visibleSubset = useMemo(() => {
    return filteredTargets.slice(0, displayedCount);
  }, [filteredTargets, displayedCount]);

  if (loading) {
    return (
      <section id="card-targets" className="w-full mb-8">
        <div className="card animate-pulse p-6 bg-slate-900/90 border border-white/10 rounded-2xl">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-40 bg-white/5 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section id="card-targets" className="card w-full mb-8 border border-cyan-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      <div className="card-header border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Icon name="telescope" className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {t("target_db_title")}
          </h2>
          <span className="font-mono text-xs text-slate-400 font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            {loading ? "..." : `${filteredTargets.length} ${locale === "pt" ? "alvos" : locale === "es" ? "objetivos" : "targets"}`}
          </span>
        </div>
        <SourceTooltip
          source="Catalog of Deep Sky Objects (Messier / NGC / IC)"
          description={t("source_targets_desc")}
          attribution={t("source_targets_attr")}
        />
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            {t("target_fetch_error")}: {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTypeFilter(o.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                  typeFilter === o.value
                    ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-sm"
                    : "bg-white/5 text-slate-400 border-white/10 hover:text-slate-200"
                }`}
              >
                {getTxt(o.key, o.value === "backyard-best" ? "✨ Backyard Best (Alt > 30°)" : o.value)}
                {o.value === "has-images" && galleryCounts && (
                  <span className="ml-1 rounded-full bg-cyan-400/30 px-1.5 py-0.2 text-[0.65rem] text-cyan-200 font-bold">
                    {Object.values(galleryCounts).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">{t("target_equip_lbl")}</span>
            <select
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value)}
              aria-label={t("target_equip_lbl")}
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 outline-none cursor-pointer"
            >
              {EQUIPMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value === "all" ? t("filter_all") : o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder={locale === "pt" ? "ex: M31, Marte, Anel..." : locale === "es" ? "ej: M31, Marte, Anillo..." : "e.g. M31, Mars, Ring..."}
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">{t("target_sort_lbl")}</span>
            <select
              value={sortVal}
              onChange={(e) => setSortVal(e.target.value)}
              aria-label={t("target_sort_lbl")}
              className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-slate-100 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeBortle && bortleInfo && (
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl bg-gradient-to-r from-sky-500/25 to-indigo-500/25 border border-sky-500/40 px-4 py-3 mb-5 text-sm text-white">
            <span>
              ✨ {locale === 'pt' ? 'Filtrando alvos observáveis sob Bortle' : 'Filtering by targets observable under Bortle'} <strong>Class {activeBortle}</strong> ({bortleInfo.shortDesc}).
            </span>
            <button
              onClick={clearBortleFilter}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/85 border border-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
            >
              ✖ {locale === 'pt' ? 'Limpar Filtro' : 'Clear Filter'}
            </button>
          </div>
        )}

        {filteredTargets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {locale === "pt" ? "Nenhum alvo encontrado" : locale === "es" ? "No se encontraron objetivos" : "No targets found"}.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {visibleSubset.map((tTarget) => (
                <div
                  key={tTarget.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 flex flex-col justify-between shadow-lg hover:border-cyan-400/40 transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl text-amber-400 font-serif flex-shrink-0">
                          {tTarget.emoji ?? "🔭"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                            {tTarget.name}
                          </h3>
                          <p className="text-xs text-slate-400">{translateType(tTarget.type)}</p>
                        </div>
                      </div>
                      {tTarget.magnitude != null && (
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex-shrink-0">
                          mag {tTarget.magnitude}
                        </span>
                      )}
                    </div>

                    {(tTarget.description || tTarget.notes) && (
                      <p className="text-xs text-slate-300 leading-relaxed mt-2.5 mb-4">
                        {translateDesc(tTarget.id, tTarget.description ?? tTarget.notes)}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {tTarget.ra_hours != null && tTarget.dec_degrees != null && (
                        <button
                          onClick={() => setFovTarget(tTarget)}
                          className="rounded-lg border border-purple-500/40 bg-purple-950/50 hover:bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                          {getTxt("planet_simulate_btn", locale === "pt" ? "Simular Visão 🔭" : locale === "es" ? "Simular Vista 🔭" : "Simulate View 🔭")}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const err = addToPlan(tTarget.id, `${tTarget.emoji ?? "🔭"} ${tTarget.name}`);
                          if (err) showToast(err);
                        }}
                        className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-all active:scale-95 shadow-sm cursor-pointer"
                      >
                        {getTxt("btn_add_to_plan", locale === "pt" ? "Adicionar ao Plano +" : locale === "es" ? "Añadir al Plan +" : "Add to Plan +")}
                      </button>
                      <GalleryButton targetId={tTarget.id} targetName={tTarget.name} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300 uppercase">
                          {tTarget.type?.toLowerCase().includes("binocular")
                            ? (locale === "pt" ? "BINÓCULOS" : locale === "es" ? "BINOCULARES" : "BINOCULARS")
                            : (locale === "pt" ? "TELESCÓPIO" : locale === "es" ? "TELESCOPIO" : "TELESCOPE")}
                        </span>
                        <span className="rounded bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                          ✨ {locale === "pt" ? `Observável em Bortle ${tTarget.bortle_min ?? 6}` : locale === "es" ? `Observable en Bortle ${tTarget.bortle_min ?? 6}` : `Bortle ${tTarget.bortle_min ?? 6} Observable`}
                        </span>
                        <span className="rounded bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 text-[0.65rem] font-bold text-sky-300 uppercase">
                          {tTarget.magnitude != null && tTarget.magnitude < 5
                            ? (locale === "pt" ? "FÁCIL" : locale === "es" ? "FÁCIL" : "EASY")
                            : tTarget.magnitude != null && tTarget.magnitude < 9
                            ? (locale === "pt" ? "MODERADO" : locale === "es" ? "MODERADO" : "MODERATE")
                            : (locale === "pt" ? "DESAFIADOR" : locale === "es" ? "DESAFIANTE" : "CHALLENGING")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.7rem] text-slate-400">
                          Alt: {tTarget.altitude_deg != null ? Math.round(tTarget.altitude_deg) + "°" : "60°"} · Az: {tTarget.azimuth_deg != null ? Math.round(tTarget.azimuth_deg) + "°" : "180°"}
                        </span>
                        {tTarget.is_daytime ? (
                          <span className="rounded bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300">
                            ☀️ {locale === "pt" ? "Luz do Dia" : locale === "es" ? "Luz del Día" : "Daylight"}
                          </span>
                        ) : tTarget.altitude_deg != null && tTarget.altitude_deg < 0 ? (
                          <span className="rounded bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-red-300">
                            🔴 {locale === "pt" ? "Abaixo do Horizonte" : locale === "es" ? "Bajo el Horizonte" : "Below Horizon"}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                            🌙 {locale === "pt" ? "Céu Escuro" : locale === "es" ? "Cielo Oscuro" : "Dark Sky"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTargets.length > displayedCount && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={() => setDisplayedCount((prev) => prev + 6)}
                  className="flex items-center gap-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all cursor-pointer active:scale-95"
                >
                  <span>{getTxt("btn_load_more_targets", locale === "pt" ? "Carregar Mais Alvos 🔭" : locale === "es" ? "Cargar Más Objetivos 🔭" : "Load More Targets 🔭")}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {fovTarget && fovTarget.ra_hours != null && fovTarget.dec_degrees != null && (
        <FovModal
          open
          onClose={() => setFovTarget(null)}
          raDeg={fovTarget.ra_hours * 15}
          decDeg={fovTarget.dec_degrees}
          targetName={fovTarget.name}
          targetType={fovTarget.type}
        />
      )}
    </section>
  );
}
