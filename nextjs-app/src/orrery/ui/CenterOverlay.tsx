import React from 'react';
import { useTranslations } from 'next-intl';

interface CenterOverlayProps {
  isVisible: boolean;
  darkInValue?: string;
  bortleValue?: string;
}

export const CenterOverlay: React.FC<CenterOverlayProps> = ({ isVisible, darkInValue, bortleValue }) => {
  const t = useTranslations();
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center space-x-12 sm:space-x-20 text-center animate-fade-in">
      {/* Left Metric: Dark In */}
      <div className="flex flex-col items-center">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
          {darkInValue || "12.8h"}
        </span>
        <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase mt-0.5">
          {t("orrery_label_dark_in")}
        </span>
      </div>

      {/* Center Branding Headline */}
      <div className="flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]">
          <span className="bg-gradient-to-r from-cyan-300 via-white to-cyan-400 bg-clip-text text-transparent">
            StarGazer
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide mt-1 drop-shadow-md">
          {t("orrery_tagline")}
        </p>
      </div>

      {/* Right Metric: Bortle Scale */}
      <div className="flex flex-col items-center">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
          {bortleValue || "B6"}
        </span>
        <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase mt-0.5">
          {t("orrery_label_bortle_scale")}
        </span>
      </div>
    </div>
  );
};
