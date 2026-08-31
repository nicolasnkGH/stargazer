import { LOCATION_COOKIE } from "@/lib/constants";
import type { LocationCoords } from "@/types";

export function parseLocationCookie(raw: string | undefined): LocationCoords | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    // ignore malformed cookie
  }
  return null;
}

/** Client-side write, mirrors Header.tsx's setLocale() cookie pattern. */
export function writeLocationCookie(lat: number, lon: number) {
  document.cookie = `${LOCATION_COOKIE}=${encodeURIComponent(JSON.stringify({ lat, lon }))}; path=/; max-age=31536000; SameSite=Lax`;
}
