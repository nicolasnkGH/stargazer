"use client";

import { useState, useEffect } from "react";
import { parseLocationCookie } from "@/lib/location-cookie";
import {
  LOCATION_COOKIE,
  ACTIVE_LOCATION_STORAGE_KEY,
  SAVED_LOCATIONS_STORAGE_KEY,
  DEFAULT_LOCATIONS,
} from "@/lib/constants";
import { writeLocationCookie } from "@/lib/location-cookie";
import type { LocationCoords, SavedLocation } from "@/types";

export function getClientCoords(): LocationCoords | null {
  if (typeof window !== "undefined") {
    try {
      const activeId = localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY);
      const raw = localStorage.getItem(SAVED_LOCATIONS_STORAGE_KEY);
      if (raw) {
        const locs: SavedLocation[] = JSON.parse(raw);
        if (Array.isArray(locs) && locs.length > 0) {
          const active = (activeId ? locs.find((l) => l.id === activeId) : null) ?? locs[0];
          if (active && typeof active.lat === "number" && typeof active.lon === "number") {
            // Keep cookie in sync with localStorage
            writeLocationCookie(active.lat, active.lon);
            return { lat: active.lat, lon: active.lon };
          }
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }

  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCATION_COOKIE}=`));
  if (match) {
    const val = match.split("=")[1];
    const parsed = parseLocationCookie(val);
    if (parsed) return parsed;
  }

  return { lat: DEFAULT_LOCATIONS[0].lat, lon: DEFAULT_LOCATIONS[0].lon };
}

export function useClientLocation(): LocationCoords | null {
  const [coords, setCoords] = useState<LocationCoords | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoords(getClientCoords());

    const updateLoc = () => {
      setCoords(getClientCoords());
    };
    window.addEventListener("stargazer_location_change", updateLoc);
    window.addEventListener("storage", updateLoc);
    return () => {
      window.removeEventListener("stargazer_location_change", updateLoc);
      window.removeEventListener("storage", updateLoc);
    };
  }, []);

  return coords;
}
