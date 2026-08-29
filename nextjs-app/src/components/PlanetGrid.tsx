"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "./Icon";
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

function makeSaturnRingGeo(innerR = 1.25, outerR = 2.2): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const segs = 64;
  const pos: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    pos.push(cos * innerR, sin * innerR, 0);
    uvs.push(0, i / segs);

    pos.push(cos * outerR, sin * outerR, 0);
    uvs.push(1, i / segs);
  }

  for (let i = 0; i < segs; i++) {
    const vi = i * 2;
    indices.push(vi, vi + 1, vi + 2);
    indices.push(vi + 1, vi + 3, vi + 2);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Planet3DWidget({ name }: { name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let mesh: THREE.Mesh | null = null;
    let rafId = 0;
    let io: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const lower = name.toLowerCase();
    const cfg = PLANET_CONFIGS[lower] || {};
    const ROT_SPEED = cfg.rotSpeed ?? 0.005;
    const texUrl = cfg.texUrl;

    let visible = true;
    let pageVisible = !document.hidden;
    const onVisibilityChange = () => { pageVisible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const FPS_INTERVAL = 1000 / 30;
    let lastT = 0;

    function build(texture: THREE.Texture) {
      if (disposed || !container) return;
      const w = container.clientWidth || 220;
      const h = container.clientHeight || 200;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = cfg.hasRing ? 4.2 : 3.2;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.pointerEvents = "auto";

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

      const amb = new THREE.AmbientLight(0xffffff, lower === "sun" ? 2.5 : 0.4);
      scene.add(amb);
      if (lower !== "sun") {
        const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
        sunLight.position.set(5, 3, 5);
        scene.add(sunLight);
        const fill = new THREE.DirectionalLight(0x8090b0, 0.2);
        fill.position.set(-5, -2, -3);
        scene.add(fill);
      }

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false; // Disabled wheel zoom capture to allow smooth page scrolling
      controls.autoRotate = false;

      const geo = new THREE.SphereGeometry(1, 48, 48);
      const bumpTexture = new THREE.CanvasTexture(makePlanetBump(name));
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bumpTexture,
        bumpScale: cfg.bumpScale || 0.01,
        roughness: 0.95,
        metalness: 0.0,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = THREE.MathUtils.degToRad(cfg.tilt || 0);
      scene.add(mesh);

      const loader = new THREE.TextureLoader();
      if (cfg.hasRing && cfg.ringTex) {
        loader.load(cfg.ringTex, (ringTex) => {
          if (!scene) return;
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92,
          });
          const ring = new THREE.Mesh(makeSaturnRingGeo(1.26, 2.22), ringMat);
          ring.rotation.x = Math.PI / 2;
          scene.add(ring);
        });
      }

      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
      io.observe(container);

      resizeObserver = new ResizeObserver((entries) => {
        for (const e of entries) {
          const { width: rw, height: rh } = e.contentRect;
          if (!rw || !rh || !camera || !renderer) continue;
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        }
      });
      resizeObserver.observe(container);

      const loop = (t: number) => {
        rafId = requestAnimationFrame(loop);
        if (disposed || !visible || !pageVisible) return;
        if (t - lastT < FPS_INTERVAL) return;
        lastT = t;
        if (mesh) {
          mesh.rotation.y += ROT_SPEED;
        }
        if (scene && camera && renderer) renderer.render(scene, camera);
      };
      rafId = requestAnimationFrame(loop);
    }

    const loadObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            if (texUrl) {
              const loader = new THREE.TextureLoader();
              loader.load(
                texUrl,
                (tex) => build(tex),
                undefined,
                () => {
                  build(new THREE.TextureLoader().load("/textures/jupiter.jpg"));
                }
              );
            } else {
              build(new THREE.TextureLoader().load("/textures/jupiter.jpg"));
            }
          }
        });
      },
      { threshold: 0.05 }
    );
    loadObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      loadObserver.disconnect();
      io?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls?.dispose();
      if (renderer) {
        try { renderer.dispose(); } catch {}
        renderer.domElement.remove();
      }
      scene?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };
  }, [name]);

  return <div ref={containerRef} className="h-full w-full touch-pan-y" />;
}

function PlanetCard({ planet }: { planet: PlanetData }) {
  const altStr = `${planet.altitude_deg}° ${planet.direction}`;
  const magStr = `Mag ${planet.magnitude_approx}`;
  const distStr = `${planet.distance_mkm}M km (${planet.light_time_minutes} min light)`;
  const lower = planet.name.toLowerCase();
  const cfg = PLANET_CONFIGS[lower] || {};
  const glowStyle = cfg.radialGlow || "radial-gradient(circle at center, rgba(59,130,246,0.25) 0%, transparent 70%)";

  return (
    <div className={`flex flex-col card transition-all duration-300 hover:border-sky-400/40 border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden touch-pan-y ${planet.visible_tonight ? "" : "opacity-60"}`}>
      {/* 3D Planet Header Box with Astronomical Radial Color Glow */}
      <div
        className="relative h-[210px] w-full flex-shrink-0 overflow-hidden touch-pan-y"
        style={{ background: glowStyle }}
      >
        <Planet3DWidget name={planet.name} />
      </div>

      {/* Detailed Planet Info Section */}
      <div className="flex flex-col gap-2 p-5 border-t border-white/10 bg-slate-950/80">
        {/* Name row with symbol & Naked Eye badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <span className="text-xl text-cyan-300 font-serif">{planet.emoji}</span>
            <span>{planet.name}</span>
          </span>
          {planet.naked_eye && (
            <span className="rounded-full border border-purple-500/40 bg-purple-950/60 px-2.5 py-0.5 text-[0.65rem] font-bold text-purple-300 shadow-sm">
              Naked Eye
            </span>
          )}
        </div>

        {/* Constellation Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[0.7rem] font-mono font-bold text-sky-300">
            {planet.constellation}
          </span>
        </div>

        {/* Telemetry Grid */}
        <div className="flex flex-col gap-1 font-mono text-xs mt-1">
          <span className="text-cyan-300 font-bold" title={altStr}>
            {altStr}
          </span>
          <span className="text-amber-300 font-bold" title={magStr}>
            {magStr}
          </span>
          <span className="text-slate-300 font-medium" title={distStr}>
            {distStr}
          </span>
        </div>

        {/* Visibility Status & Finding Instructions */}
        <div className="mt-2 border-t border-white/10 pt-2 text-xs flex flex-col gap-1">
          <span className={`font-bold flex items-center gap-1.5 ${planet.visible_tonight ? "text-emerald-300" : "text-slate-400"}`}>
            <span className={`h-2 w-2 rounded-full ${planet.visible_tonight ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
            {planet.visible_tonight ? "Visible tonight" : "Not visible tonight"}
          </span>
          <p className="text-[0.75rem] text-slate-300 leading-snug line-clamp-2 mt-0.5">
            {planet.how_to_find}
          </p>
          <span className="text-[0.7rem] text-slate-400 font-mono mt-0.5">
            Rise: {planet.rise_time} · Set: {planet.set_time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetGrid({ planets = [] }: { planets?: PlanetData[] }) {
  return (
    <section id="card-planets" className="card w-full mb-8 border border-sky-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="card-header border-b border-sky-500/20 px-6 py-4 bg-slate-900/80 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            Planets Tonight
          </h2>
        </div>
        <span
          className="flex cursor-pointer items-center text-xs text-slate-400 hover:text-sky-300"
          title="Calculated locally via Skyfield Ephemeris"
        >
          <Icon name="info" className="h-4 w-4 stroke-slate-400" />
        </span>
      </div>

      {/* Grid */}
      <div className="p-6">
        {planets.length === 0 ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
            Planet data unavailable.
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
