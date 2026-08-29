"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "./Icon";
import type { PlanetData } from "@/types";
import { PLANET_TEXTURES } from "@/lib/constants";
import { makePlanetBump, makeProceduralTexture, makeSaturnRingGeo } from "@/lib/three/planet-surface";

/* ── Per-planet surface config — ported from legacy web/planets3d.js CFG ─── */

interface SurfaceCfg {
  tilt: number;        // axial tilt (degrees)
  bumpScale: number;   // procedural bump strength
  tex?: string;        // texture path (falls back to procedural if missing)
  hasRing?: boolean;
  ringTex?: string;
}

const SURFACE_CFG: Record<string, SurfaceCfg> = {
  mercury: { tilt: 0.03, bumpScale: 0.015 },
  venus:   { tilt: 177.4, bumpScale: 0.006 },
  earth:   { tilt: 23.4, bumpScale: 0.008 },
  mars:    { tilt: 25.2, bumpScale: 0.012 },
  jupiter: { tilt: 3.1, bumpScale: 0.003 },
  saturn:  { tilt: 26.7, bumpScale: 0.003, hasRing: true, ringTex: "/assets/saturn_ring_color.jpg" },
  uranus:  { tilt: 97.8, bumpScale: 0.002 },
  neptune: { tilt: 28.3, bumpScale: 0.003 },
};

// Gentle auto-rotation while idle — matches the moon's idle spin rate (legacy).
const ROT_SPEED = 0.036;
const FPS_INTERVAL = 1000 / 25; // 25fps throttled loop (legacy)

/* ── Interactive 3D planet widget (drag to rotate · scroll to zoom) ──────── */

function Planet3DWidget({ name }: { name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const cfg = SURFACE_CFG[name.toLowerCase()] ?? SURFACE_CFG.mercury;
    const texUrl = PLANET_TEXTURES[name.toLowerCase()];

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let mesh: THREE.Mesh | null = null;
    let rafId = 0;
    let lastT = 0;
    let disposed = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let idle = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let io: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const onVisibilityChange = () => { pageVisible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibilityChange);

    function build(texture: THREE.Texture) {
      if (disposed || !container) return;
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 200;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setClearColor(0x050510, 1);
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050510, 0.06);

      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 3.5;

      const ambient = new THREE.AmbientLight(0x303050, 0.35);
      const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
      keyLight.position.set(-2, 1, 2);
      const fillLight = new THREE.DirectionalLight(0x8090b0, 0.25);
      fillLight.position.set(2, -0.5, 1);
      const rimLight = new THREE.DirectionalLight(0x4040a0, 0.15);
      rimLight.position.set(5, 0, -5);
      scene.add(ambient, keyLight, fillLight, rimLight);

      // Drag-to-rotate + scroll-to-zoom (legacy interaction model)
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 1.5;
      controls.maxDistance = 6;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.5;

      // Idle spin: pause while the user is dragging, resume 2s after release
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
      } else if (cfg.hasRing) {
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xc8b890, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
        const ring = new THREE.Mesh(makeSaturnRingGeo(1.26, 2.22), ringMat);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
      }

      // Pause rendering when the card scrolls off screen (legacy behavior)
      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
      io.observe(container);

      resizeObserver = new ResizeObserver((entries) => {
        for (const e of entries) {
          const { width: w, height: h } = e.contentRect;
          if (!w || !h || !camera || !renderer) continue;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);

      const loop = (t: number) => {
        rafId = requestAnimationFrame(loop);
        if (disposed || !visible || !pageVisible) return;
        if (t - lastT < FPS_INTERVAL) return;
        lastT = t;
        controls?.update();
        if (idle && mesh) {
          mesh.rotation.y += ROT_SPEED * (FPS_INTERVAL / 1000);
        }
        if (scene && camera && renderer) renderer.render(scene, camera);
      };
      rafId = requestAnimationFrame(loop);
    }

    // Lazy setup: only initialize the WebGL scene once the card scrolls into view
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
                  console.warn(`PlanetGrid: failed to load ${texUrl}, using procedural`);
                  build(makeProceduralTexture(name));
                }
              );
            } else {
              build(makeProceduralTexture(name));
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
      if (idleTimer) clearTimeout(idleTimer);
      loadObserver.disconnect();
      io?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls?.dispose();
      if (renderer) {
        try { renderer.dispose(); } catch { /* already gone */ }
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

  return (
    <div ref={containerRef} className="h-full w-full" />
  );
}

function PlanetCard({ planet }: { planet: PlanetData }) {
  const altStr = `${planet.altitude_deg}° ${planet.direction}`;
  const magStr = `Mag ${planet.magnitude_approx}`;
  const distStr = `${planet.distance_mkm}M km (${planet.light_time_minutes} min light)`;

  return (
    <div className={`flex flex-col card transition-colors hover:border-sky-400/18 ${planet.visible_tonight ? "" : "opacity-45"}`}>
      <div
        className="relative h-[200px] w-full flex-shrink-0 overflow-hidden bg-transparent"
        style={{
          background: "radial-gradient(circle at center, rgba(30,40,60,0.3) 0%, transparent 70%)",
        }}
      >
        <Planet3DWidget name={planet.name} />
      </div>

      {/* Info column */}
      <div className="flex flex-col gap-1.5 p-4">
        {/* Name row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <span className="text-xl">{planet.emoji}</span>
            {planet.name}
          </span>
          {planet.naked_eye && (
            <span className="rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-purple-400">
              Naked Eye
            </span>
          )}
        </div>

        {/* Constellation pill */}
        <span className="inline-block w-fit rounded border border-zinc-600/30 bg-zinc-700/15 px-2 py-0.5 text-[0.7rem] text-zinc-300">
          {planet.constellation}
        </span>

        {/* Meta rows */}
        <div className="flex flex-col gap-1 font-mono text-[0.75rem]">
          <span className="block w-full truncate text-sky-400 font-medium" title={altStr}>
            {altStr}
          </span>
          <span className="block w-full truncate text-amber-300" title={magStr}>
            {magStr}
          </span>
          <span className="block w-full truncate text-zinc-400" title={distStr}>
            {distStr}
          </span>
        </div>

        {/* Bottom info */}
        <div className="mt-2 border-t border-purple-500/18 pt-2 text-[0.78rem] text-zinc-400 flex flex-col gap-0.5">
          <span className={`font-semibold text-[0.78rem] ${planet.visible_tonight ? "text-purple-300" : "text-zinc-500"}`}>
            <span
              className={`mr-1.5 inline-block h-[7px] w-[7px] rounded-full ${planet.visible_tonight ? "bg-green-500" : "bg-zinc-600"}`}
            />
            {planet.visible_tonight ? "Visible tonight" : "Not visible tonight"}
          </span>
          <span className="truncate">{planet.how_to_find}</span>
          <span className="text-zinc-500">
            Rise: {planet.rise_time} · Set: {planet.set_time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetGrid({ planets = [] }: { planets?: PlanetData[] }) {
  return (
    <section className="card card-planets">
      {/* Card header */}
      <div className="card-header">
        <Icon name="orbit" className="h-5 w-5" />
        <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">
          Planets Tonight
        </h2>
        <span
          className="ml-1.5 flex cursor-pointer items-center"
          title="Calculated locally via Skyfield Ephemeris"
        >
          <Icon name="info" className="h-[14px] w-[14px] stroke-zinc-500/60" />
        </span>
      </div>

      {/* Card body — responsive grid */}
      <div className="p-5">
        {planets.length === 0 ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            Planet data unavailable.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {planets.map((p) => (
              <PlanetCard key={p.name} planet={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
