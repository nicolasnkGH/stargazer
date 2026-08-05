"use client";

import { useEffect, useState } from "react";

type ScriptStatus = "idle" | "loading" | "ready" | "error";

const loadedUrls = new Set<string>();

/**
 * Loads a classic <script> tag once per URL (shared across mounts/components)
 * and reports readiness. Scripts are never removed on unmount — they set
 * global state (window.d3, window.Celestial) that has to persist, same as
 * the legacy app's plain <script> tags in index.html.
 */
export function useScript(src: string | null): ScriptStatus {
  const [internalStatus, setStatus] = useState<ScriptStatus>(src && loadedUrls.has(src) ? "ready" : "loading");
  const status: ScriptStatus = src ? internalStatus : "idle";

  useEffect(() => {
    if (!src || loadedUrls.has(src)) return;

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      loadedUrls.add(src);
      setStatus("ready");
    };
    const onError = () => setStatus("error");

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [src]);

  return status;
}
