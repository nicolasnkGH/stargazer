"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useLocale, useTranslations } from "next-intl";
import Icon from "./Icon";
import type { MoonData } from "@/types";
import { MOON_FACT_STORAGE_KEY_PREFIX } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import GalleryButton from "./GalleryButton";
import { makePlanetBump } from "@/lib/three/planet-surface";

/**
 * Interactive 3D moon — ported from legacy web/moon3d.js v6:
 * drag-to-rotate / scroll-to-zoom (OrbitControls), procedural crater bump map,
 * idle spin that pauses while dragging, and a sun-directional light whose
 * position follows the real lunar phase (waxing vs waning).
 */
function Moon3DWidget({ illumination_pct, phase_name }: { illumination_pct: number; phase_name?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Lighting — soft ambient + directional "Sun" (position set by phase below)
    scene.add(new THREE.AmbientLight(0x1a1a2e, 0.4));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    dirLight.position.set(-2, 1, 2);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8090b0, 0.15);
    fillLight.position.set(2, -0.5, 1);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x4040a0, 0.1);
    rimLight.position.set(5, 0, -5);
    scene.add(rimLight);

    // Phase-driven light direction (legacy applyMoon3DPhase):
    // New moon → light behind; full moon → light in front; sign flips for waning.
    const pName = (phase_name ?? "").toLowerCase();
    const isWaxing = !(pName.includes("waning") || pName.includes("last") || pName.includes("third") || pName.includes("3q"));
    const fraction = Math.max(0, Math.min(100, illumination_pct)) / 100;
    let angle = Math.PI * (1 - fraction);
    if (!isWaxing) angle = -Math.PI * (1 - fraction);
    dirLight.position.set(Math.sin(angle) * 3, 0.5, Math.cos(angle) * 3);

    const geo = new THREE.SphereGeometry(1, 48, 48);
    const texLoader = new THREE.TextureLoader();
    const mat = new THREE.MeshStandardMaterial({
      map: texLoader.load("/assets/moon_texture.jpg"),
      bumpMap: new THREE.CanvasTexture(makePlanetBump("moon")),
      bumpScale: 0.01,
      roughness: 0.95,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Drag-to-rotate + scroll-to-zoom (legacy interaction model)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Idle spin: pause while dragging, resume 2s after release (legacy behavior)
    let idle = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const dom = renderer.domElement;
    const onPointerDown = () => {
      idle = false;
      if (idleTimer) clearTimeout(idleTimer);
    };
    const onPointerUp = () => {
      idleTimer = setTimeout(() => { idle = true; }, 2000);
    };
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointerup", onPointerUp);

    // Pause rendering when the card scrolls off screen or the tab hides
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(container);
    let pageVisible = !document.hidden;
    const onVisibilityChange = () => { pageVisible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 30fps throttled loop (legacy)
    const FPS_INTERVAL = 1000 / 30;
    let rafId = 0;
    let lastT = 0;
    const animate = (t: number) => {
      rafId = requestAnimationFrame(animate);
      if (!visible || !pageVisible) return;
      if (t - lastT < FPS_INTERVAL) return;
      lastT = t;
      controls.update();
      if (idle) {
        mesh.rotation.y += 0.0012;
      }
      renderer.render(scene, camera);
    };
    animate(performance.now());

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!width || !height) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      if (idleTimer) clearTimeout(idleTimer);
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
      mat.dispose();
      geo.dispose();
    };
  }, [illumination_pct, phase_name]);

  return (
    <div className="w-full h-44 flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ background: "radial-gradient(circle at center, rgba(30,40,60,0.3) 0%, transparent 70%)" }} />
    </div>
  );
}

function useMoonFact(fresh: string | undefined) {
  const locale = useLocale();
  const [cached, setCached] = useState<string | null>(null);

  // Hydrating from localStorage, which doesn't exist during SSR — can't be a lazy
  // useState initializer without a hydration mismatch, so this has to be an effect.
  useEffect(() => {
    const key = `${MOON_FACT_STORAGE_KEY_PREFIX}${locale}`;
    if (fresh) {
      localStorage.setItem(key, fresh);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCached(fresh);
    } else {
      setCached(localStorage.getItem(key));
    }
  }, [fresh, locale]);

  return fresh ?? cached;
}

export default function MoonCard({ moon, moonFact }: { moon: MoonData | null; moonFact?: string }) {
  const t = useTranslations();
  const fact = useMoonFact(moonFact);

  function addMoonToPlan() {
    const err = addToPlan("moon", "🌙 The Moon");
    if (err) alert(err);
  }

  if (!moon) {
    return (
      <div className="card p-5 h-full">
        <p className="text-sm text-red-400">Moon data unavailable.</p>
      </div>
    );
  }

  return (
    <div className="card card-body flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="moon" className="h-5 w-5 text-amber-400" />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Moon</h3>
        <span className="ml-auto text-xs text-zinc-500">{moon.illumination_pct}%</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <GalleryButton targetId="moon" targetName="Moon" />
        <button
          onClick={addMoonToPlan}
          className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
        >
          {t("btn_add_moon_to_plan")}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{moon.emoji ?? moon.phase_name.split(" ")[0] ?? "🌙"}</span>
        <div>
          <p className="text-base font-semibold text-zinc-100">{moon.phase_name}</p>
        </div>
      </div>

      <div className="w-full rounded-full bg-white/10 h-2 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all"
          style={{ width: `${moon.illumination_pct}%` }}
        />
      </div>

      <Moon3DWidget illumination_pct={moon.illumination_pct} phase_name={moon.phase_name} />

      {(moon.moonrise || moon.moonset || moon.altitude_deg != null) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
          {moon.moonrise && (
            <span>Rise: <span className="text-zinc-200">{moon.moonrise}</span></span>
          )}
          {moon.moonset && (
            <span>Set: <span className="text-zinc-200">{moon.moonset}</span></span>
          )}
          {moon.altitude_deg != null && (
            <span>Alt: {moon.altitude_deg}° {moon.direction ?? ""}</span>
          )}
        </div>
      )}

      {moon.dso_impact && (
        <p className="mt-2 text-xs text-zinc-400">{moon.dso_impact}</p>
      )}

      {fact && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-zinc-400 leading-relaxed italic">{fact}</p>
        </div>
      )}
    </div>
  );
}
