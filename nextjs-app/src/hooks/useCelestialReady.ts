"use client";

import { useEffect } from "react";
import { useScript } from "./useScript";
import { CELESTIAL_SCRIPTS, CELESTIAL_CSS_URL } from "@/lib/constants";

function useCelestialCss() {
  useEffect(() => {
    if (document.querySelector(`link[href="${CELESTIAL_CSS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CELESTIAL_CSS_URL;
    document.head.appendChild(link);
  }, []);
}

/**
 * Loads d3 v3, d3.geo.projection, then d3-celestial in order — celestial.js
 * expects `d3` (and d3.geo.projection) to already be a global, so each script
 * only starts loading once the previous one is ready. Returns true once
 * window.Celestial is usable.
 */
export function useCelestialReady(): boolean {
  const [d3Url, projectionUrl, celestialUrl] = CELESTIAL_SCRIPTS;

  const d3Status = useScript(d3Url);
  const projectionStatus = useScript(d3Status === "ready" ? projectionUrl : null);
  const celestialStatus = useScript(projectionStatus === "ready" ? celestialUrl : null);

  useCelestialCss();

  return celestialStatus === "ready" && typeof window !== "undefined" && !!window.Celestial;
}
