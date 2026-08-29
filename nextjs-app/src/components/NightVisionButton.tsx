"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NIGHT_MODE_STORAGE_KEY } from "@/lib/constants";

/**
 * Night Vision Mode — floating red-light button (legacy UX restored).
 *
 * The vanilla build had a draggable 🔴 FAB at bottom-right (`#floating-night`
 * in web/index.html) that toggled `body.night-mode`: a full-viewport red
 * overlay for preserving dark-adapted eyes during real observing sessions.
 * The Next.js port dropped the button entirely (only the CSS survived), so
 * this component restores it 1:1 — same look, drag behaviour, position
 * persistence, and dismiss flag (identical localStorage keys).
 */

const POS_KEY = "stargazer_floating-night_pos";
const DISMISS_KEY = "stargazer_floating-night_dismissed";

// Deep-red night-vision look, ported from original web/style.css.
// Applied as an INLINE style on #nv-scope (not via stylesheet): Next 16's
// CSS minifier (lightningcss) mangles stylesheet backdrop-filter/filter
// declarations containing sepia(), silently dropping the argument and
// invalidating the whole chain. Inline styles bypass the CSS pipeline.
const NV_FILTER = "sepia(100%) hue-rotate(320deg) saturate(500%) brightness(0.8)";

/** Toggle the night-mode visual state on the DOM. */
function applyNightMode(on: boolean) {
  document.body.classList.toggle("night-mode", on);
  const scope = document.getElementById("nv-scope");
  if (scope) scope.style.filter = on ? NV_FILTER : "";
}

export default function NightVisionButton() {
  const [mounted, setMounted] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [dismissed, setDismissed] = useState(true); // true until hydration says otherwise
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  // Set when the current gesture becomes a drag; read by onFabClick AFTER
  // pointerup has already run (dragState is nulled there, so it can't be used).
  const movedRef = useRef(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  } | null>(null);

  // Hydrate persisted state (mode + dismissed + saved position) after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted client state after mount
    setMounted(true);
    let mode = false;
    let isDismissed = true;
    let savedPos: { left: number; top: number } | null = null;
    try {
      if (localStorage.getItem(NIGHT_MODE_STORAGE_KEY) === "1") mode = true;
      if (localStorage.getItem(DISMISS_KEY) !== "1") isDismissed = false;
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.left === "number" && typeof p.top === "number") {
          savedPos = { left: p.left, top: p.top };
        }
      }
    } catch { /* corrupted storage — use defaults */ }
    setNightMode(mode);
    setDismissed(isDismissed);
    setPos(savedPos);
    if (!isDismissed) setTooltipOpen(true);
  }, []);

  // Keep <body> class + the inline red filter on #nv-scope in sync with the
  // toggle. The filter must be inline (not stylesheet): Next 16's minifier
  // mangles sepia() in CSS rules, which silently kills the red chain.
  useEffect(() => {
    applyNightMode(nightMode);
    try {
      localStorage.setItem(NIGHT_MODE_STORAGE_KEY, nightMode ? "1" : "0");
    } catch { /* ignore */ }
  }, [nightMode]);

  // The red filter overlay must stay mounted whenever we're client-side, even
  // if the FAB itself was dismissed — dismissing the control must not kill an
  // active night-mode session. Portaled to <body>: any ancestor with
  // backdrop-filter (e.g. the sticky header) becomes its containing block and
  // would trap the fixed-positioned overlay inside that strip.
  if (!mounted) return null;

  const fabVisible = !dismissed;

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-nv-dismiss]")) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    movedRef.current = false;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    // NOTE: deliberately NOT calling setPointerCapture() here. Capturing on
    // press retargets the trailing click event onto this wrapper, which would
    // prevent the button's onClick from ever firing. We capture lazily in
    // onPointerMove, only once the gesture has proven to be a drag.
  }

  function onPointerMove(e: React.PointerEvent) {
    const ds = dragState.current;
    const el = wrapRef.current;
    if (!ds || !el) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      ds.moved = true;
      movedRef.current = true;
      // Now that we know this is a drag, take over the pointer so tracking
      // continues even when the cursor leaves the element mid-drag.
      try {
        el.setPointerCapture(e.pointerId);
      } catch { /* pointer already gone — ignore */ }
    }
    if (!ds.moved) return;
    const nextLeft = Math.min(Math.max(ds.startLeft + dx, 0), window.innerWidth - el.offsetWidth);
    const nextTop = Math.min(Math.max(ds.startTop + dy, 0), window.innerHeight - el.offsetHeight);
    setPos({ left: nextLeft, top: nextTop });
  }

  function onPointerUp() {
    const ds = dragState.current;
    dragState.current = null;
    if (ds?.moved) {
      // Persist final position (legacy key format: {left, top} px values)
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch { /* ignore */ }
        }
        return p;
      });
    }
  }

  function onFabClick() {
    // Ignore the click that ends a drag gesture (movedRef survives pointerup,
    // unlike dragState which is nulled there before this runs).
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setNightMode((v) => !v);
  }

  function onDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
  }

  return createPortal(
    <>
      {/* Full-viewport red filter. Portaled to <body> like the FAB: any
          ancestor with backdrop-filter (e.g. the sticky header) would become
          its containing block and trap the fixed-positioned overlay. */}
      <div id="night-overlay" aria-hidden="true" />
      <div
      ref={wrapRef}
      className="nv-fab-wrapper"
      style={
        pos
          ? { left: pos.left, top: pos.top, bottom: "auto", right: "auto" }
          : undefined
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {tooltipOpen && fabVisible && (
        <div className="nv-tooltip">
          <span>Night Vision Mode</span>
          <button
            type="button"
            className="nv-tooltip-close"
            onClick={() => setTooltipOpen(false)}
            aria-label="Close tooltip"
          >
            ✕
          </button>
        </div>
      )}
      {fabVisible && (
        <>
          <button
            type="button"
            id="btn-night-mode"
            className={`nv-fab${nightMode ? " is-active" : ""}`}
            title="Night Vision Mode"
            aria-pressed={nightMode}
            onClick={onFabClick}
          >
            🔴
          </button>
          <button
            type="button"
            className="nv-dismiss"
            data-nv-dismiss
            title="Dismiss"
            onClick={onDismiss}
          >
            ✕
          </button>
        </>
      )}
      </div>
    </>,
    document.body,
  );
}
