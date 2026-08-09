import type { SavedLocation } from "@/types";

/** Cookie holding the active {lat,lon} — read server-side in page.tsx via next/headers cookies(). */
export const LOCATION_COOKIE = "stargazer_loc";
export const SAVED_LOCATIONS_STORAGE_KEY = "stargazer_locations";
export const ACTIVE_LOCATION_STORAGE_KEY = "stargazer_active_loc";

export const DEFAULT_LOCATIONS: SavedLocation[] = [
  { id: "default-mauna-kea", name: "Mauna Kea Observatory, HI", lat: 19.8206, lon: -155.4681 },
];

/** External-direct geocoding endpoints (no backend proxy — mirrors the legacy client). */
export const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
export const CITY_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
