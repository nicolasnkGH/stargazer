"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTranslations } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { PlanetData } from "@/types";

const PLANET_CONFIGS: Record<
  string,
  {
    rotSpeed?: number;
    bumpScale?: number;
    hasRing?: boolean;
    ringTex?: string;
    tilt?: number;
    texUrl?: string;
    radialGlow?: string;
  }
> = {
  sun: {
    rotSpeed: 0.002,
    tilt: 7.25,
    texUrl: "/textures/2k_sun.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(245,158,11,0.35) 0%, rgba(217,119,6,0.15) 50%, transparent 80%)",
  },
  mercury: {
    rotSpeed: 0.003,
    bumpScale: 0.015,
    tilt: 0.03,
    texUrl: "/textures/mercury.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(217,119,6,0.25) 0%, rgba(100,116,139,0.15) 60%, transparent 80%)",
  },
  venus: {
    rotSpeed: -0.001,
    bumpScale: 0.005,
    tilt: 177.3,
    texUrl: "/textures/venus.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(234,179,8,0.35) 0%, rgba(161,98,7,0.15) 60%, transparent 80%)",
  },
  mars: {
    rotSpeed: 0.005,
    bumpScale: 0.02,
    tilt: 25.19,
    texUrl: "/textures/mars.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(239,68,68,0.35) 0%, rgba(153,27,27,0.15) 60%, transparent 80%)",
  },
  jupiter: {
    rotSpeed: 0.012,
    bumpScale: 0.008,
    tilt: 3.13,
    texUrl: "/textures/jupiter.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(249,115,22,0.35) 0%, rgba(194,65,12,0.15) 60%, transparent 80%)",
  },
  saturn: {
    rotSpeed: 0.01,
    bumpScale: 0.005,
    hasRing: true,
    ringTex: "/textures/saturn_ring_color.jpg",
    tilt: 26.73,
    texUrl: "/textures/saturn.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(234,179,8,0.3) 0%, rgba(202,138,4,0.15) 60%, transparent 80%)",
  },
  uranus: {
    rotSpeed: -0.007,
    bumpScale: 0.004,
    tilt: 97.77,
    texUrl: "/textures/uranus.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(6,182,212,0.35) 0%, rgba(14,116,144,0.15) 60%, transparent 80%)",
  },
  neptune: {
    rotSpeed: 0.008,
    bumpScale: 0.004,
    tilt: 28.32,
    texUrl: "/textures/neptune.jpg",
    radialGlow: "radial-gradient(circle at center, rgba(59,130,246,0.35) 0%, rgba(29,78,216,0.15) 60%, transparent 80%)",
  },
};

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

function Planet3DCanvas({ name }: { name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const key = name.toLowerCase();
  const cfg = PLANET_CONFIGS[key];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 180;
    const h = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.pointerEvents = "auto";

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, key === "sun" ? 2.5 : 0.4));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, key === "sun" ? 0 : 1.8);
    dirLight.position.set(4, 2, 3);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x406090, 0.3);
    fillLight.position.set(-4, -1, -2);
    scene.add(fillLight);

    const planetGroup = new THREE.Group();
    if (cfg?.tilt) {
      planetGroup.rotation.z = THREE.MathUtils.degToRad(cfg.tilt);
    }
    scene.add(planetGroup);

    const geo = new THREE.SphereGeometry(1, 48, 48);
    const texLoader = new THREE.TextureLoader();

    let mat: THREE.Material;
    if (key === "sun") {
      mat = new THREE.MeshBasicMaterial({
        map: cfg?.texUrl ? texLoader.load(cfg.texUrl) : null,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        map: cfg?.texUrl ? texLoader.load(cfg.texUrl) : null,
        bumpMap: new THREE.CanvasTexture(makePlanetBump(key)),
        bumpScale: cfg?.bumpScale ?? 0.01,
        roughness: key === "venus" ? 0.9 : 0.7,
        metalness: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    planetGroup.add(mesh);

    let ringMesh: THREE.Mesh | null = null;
    if (cfg?.hasRing) {
      const ringGeo = new THREE.RingGeometry(1.3, 2.2, 64);
      const pos = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const len = Math.sqrt(vx * vx + vy * vy);
        const norm = (len - 1.3) / (2.2 - 1.3);
        uv.setXY(i, norm, 0.5);
      }

      const ringMat = new THREE.MeshStandardMaterial({
        map: cfg?.ringTex ? texLoader.load(cfg.ringTex) : null,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        roughness: 0.5,
      });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      planetGroup.add(ringMesh);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false; 
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
    const speed = cfg?.rotSpeed ?? 0.003;
    const animate = (t: number) => {
      rafId = requestAnimationFrame(animate);
      if (!visible || !pageVisible) return;
      if (t - lastT < FPS_INTERVAL) return;
      lastT = t;
      mesh.rotation.y += speed;
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
  }, [key, cfg]);

  const bgStyle = cfg?.radialGlow
    ? { background: cfg.radialGlow }
    : { background: "radial-gradient(circle at center, rgba(56,189,248,0.2) 0%, transparent 70%)" };

  return (
    <div className="w-full h-44 flex items-center justify-center relative touch-pan-y">
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden relative z-10 touch-pan-y"
        style={bgStyle}
      />
    </div>
  );
}

function PlanetCard({ planet }: { planet: PlanetData }) {
  const t = useTranslations();

  return (
    <div className="hud-card relative rounded-2xl border border-white/10 bg-slate-950/80 p-4 flex flex-col justify-between shadow-lg hover:border-sky-400/40 transition-all overflow-hidden group">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />

      <div className="relative z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{planet.emoji}</span>
            <div>
              <h3 className="text-base font-bold text-slate-100 leading-tight">
                {planet.name}
              </h3>
            </div>
          </div>
          <span className="rounded bg-sky-950/80 border border-sky-400/30 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-sky-300">
            {planet.direction || "E"}
          </span>
        </div>

        <Planet3DCanvas name={planet.name} />
      </div>

      <div className="relative z-20 mt-2">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[0.7rem] font-mono font-bold text-sky-300">
            {planet.constellation}
          </span>
        </div>

        <div className="mt-2 border-t border-white/10 pt-2 text-xs flex flex-col gap-1">
          <span className={`font-bold flex items-center gap-1.5 ${planet.visible_tonight ? "text-emerald-300" : "text-slate-400"}`}>
            <span className={`h-2 w-2 rounded-full ${planet.visible_tonight ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
            {planet.visible_tonight ? t("visible_tonight") : t("not_visible_tonight")}
          </span>
          <p className="text-[0.75rem] text-slate-300 leading-snug line-clamp-2 mt-0.5">
            {planet.how_to_find}
          </p>
          <span className="text-[0.7rem] text-slate-400 font-mono mt-0.5">
            {t("lbl_rise")}: {planet.rise_time} · {t("lbl_set")}: {planet.set_time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetGrid({ planets = [] }: { planets?: PlanetData[] }) {
  const t = useTranslations();
  return (
    <section id="card-planets" className="card w-full mb-8 border border-sky-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      <div className="card-header border-b border-sky-500/20 px-6 py-4 bg-slate-900/80 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {t("planets_tonight")}
          </h2>
        </div>
        <SourceTooltip
          source="NASA JPL & Skyfield"
          description={t("source_planets_desc")}
          attribution={t("source_planets_attr")}
        />
      </div>

      <div className="p-6">
        {planets.length === 0 ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
            {t("planet_data_unavailable")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {planets.map((p) => (
              <PlanetCard key={p.name} planet={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
