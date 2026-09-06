"use client";

import { useState, useEffect } from "react";
import { parseLocationCookie } from "@/lib/location-cookie";
import { LOCATION_COOKIE } from "@/lib/constants";
import type { LocationCoords } from "@/types";

export function getClientCoords(): LocationCoords | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCATION_COOKIE}=`));
  if (!match) return null;
  const val = match.split("=")[1];
  return parseLocationCookie(val);
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
