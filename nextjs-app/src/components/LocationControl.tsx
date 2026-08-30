"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import { DEFAULT_LOCATIONS, SAVED_LOCATIONS_STORAGE_KEY, ACTIVE_LOCATION_STORAGE_KEY } from "@/lib/constants";
import type { SavedLocation } from "@/types";
import LocationModal from "./LocationModal";

function loadSavedLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(SAVED_LOCATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter(
        (l): l is SavedLocation => typeof l.lat === "number" && typeof l.lon === "number" && !!l.name
      );
      if (valid.length > 0) return valid;
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCATIONS;
}

export default function LocationControl() {
  const t = useTranslations();
  const [locations, setLocations] = useState<SavedLocation[]>(DEFAULT_LOCATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const saved = loadSavedLocations();
    const storedActiveId = localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY);
    const active = saved.find((l) => l.id === storedActiveId) ?? saved[0];
    setTimeout(() => { setLocations(saved); setActiveId(active?.id ?? null); setHydrated(true); }, 0);
    // active id
    // hydrated
  }, []);

  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  const formatCoords = (lat: number, lon: number) => {
    const latStr = lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`;
    return `${latStr}, ${lonStr}`;
  };

  return (
    <>
      <button
        id="btn-location"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 text-left hover:text-sky-300 transition-colors py-0.5 px-1"
        title={t("set_loc_btn")}
      >
        <Icon name="map-pin" className="h-3.5 w-3.5 text-sky-400 flex-shrink-0 animate-bounce-subtle" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[0.75rem] font-bold text-slate-100 flex items-center gap-1">
            <span className="truncate max-w-[100px] sm:max-w-[140px]">{hydrated && active ? active.name : t("loading_loc")}</span>
            <Icon name="pencil" className="h-2.5 w-2.5 text-sky-400/80 flex-shrink-0" />
          </span>
          <span className="font-mono text-[0.65rem] text-sky-300/80 tracking-tight whitespace-nowrap">
            {hydrated && active ? formatCoords(active.lat, active.lon) : "Lat: --, Lon: --"}
          </span>
        </div>
      </button>

      <LocationModal open={modalOpen} onClose={() => setModalOpen(false)} locations={locations} activeId={activeId} />
    </>
  );
}
