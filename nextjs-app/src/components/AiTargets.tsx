"use client";

import React from "react";
import useSWR from "swr";
import { useTranslations, useLocale, useMessages } from "next-intl";
import Icon from "./Icon";
import type { MustSeeTarget } from "@/types";
import { API_BASE } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import { showToast } from "@/lib/toast";

import { useClientLocation } from "@/hooks/useClientLocation";

interface AiTargetsProps {
  bestTargets?: MustSeeTarget[];
  mustSee?: MustSeeTarget[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AiTargets({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bestTargets = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mustSee = [],
}: AiTargetsProps) {
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const t = useTranslations();
  const coords = useClientLocation();

  const lang = locale || "en";
  const locQuery = coords ? `&lat=${coords.lat}&lon=${coords.lon}` : "";
  const { data: seeingData } = useSWR(`${API_BASE}/seeing/ai?lang=${lang}${locQuery}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const getTxt = (key: string, fallback: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = messages[key] || t(key as any);
    return val && val.trim() !== "" ? val : fallback;
  };

  const briefing =
    seeingData?.explanation ||
    seeingData?.seeing_explanation ||
    (locale === "pt"
      ? "Análise de visibilidade AI para hoje à noite com base no seu clima local e poluição luminosa."
      : locale === "es"
      ? "Análisis de visibilidad AI para esta noche basado en su clima local y contaminación lumínica."
      : "AI seeing forecast based on your local weather and light pollution.");

  const rawWindow = seeingData?.best_window;
  const isNoWindow = !rawWindow || ["none", "null", "n/a"].includes(rawWindow.toLowerCase().trim());
  const bestWindow = isNoWindow
    ? (locale === "pt" ? "Sem janela clara hoje" : locale === "es" ? "Sin ventana clara hoy" : "No clear window tonight")
    : rawWindow;

  const recTargets = seeingData?.recommended_targets || [];

  // Localized planet backup tips if AI targets are loading
  const planetBackupTips: Record<string, { pt: string; es: string; en: string }> = {
    Jupiter: {
      pt: "Observe as 4 luas Galileanas com telescópio!",
      es: "¡Observa las 4 lunas Galileanas con telescopio!",
      en: "Spot the 4 Galilean moons through your telescope!",
    },
    Mars: {
      pt: "Procure as calotas polares de gelo!",
      es: "¡Busca los casquetes polares de hielo!",
      en: "Look for the polar ice caps!",
    },
    Mercury: {
      pt: "Observe-o rapidamente antes de se pôr!",
      es: "¡Obsérvalo rápidamente antes de que se ponga!",
      en: "Catch it quickly before it sets!",
    },
    Saturn: {
      pt: "Os anéis estão espetaculares agora!",
      es: "¡Los anillos están espectaculares ahora!",
      en: "The rings are spectacular right now!",
    },
  };

  const didYouKnowText =
    seeingData?.moon_fact ||
    seeingData?.event_of_the_night?.description ||
    messages["motion_iss_0"] ||
    (locale === "pt"
      ? "Os anéis de Saturno são compostos principalmente por pedaços de gelo e rocha."
      : locale === "es"
      ? "Los anillos de Saturno están hechos principalmente de trozos de hielo y roca."
      : "Saturn's rings are mostly made of chunks of ice and rock.");

  return (
    <section id="card-ai-targets" className="card w-full mb-8 border border-cyan-500/30 bg-slate-950/95 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="card-header justify-between border-b border-cyan-500/20 px-6 py-4 bg-slate-900/80 relative z-20">
        <div className="flex items-center gap-2">
          <Icon name="compass" className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {getTxt("must_see_title", locale === "pt" ? "Recomendações e Escolhas da IA" : locale === "es" ? "Objetivos Recomendados por IA" : "Must-See & AI Picks")}
          </h2>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3.5 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
          {getTxt("curated_for_tonight", locale === "pt" ? "Selecionado para hoje" : locale === "es" ? "Seleccionado para hoy" : "Curated for tonight")}
        </span>
      </div>

      {/* Grid Content */}
      <div className="card-body p-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: AI Observer Briefing */}
          <div className="hud-card relative rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(45,212,191,0.15)] overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.04)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_rgba(45,212,191,0.9)] z-20" />
            
            <div className="space-y-3 pl-2 relative z-20">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <span>🧁</span>
                <span>{getTxt("ai_observer_briefing", locale === "pt" ? "RESUMO DO OBSERVADOR IA" : locale === "es" ? "INFORME DEL OBSERVADOR IA" : "AI OBSERVER'S BRIEFING")}</span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-100/90 italic leading-relaxed font-serif">
                &quot;{briefing}&quot;
              </p>
            </div>
            <div className="pl-2 pt-4 border-t border-cyan-500/20 mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300 relative z-20">
              <Icon name="telescope" className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>
                {locale === "pt" ? "Melhor janela:" : locale === "es" ? "Mejor ventana:" : "Best window:"}{" "}
                <span className="text-cyan-300 font-bold font-mono">{bestWindow}</span>
              </span>
            </div>
          </div>

          {/* Dynamic AI Recommended Target Cards */}
          {recTargets.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recTargets.map((item: any, idx: number) => (
              <div
                key={idx}
                className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group"
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
                <div className="flex items-start justify-between relative z-20">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl text-slate-200 font-serif">✨</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300 text-sm">{item.name}</span>
                        {item.magnitude && (
                          <span className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">
                            {item.magnitude}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-normal">{item.reason || item.how_to_find}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 relative z-20">
                  <button
                    onClick={() => {
                      const err = addToPlan(item.name.toLowerCase().replace(/\s+/g, "_"), `✨ ${item.name}`);
                      if (err) showToast(err);
                    }}
                    className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {getTxt("btn_add_to_plan", locale === "pt" ? "Adicionar ao Plano +" : locale === "es" ? "Añadir al Plan +" : "Add to Plan +")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Backup Dynamic Planet Cards when AI targets are offline
            ["Jupiter", "Mars", "Mercury"].map((pName) => {
              const tipObj = planetBackupTips[pName] || { pt: "Excelente para observação!", es: "¡Excelente para observación!", en: "Great for observing!" };
              const tipStr = locale === "pt" ? tipObj.pt : locale === "es" ? tipObj.es : tipObj.en;
              const symbol = pName === "Jupiter" ? "♃" : pName === "Mars" ? "♂" : "☿";

              return (
                <div
                  key={pName}
                  className="hud-card relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-md hover:border-cyan-400/50 transition-all overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
                  <div className="flex items-start justify-between relative z-20">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl text-slate-200 font-serif">{symbol}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300 text-sm">{pName}</span>
                          <span className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">
                            {locale === "pt" ? "Visível" : locale === "es" ? "Visible" : "Visible"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{tipStr}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 relative z-20">
                    <button
                      onClick={() => {
                        const err = addToPlan(pName.toLowerCase(), `🪐 ${pName}`);
                        if (err) showToast(err);
                      }}
                      className="rounded-lg border border-sky-500/40 bg-sky-950/50 hover:bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {getTxt("btn_add_to_plan", locale === "pt" ? "Adicionar ao Plano +" : locale === "es" ? "Añadir al Plan +" : "Add to Plan +")}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Card 6: Celestial Events & Did You Know Trivia */}
          <div className="hud-card relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/50 via-slate-900/90 to-slate-950/95 p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(168,85,247,0.15)] overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.04)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />
            <div className="relative z-20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-300 text-sm">📅</span>
                <span className="font-bold text-purple-300 text-xs uppercase tracking-wider block">
                  {seeingData?.event_of_the_night?.name || getTxt("celestial_events_title", locale === "pt" ? "EVENTO CELESTIAL EM DESTAQUE" : locale === "es" ? "EVENTO CELESTIAL DESTACADO" : "FEATURED CELESTIAL EVENT")}
                </span>
              </div>
              <p className="text-xs text-purple-100/90 leading-relaxed font-medium">
                {seeingData?.event_of_the_night?.description || didYouKnowText}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-500/20 flex items-center justify-between relative z-20">
              <span className="text-[0.65rem] text-purple-300/80 font-mono">
                {locale === "pt" ? "Atualizado para esta semana" : locale === "es" ? "Actualizado para esta semana" : "Updated for this week"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const evtName = seeingData?.event_of_the_night?.name || "Featured Celestial Event";
                  const err = addToPlan("celestial_event", `📅 ${evtName}`);
                  if (err) showToast(err);
                }}
                className="rounded-lg border border-purple-400/30 bg-purple-950/60 hover:bg-purple-500/20 px-2.5 py-1 text-[0.7rem] font-semibold text-purple-200 transition-all cursor-pointer"
              >
                + {getTxt("btn_add_to_plan", locale === "pt" ? "Adicionar ao Plano" : locale === "es" ? "Añadir al Plan" : "Add to Plan")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

