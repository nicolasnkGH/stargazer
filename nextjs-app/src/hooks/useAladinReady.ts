"use client";

import { useEffect } from "react";
import { useScript } from "./useScript";
import { ALADIN_JS_URL, ALADIN_CSS_URL } from "@/lib/constants";

function useAladinCss() {
  useEffect(() => {
    if (document.querySelector(`link[href="${ALADIN_CSS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ALADIN_CSS_URL;
    document.head.appendChild(link);
  }, []);
}

/** Loads Aladin Lite v2 from CDN. Returns true once window.A is usable. */
export function useAladinReady(enabled: boolean): boolean {
  const status = useScript(enabled ? ALADIN_JS_URL : null);
  useAladinCss();
  return status === "ready" && typeof window !== "undefined" && !!window.A;
}
