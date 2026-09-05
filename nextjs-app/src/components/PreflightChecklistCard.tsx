"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import { usePreflightChecked } from "./PreflightChecklistModal";

export default function PreflightChecklistCard() {
  const t = useTranslations();
  const { checked, toggle, reset, completedCount, totalCount, isAllDone } = usePreflightChecked();
  
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const PREFLIGHT_ITEMS = [
    { id: "scope", label: t("preflight_item_scope") },
    { id: "dark", label: t("preflight_item_dark") },
    { id: "moon", label: t("preflight_item_moon") },
    { id: "dew", label: t("preflight_item_dew") },
    { id: "filters", label: t("preflight_item_filters") },
    { id: "power", label: t("preflight_item_power") },
    { id: "camera", label: t("preflight_item_camera") },
  ];

  return (
    <section id="card-preflight" className="card w-full mb-8 border border-green-500/20 bg-slate-900/90 shadow-xl">
      <div className="card-header justify-between border-b border-green-500/20 px-6 py-4 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Icon name="check-square" className="h-5 w-5 text-green-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-wide">{t("preflight_checklist_title")}</h2>
            <p className="text-[0.68rem] text-green-400/80 font-mono">{t("preflight_subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SourceTooltip
            source="Astronomy Field Standards"
            description={t.has("source_desc_preflight") ? t("source_desc_preflight") : "Established amateur and professional astronomical field checklist based on thermal equilibrium, seeing degra..."}
            attribution="StarGazer Field Optics Protocol"
          />
          <button
            type="button"
            onClick={reset}
            className="text-[0.7rem] text-zinc-400 hover:text-zinc-200 underline transition-colors"
          >
            {t("btn_reset_checklist")}
          </button>
        </div>
      </div>

      <div className="card-body p-6">
        <div className="mb-5 bg-slate-950/80 rounded-xl p-3.5 border border-white/5">
          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
            <span className="text-zinc-300">{t("prep_progress")}</span>
            <span className={isAllDone ? "text-green-400 font-bold" : "text-sky-400 font-mono"}>
              {completedCount} / {totalCount} {t("lbl_completed")} ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {PREFLIGHT_ITEMS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-3 text-left rounded-xl p-3 border transition-all cursor-pointer select-none ${
                checked[c.id]
                  ? "bg-green-500/[0.08] border-green-500/30 text-zinc-200"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-400"
              }`}
            >
              {checked[c.id] ? (
                <Icon name="check-square" className="h-5 w-5 text-green-400 flex-shrink-0" />
              ) : (
                <Icon name="square" className="h-5 w-5 text-zinc-600 flex-shrink-0" />
              )}
              <span className={`text-xs ${checked[c.id] ? "line-through text-zinc-400" : "text-zinc-200"}`}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
