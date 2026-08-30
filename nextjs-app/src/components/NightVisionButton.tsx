"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NIGHT_MODE_STORAGE_KEY } from "@/lib/constants";

const POS_KEY = "stargazer_floating-night_pos";

export default function NightVisionButton() {
  const [mounted, setMounted] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client state on mount
    setMounted(true);
    let mode = false;
    let savedPos: { left: number; top: number } | null = null;
    try {
      if (localStorage.getItem(NIGHT_MODE_STORAGE_KEY) === "1") mode = true;
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (
          typeof p.left === "number" &&
          typeof p.top === "number" &&
          p.left < window.innerWidth - 50 &&
          p.top < window.innerHeight - 50 &&
          p.left >= 0 &&
          p.top >= 0
        ) {
          savedPos = { left: p.left, top: p.top };
        }
      }
    } catch {
      /* ignore storage errors */
    }
    setNightMode(mode);
    setPos(savedPos);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("night-mode", nightMode);
    try {
      localStorage.setItem(NIGHT_MODE_STORAGE_KEY, nightMode ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [nightMode]);

  if (!mounted) return null;

  function onPointerDown(e: React.PointerEvent) {
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
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
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
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            /* ignore */
          }
        }
        return p;
      });
    }
  }

  function onFabClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setNightMode((v) => !v);
  }

  return createPortal(
    <>
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
      </div>
    </>,
    document.body,
  );
}
