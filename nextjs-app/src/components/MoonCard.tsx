"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "./Icon";
import GalleryButton from "./GalleryButton";
import type { MoonData } from "@/types";
import { addToPlan } from "@/hooks/useNightPlan";
import { useTranslations, useLocale } from "next-intl";
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 200;
    const h = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.pointerEvents = "auto";

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false; // Disabled wheel zoom capture to allow smooth page scrolling
    controls.autoRotate = false;

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(container);
    let pageVisible = !document.hidden;
    const onVisibilityChange = () => { pageVisible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const FPS_INTERVAL = 1000 / 30;
    let rafId = 0;
    let lastT = 0;
    const animate = (t: number) => {
      rafId = requestAnimationFrame(animate);
      if (!visible || !pageVisible) return;
      if (t - lastT < FPS_INTERVAL) return;
      lastT = t;
      mesh.rotation.y += 0.0015;
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
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls.dispose();
      renderer.dispose();
      mat.dispose();
      geo.dispose();
    };
  }, [illumination_pct, phase_name]);

  return (
    <div className="w-full h-44 flex items-center justify-center touch-pan-y">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden touch-pan-y" style={{ background: "radial-gradient(circle at center, rgba(30,40,60,0.3) 0%, transparent 70%)" }} />
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
    <div className="card card-body flex flex-col h-full select-none touch-pan-y">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="moon" className="h-5 w-5 text-amber-400" />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Moon</h3>
        <span className="ml-auto text-xs text-zinc-500 font-mono font-bold">{moon.illumination_pct}%</span>
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

      {/* 3D Moon Widget with pointer-events-none so scrolling glides down page */}
      <Moon3DWidget illumination_pct={moon.illumination_pct} phase_name={moon.phase_name} />

      {(moon.moonrise || moon.moonset || moon.altitude_deg != null) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300 font-mono">
          {moon.moonrise && (
            <span>Rise: <span className="text-cyan-300 font-bold">{moon.moonrise}</span></span>
          )}
          {moon.moonset && (
            <span>Set: <span className="text-cyan-300 font-bold">{moon.moonset}</span></span>
          )}
          {moon.altitude_deg != null && (
            <span>Alt: <span className="text-amber-300 font-bold">{moon.altitude_deg}° {moon.direction ?? ""}</span></span>
          )}
        </div>
      )}

      {moon.dso_impact && (
        <p className="mt-2 text-xs text-zinc-300 font-medium">{moon.dso_impact}</p>
      )}

      {fact && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-zinc-400 leading-relaxed italic">{fact}</p>
        </div>
      )}
    </div>
  );
}
