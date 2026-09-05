import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Telescope,
  Moon,
  Thermometer,
  Wind,
  MapPin,
  Settings,
  Globe,
  User,
  Search,
} from 'lucide-react';
import { PlanetData } from '../types';
import { CELESTIAL_BODIES } from '../data/planetsData';

interface TopNavbarProps {
  onSelectBody: (body: PlanetData | null) => void;
  selectedBody: PlanetData | null;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onSelectBody, selectedBody }) => {
  const t = useTranslations();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredBodies = CELESTIAL_BODIES.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between px-6 py-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white text-sm">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectBody(null)}>
        <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <Telescope className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
          StarGazer
        </span>
      </div>

      {/* Live Telemetry Bar */}
      <div style={{ display: 'none' }} className="lg:!flex items-center space-x-8 text-slate-300 font-medium text-xs tracking-wide">
        {/* Moon Phase Metric */}
        <div className="flex items-center space-x-2.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <div className="relative">
            <Moon className="w-4 h-4 text-slate-200 fill-slate-200/20" />
            <div className="absolute -inset-0.5 rounded-full bg-cyan-400/20 blur-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold">Full Moon</span>
            <span className="text-[10px] text-slate-400">(99.7%)</span>
          </div>
        </div>

        {/* Temperature Metric */}
        <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-semibold text-sm">24.2°C</span>
        </div>

        {/* Wind Speed Metric */}
        <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <Wind className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-white font-semibold">14.4</span>
            <span className="text-[9px] text-slate-400">km/h</span>
          </div>
        </div>

        {/* Location Metric */}
        <div className="flex items-center space-x-2.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-white font-semibold">Columbus</span>
            <span className="text-[10px] text-slate-400">40.101°N, 83.078°W</span>
          </div>
        </div>

        {/* Live Digital Clock & Date */}
        <div className="flex flex-col items-end border-l border-white/10 pl-6">
          <span className="font-mono text-sm font-bold text-cyan-300 tracking-wider">
            {timeStr || '09:50:51'}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">
            {dateStr || 'Tue, Jul 28'}
          </span>
        </div>
      </div>

      {/* Right Controls & Search Jump */}
      <div className="flex items-center space-x-3">
        {/* Search Jump Bar */}
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
            title={t("orrery_title_search")}
          >
            <Search className="w-4 h-4" />
          </button>

          {isSearchOpen && (
            <div className="absolute right-0 top-12 w-64 bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-3 shadow-2xl z-50">
              <input
                type="text"
                placeholder={t("orrery_search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredBodies.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBody(b);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedBody?.id === b.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{b.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Action Icons */}
        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors">
          <Globe className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
