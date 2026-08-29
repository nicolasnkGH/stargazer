import React from 'react';
import { Html } from '@react-three/drei';

interface TargetReticleProps {
  planetName: string;
  distanceStr: string;
  isSelected?: boolean;
  isHovered?: boolean;
}

export const TargetReticle: React.FC<TargetReticleProps> = ({
  planetName,
  distanceStr,
  isSelected,
  isHovered,
}) => {
  return (
    <Html center distanceFactor={15} style={{ pointerEvents: 'none' }}>
      <div className={`relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-110' : 'scale-100'}`}>
        {/* Animated HUD Outer Ring */}
        <div className={`w-28 h-28 rounded-full border-2 border-dashed animate-spin-slow ${
          isSelected ? 'border-cyan-400 opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.8)]' : 'border-emerald-400/80 opacity-70'
        }`} style={{ animationDuration: '12s' }} />

        {/* Square Bounding Box Corners */}
        <div className="absolute inset-0 w-24 h-24 m-auto">
          {/* Top Left Corner */}
          <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${isSelected ? 'border-cyan-300' : 'border-emerald-400'}`} />
          {/* Top Right Corner */}
          <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${isSelected ? 'border-cyan-300' : 'border-emerald-400'}`} />
          {/* Bottom Left Corner */}
          <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${isSelected ? 'border-cyan-300' : 'border-emerald-400'}`} />
          {/* Bottom Right Corner */}
          <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${isSelected ? 'border-cyan-300' : 'border-emerald-400'}`} />
        </div>

        {/* Center Target Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-emerald-400'} shadow-[0_0_10px_currentColor]`} />
        </div>

        {/* HUD Data Tag */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center whitespace-nowrap bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-500/40 text-[10px] tracking-widest text-cyan-200 font-mono shadow-lg">
          <span className="font-bold uppercase text-cyan-300">{planetName}</span>
          <span className="text-[9px] text-emerald-400/90">{distanceStr}</span>
        </div>
      </div>
    </Html>
  );
};
