"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  SAVED_LOCATIONS_STORAGE_KEY,
  ACTIVE_LOCATION_STORAGE_KEY,
  REVERSE_GEOCODE_URL,
  CITY_SEARCH_URL,
} from "@/lib/constants";
import { writeLocationCookie } from "@/lib/location-cookie";
import type { SavedLocation, GeocodeSuggestion } from "@/types";
import Modal from "./Modal";

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  locations: SavedLocation[];
  activeId: string | null;
}

function activateLocation(loc: SavedLocation) {
  localStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, loc.id);
  writeLocationCookie(loc.lat, loc.lon);
  window.location.reload();
}

function persistLocations(locations: SavedLocation[]) {
  localStorage.setItem(SAVED_LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
}

export default function LocationModal({ open, onClose, locations, activeId }: LocationModalProps) {
  const t = useTranslations();
  const [savedLocations, setSavedLocations] = useState(locations);

  const [citySearch, setCitySearch] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profileName, setProfileName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [porchMode, setPorchMode] = useState(false);
  const [minAz, setMinAz] = useState("");
  const [maxAz, setMaxAz] = useState("");
  const [saving, setSaving] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    setLat(s.lat.toFixed(4));
    setLon(s.lon.toFixed(4));
    const parts = s.displayName.split(",");
    setProfileName(parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : parts[0].trim());
    setSuggestions([]);
    setCitySearch(s.displayName);
  }

  function tryGps() {
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setFormError(
        "Browser Geolocation requires HTTPS. Since you are accessing via HTTP on your local network, this will fail. Please enter coordinates manually."
      );
    }
    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLon(pos.coords.longitude.toFixed(4));
        if (!profileName) setProfileName("GPS Location");
        setGpsLocating(false);
      },
      (err) => {
        setFormError(`Geolocation failed: ${err.message}`);
        setGpsLocating(false);
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }

  async function saveProfile() {
    setFormError(null);
    const latNum = parseFloat(lat);
    let lonNum = parseFloat(lon);
    if (lonNum > 180) lonNum -= 360;
    if (lonNum < -180) lonNum += 360;

    const minAzNum = porchMode ? parseFloat(minAz) || 0 : 0;
    const maxAzNum = porchMode ? parseFloat(maxAz) || 360 : 360;

    const rules: Array<[boolean, string]> = [
      [isNaN(latNum) || isNaN(lonNum), "Latitude and Longitude are required. Please enter your location's coordinates."],
      [latNum < -90 || latNum > 90, "Latitude must be between -90 and 90 degrees."],
      [lonNum < -180 || lonNum > 180, "Longitude must be between -180 and 180 degrees."],
      [porchMode && (minAzNum < 0 || minAzNum > 360 || maxAzNum < 0 || maxAzNum > 360), "Azimuth values must be between 0 and 360 degrees."],
      [porchMode && minAzNum > maxAzNum, "Min Azimuth cannot be greater than Max Azimuth."],
    ];
    const error = rules.find(([invalid]) => invalid)?.[1];
    if (error) return setFormError(error);

    let name = profileName.trim();
    setSaving(true);
    if (!name || name === "GPS Location" || name === "Custom Location") {
      try {
        const res = await fetch(
          `${REVERSE_GEOCODE_URL}?latitude=${latNum}&longitude=${lonNum}&localityLanguage=en`
        );
        const data = await res.json();
        const parts = [];
        if (data.city || data.locality) parts.push(data.city || data.locality);
        if (data.principalSubdivision) parts.push(data.principalSubdivision);
        name = parts.length > 0 ? parts.join(", ") : data.countryName || "Custom Location";
      } catch {
        name = name || "Custom Location";
      }
    }

    const newLoc: SavedLocation = {
      id: `loc_${Date.now()}`,
      name,
      lat: latNum,
      lon: lonNum,
      porchMode,
      minAz: minAzNum,
      maxAz: maxAzNum,
    };
    const next = [...savedLocations, newLoc];
    setSavedLocations(next);
    persistLocations(next);
    setSaving(false);
    activateLocation(newLoc);
  }

  function deleteLocation(id: string) {
    const next = savedLocations.filter((l) => l.id !== id);
    setSavedLocations(next);
    persistLocations(next);
    if (id === activeId && next[0]) activateLocation(next[0]);
  }

  return (
    <Modal open={open} onClose={onClose} title="📍 Observatory Locations">
      <p className="text-sm text-zinc-400 mb-4">Select an active location or create a new custom profile.</p>

      <div className="flex flex-col gap-2 mb-5">
        {savedLocations.map((l) => (
          <div
            key={l.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              l.id === activeId ? "border-sky-500/40 bg-sky-500/[0.08]" : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <button
              onClick={() => activateLocation(l)}
              className="flex items-center gap-2 text-left flex-1 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{l.name}</p>
                <p className="text-xs font-mono text-zinc-500">{l.lat.toFixed(4)}, {l.lon.toFixed(4)}</p>
              </div>
            </button>
            {l.id !== "default-mauna-kea" && (
              <button
                onClick={() => deleteLocation(l.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                title="Delete location"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <hr className="border-white/10 my-5" />

      <h3 className="text-sm font-semibold text-zinc-100 mb-3">Add Custom Location</h3>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <label className="block text-xs text-zinc-400 mb-1">{t("lbl_city_search")}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={citySearch}
              onChange={(e) => onCitySearchChange(e.target.value)}
              placeholder="e.g. Columbus, Ohio"
              autoComplete="off"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
            />
            <button
              onClick={() => performCitySearch(citySearch)}
              disabled={searching}
              className="whitespace-nowrap rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {searching ? "⏳" : "🔍 Search"}
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1b26] shadow-lg">
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

        <div className="text-center text-xs text-zinc-500">— OR enter manually —</div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Profile Name (e.g. South Porch)</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="My Backyard"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1">{t("lbl_lat")}</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="40.126"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1">{t("lbl_lon")}</label>
            <input
              type="number"
              step="any"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-83.037"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-3">
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={porchMode}
              onChange={(e) => setPorchMode(e.target.checked)}
              className="accent-sky-500"
            />
            <span className="text-sm font-medium text-zinc-100">Enable Porch Mode (Custom Horizon)</span>
          </label>
          <p className="text-xs text-zinc-500 mb-3">Only show objects visible between specific compass headings.</p>
          {porchMode && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-400 mb-1">Min Azimuth (0-360°)</label>
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={minAz}
                  onChange={(e) => setMinAz(e.target.value)}
                  placeholder="90"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-400 mb-1">Max Azimuth (0-360°)</label>
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={maxAz}
                  onChange={(e) => setMaxAz(e.target.value)}
                  placeholder="270"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>
            </div>
          )}
        </div>

        {formError && <p className="text-xs text-red-400">{formError}</p>}

        <button
          onClick={tryGps}
          disabled={gpsLocating}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {gpsLocating ? "📡 Locating..." : "📡 Try Device GPS (Requires HTTPS)"}
        </button>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full rounded-lg bg-sky-500/20 border border-sky-500/30 px-3 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/30 transition-colors disabled:opacity-50"
        >
          {saving ? "..." : t("btn_save")}
        </button>
      </div>
    </Modal>
  );
}
