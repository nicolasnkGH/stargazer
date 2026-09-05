import React from 'react';
import { useTranslations } from 'next-intl';

interface CenterOverlayProps {
  isVisible: boolean;
}

export const CenterOverlay: React.FC<CenterOverlayProps> = ({ isVisible }) => {
  const t = useTranslations();
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center text-center animate-fade-in">
      {/* Center Branding Headline */}
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]">
        <span className="bg-gradient-to-r from-cyan-300 via-white to-cyan-400 bg-clip-text text-transparent">
          StarGazer
        </span>
      </h1>
      <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide mt-1 drop-shadow-md">
        {t("orrery_tagline")}
      </p>
    </div>
  );
};
