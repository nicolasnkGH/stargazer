"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FiMapPin, FiCrosshair, FiEdit2 } from "react-icons/fi";
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
    // ignore malformed saved data, keep defaults
  }
  return DEFAULT_LOCATIONS;
}

export default function LocationControl() {
  const t = useTranslations();
  const [locations, setLocations] = useState<SavedLocation[]>(DEFAULT_LOCATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // localStorage doesn't exist during SSR — hydrate after mount to avoid a mismatch,
  // matching the pattern already used by ObservationLog.tsx / Header.tsx's isMetric.
  useEffect(() => {
    const saved = loadSavedLocations();
    const storedActiveId = localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY);
    const active = saved.find((l) => l.id === storedActiveId) ?? saved[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocations(saved);
    setActiveId(active?.id ?? null);
    setHydrated(true);
  }, []);

  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          id="btn-location"
          onClick={() => setModalOpen(true)}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-sky-400 transition-colors"
          title={t("set_loc_btn")}
        >
          <FiMapPin className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-sky-400 transition-colors"
          title="Auto-detect Location"
        >
          <FiCrosshair className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setModalOpen(true)} className="flex flex-col items-start leading-tight text-left hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1 text-[0.7rem] font-semibold text-zinc-200">
            {hydrated && active ? active.name : t("loading_loc")}
            <FiEdit2 className="h-2.5 w-2.5 text-zinc-500" />
          </span>
          <span className="font-mono text-[0.65rem] text-zinc-500">
            {hydrated && active ? `Lat: ${active.lat.toFixed(2)}, Lon: ${active.lon.toFixed(2)}` : "Lat: --, Lon: --"}
          </span>
        </button>
      </div>

      <LocationModal open={modalOpen} onClose={() => setModalOpen(false)} locations={locations} activeId={activeId} />
    </>
  );
}
