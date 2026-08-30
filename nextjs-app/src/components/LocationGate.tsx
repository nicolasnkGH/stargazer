/* eslint-disable react-hooks/purity */
"use client";

import { useEffect, useState, useRef } from "react";
import {
  ACTIVE_LOCATION_STORAGE_KEY,
  SAVED_LOCATIONS_STORAGE_KEY,
  DEFAULT_LOCATIONS,
  CITY_SEARCH_URL,
  REVERSE_GEOCODE_URL,
} from "@/lib/constants";
import { writeLocationCookie } from "@/lib/location-cookie";
import type { SavedLocation, GeocodeSuggestion } from "@/types";
import Icon from "./Icon";

export default function LocationGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY);
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, []);

  function setupLocation(loc: SavedLocation) {
    const saved = [loc];
    localStorage.setItem(SAVED_LOCATIONS_STORAGE_KEY, JSON.stringify(saved));
    localStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, loc.id);
    writeLocationCookie(loc.lat, loc.lon);
    setIsOpen(false);
    window.location.reload();
  }

  function tryGps() {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let name = "Custom Location";
        try {
          const res = await fetch(
            `${REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          const data = await res.json();
          const parts = [];
          if (data.city || data.locality) parts.push(data.city || data.locality);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          name = parts.length > 0 ? parts.join(", ") : data.countryName || "GPS Location";
        } catch {
          name = "GPS Location";
        }

        const newId = `loc_${Date.now()}`;
        const newLoc: SavedLocation = {
          id: newId,
          name,
          lat,
          lon,
        };
        setupLocation(newLoc);
      },
      (err) => {
        setError(`Geolocation failed: ${err.message}. Defaulting to Mauna Kea Observatory...`);
        setTimeout(() => {
          setupLocation(DEFAULT_LOCATIONS[0]);
        }, 2000);
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }

  function useMaunaKea() {
    setupLocation(DEFAULT_LOCATIONS[0]);
  }

  function performCitySearch(query: string) {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    fetch(`${CITY_SEARCH_URL}?format=json&q=${encodeURIComponent(query)}&limit=5`)
      .then((res) => res.json())
      .then((data: Array<{ display_name: string; lat: string; lon: string }>) => {
        setSuggestions(
          (data || []).map((r) => ({ displayName: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) }))
        );
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSearching(false));
  }

  function onCitySearchChange(value: string) {
    setCitySearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length > 2) {
      searchTimeout.current = setTimeout(() => performCitySearch(value), 800);
    } else {
      setSuggestions([]);
    }
  }

  function pickSuggestion(s: GeocodeSuggestion) {
    const parts = s.displayName.split(",");
    const name = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : parts[0].trim();
    const newId = `loc_${Date.now()}`;
    const newLoc: SavedLocation = {
      id: newId,
      name,
      lat: s.lat,
      lon: s.lon,
    };
    setupLocation(newLoc);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-[rgba(10,10,18,0.98)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
        <span className="text-4xl block mb-3 animate-pulse">🌌</span>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Welcome to StarGazer</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          To calculate custom stargazing forecasts, celestial targets, and satellite passes, please select your observing site location.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={tryGps}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-sky-500/20 border border-sky-500/30 px-4 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/30 transition-all disabled:opacity-50"
          >
            <Icon name="map-pin" className="h-4 w-4" />
            {loading ? "📡 Detecting Location..." : "📍 Use My Current Location"}
          </button>

          <button
            onClick={useMaunaKea}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            🌋 Default to Mauna Kea Observatory
          </button>

          <div className="relative my-2 text-left">
            <label className="block text-xs text-zinc-500 mb-1.5 text-center">— OR Search Custom City —</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => onCitySearchChange(e.target.value)}
                placeholder="e.g. London, Tokyo, Paris"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
              />
              <button
                onClick={() => performCitySearch(citySearch)}
                disabled={searching}
                className="whitespace-nowrap rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
              >
                {searching ? "⏳" : "🔍 Search"}
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-[10001] mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#0f1016] shadow-lg">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="px-3 py-2 text-sm text-zinc-300 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/10"
                  >
                    {s.displayName}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-2 bg-red-950/20 p-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
