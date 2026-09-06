"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";

interface SourceTooltipProps {
  source: string;
  description: string;
  className?: string;
  attribution?: string;
}

export default function SourceTooltip({
  source,
  description,
  className = "",
  attribution,
}: SourceTooltipProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  const sourceTitle = t.has("source_title") ? t("source_title") : "Source";
  const verifiedLabel = t.has("source_verified_label") ? t("source_verified_label") : "Verified Data Source";
  const providerLabel = t.has("source_provider_label") ? t("source_provider_label") : "Provider:";
  const btnLabel = t.has("source_btn_label") ? t("source_btn_label") : "Source";

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-mono text-zinc-400 hover:text-sky-300 hover:bg-sky-500/10 border border-white/5 hover:border-sky-400/30 transition-all cursor-pointer select-none"
        title={`${sourceTitle}: ${source}`}
        aria-label={`${sourceTitle}: ${source}`}
      >
        <Icon name="info" className="h-3 w-3 text-sky-400/80" />
        <span className="hidden sm:inline text-[0.6rem] text-zinc-400 hover:text-sky-300">{btnLabel}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-64 sm:w-72 max-w-[85vw] p-3 rounded-xl border border-sky-400/30 bg-slate-950/95 backdrop-blur-xl shadow-2xl text-xs text-zinc-300 pointer-events-auto animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-1.5 font-bold text-sky-300 text-xs mb-1.5 border-b border-white/10 pb-1.5">
            <span className="flex items-center gap-1.5">
              <span>🛡️</span>
              <span>{verifiedLabel}</span>
            </span>
            <span className="text-[0.65rem] font-mono text-zinc-400 font-normal">
              {source}
            </span>
          </div>

          <p className="text-[0.7rem] text-zinc-300 leading-relaxed">
            {description}
          </p>

          {attribution && (
            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[0.62rem] text-zinc-400 font-mono">
              <span>{providerLabel}</span>
              <span className="text-zinc-300 font-semibold">{attribution}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
