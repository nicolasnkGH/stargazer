"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "./Icon";
import GalleryButton from "./GalleryButton";
import type { MoonData } from "@/types";
import { addToPlan } from "@/hooks/useNightPlan";
import { useTranslations, useLocale } from "next-intl";
import SourceTooltip from "./SourceTooltip";
import { MOON_FACT_STORAGE_KEY_PREFIX } from "@/lib/constants";

function makePlanetBump(name: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 512, 256);
  const numCraters = name === "moon" ? 180 : 80;
  for (let i = 0; i < numCraters; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 256;
    const r = Math.random() * 12 + 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.7, "#404040");
    g.addColorStop(1, "#808080");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function Moon3DWidget({ illumination_pct, phase_name }: { illumination_pct: number; phase_name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isInView) return;

    const w = container.clientWidth || 200;
    const h = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Deep ambient starlight
    scene.add(new THREE.AmbientLight(0x1a2238, 0.35));

    // Directional sunlight mapped precisely to lunar phase angle
    const pName = (phase_name ?? "").toLowerCase();
    const isWaxing = !(pName.includes("waning") || pName.includes("last") || pName.includes("third") || pName.includes("3q"));
    const fraction = Math.max(0, Math.min(100, illumination_pct)) / 100;
    let angle = Math.PI * (1 - fraction);
    if (!isWaxing) angle = -Math.PI * (1 - fraction);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    dirLight.position.set(Math.sin(angle) * 4, 0.4, Math.cos(angle) * 4);
    scene.add(dirLight);

    // Soft earthshine bounce light on the unlit limb
    const earthshine = new THREE.DirectionalLight(0x38bdf8, 0.15);
    earthshine.position.set(-Math.sin(angle) * 3, -0.2, -Math.cos(angle) * 3);
    scene.add(earthshine);

    const geo = new THREE.SphereGeometry(1, 48, 48);
    const texLoader = new THREE.TextureLoader();

    const mat = new THREE.MeshStandardMaterial({
      map: texLoader.load("/textures/moon_texture.webp"),
      bumpMap: new THREE.CanvasTexture(makePlanetBump("moon")),
      bumpScale: 0.02,
      roughness: 0.92,
      metalness: 0.02,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = false;

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      mesh.rotation.y += 0.0012;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 200;
      const nh = container.clientHeight || 180;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [illumination_pct, phase_name, isInView]);

  return (
    <div
      className="w-full h-44 flex items-center justify-center relative touch-pan-y"
      style={{ background: "radial-gradient(circle at center, rgba(30,40,60,0.35) 0%, transparent 70%)" }}
    >
      <div
        ref={containerRef}
        className="aspect-square h-44 w-44 rounded-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}

function useMoonFact(fresh: string | undefined) {
  const locale = useLocale();
  const [cached, setCached] = useState<string | null>(null);

  useEffect(() => {
    const key = `${MOON_FACT_STORAGE_KEY_PREFIX}${locale}`;
    if (fresh) {
      localStorage.setItem(key, fresh);
      setTimeout(() => setCached(fresh), 0);
    } else {
      setTimeout(() => setCached(localStorage.getItem(key)), 0);
    }
  }, [fresh, locale]);

  return fresh ?? cached;
}

export default function MoonCard({ moon, moonFact }: { moon: MoonData | null; moonFact?: string }) {
  const t = useTranslations();
  const fact = useMoonFact(moonFact);
  
  // Keep the placeholder through hydration, then swap in the WebGL widget on the next frame.
  // This avoids the SSR/client markup mismatch and satisfies react-hooks/set-state-in-effect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
    <div className="card card-body flex flex-col h-full select-none touch-pan-y">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="moon" className="h-5 w-5 text-amber-400" />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">{t("moon_card_title")}</h3>
        <div className="ml-auto flex items-center gap-2">
          <SourceTooltip
            source="NASA JPL DE421"
            description={t("source_moon_desc")}
            attribution={t("source_moon_attr")}
          />
          <span className="text-xs text-zinc-400 font-mono font-bold">{moon.illumination_pct}%</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <GalleryButton targetId="moon" targetName="Moon" />
        <button
          onClick={addMoonToPlan}
          className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {t("btn_add_moon_to_plan")}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <p className="text-base font-semibold text-zinc-100">{moon.phase_name}</p>
      </div>

      <div className="w-full rounded-full bg-white/10 h-2 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all"
          style={{ width: `${moon.illumination_pct}%` }}
        />
      </div>

      {/* 3D Moon Widget with pointer-events-none so scrolling glides down page */}
      {mounted ? (
        <Moon3DWidget illumination_pct={moon.illumination_pct} phase_name={moon.phase_name} />
      ) : (
        <div className="w-full h-44 flex items-center justify-center rounded-lg bg-white/5 animate-pulse" />
      )}

      {(moon.moonrise || moon.moonset || moon.altitude_deg != null) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300 font-mono">
          {moon.moonrise && (
            <span>{t("lbl_rise")} <span className="text-cyan-300 font-bold">{moon.moonrise}</span></span>
          )}
          {moon.moonset && (
            <span>{t("lbl_set")} <span className="text-cyan-300 font-bold">{moon.moonset}</span></span>
          )}
          {moon.altitude_deg != null && (
            <span>{t("lbl_alt")} <span className="text-amber-300 font-bold">{moon.altitude_deg}° {moon.direction ?? ""}</span></span>
          )}
        </div>
      )}

      {/* Rich Lunar Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
          <span className="text-[0.65rem] uppercase tracking-wider text-zinc-500 font-semibold block mb-0.5">📏 Distance</span>
          <span className="font-mono text-zinc-200 font-bold">~384,400 km</span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
          <span className="text-[0.65rem] uppercase tracking-wider text-zinc-500 font-semibold block mb-0.5">🔭 Best Filter</span>
          <span className="font-mono text-amber-300 font-semibold">ND Moon Filter</span>
        </div>
        <div className="col-span-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
          <span className="text-[0.65rem] uppercase tracking-wider text-cyan-400 font-semibold block mb-0.5">🔍 Terminator Feature Tonight</span>
          <span className="text-zinc-200 font-medium">Sea of Tranquility & Tycho Crater rim relief</span>
        </div>
      </div>

      {moon.dso_impact && (
        <p className="mt-3 text-xs text-zinc-300 font-medium leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">{moon.dso_impact}</p>
      )}

      {fact && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-zinc-400 leading-relaxed italic">💡 {fact}</p>
        </div>
      )}
    </div>
  );
}
