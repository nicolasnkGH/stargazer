"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTranslations, useLocale, useMessages } from "next-intl";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import FovModal from "./FovModal";
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

const PLANET_SIM_DATA: Record<
  string,
  { simImg: string; expectNote: string; minScope: string; approxRaDec: { ra: number; dec: number } }
> = {
  jupiter: {
    simImg: "/textures/planets_sim/jupiter_sim.jpg",
    expectNote: "Cloud belts & 4 Galilean Moons (Io, Europa, Ganymede, Callisto) clearly visible in 70mm+ scope.",
    minScope: "70mm Scope / Seestar",
    approxRaDec: { ra: 105.0, dec: 22.0 },
  },
  saturn: {
    simImg: "/textures/planets_sim/saturn_sim.jpg",
    expectNote: "Crisp golden rings, Cassini division gap & bright moon Titan visible in small 60mm+ scope.",
    minScope: "60mm Scope / Binoculars",
    approxRaDec: { ra: 350.0, dec: -5.0 },
  },
  mars: {
    simImg: "/textures/planets_sim/mars_sim.jpg",
    expectNote: "Reddish disc with white polar ice caps & Syrtis Major dark markings visible at 150x+ magnification.",
    minScope: "90mm+ Scope",
    approxRaDec: { ra: 100.0, dec: 24.0 },
  },
  venus: {
    simImg: "/textures/planets_sim/venus_sim.jpg",
    expectNote: "Dazzling yellowish crescent or gibbous phase visible clearly through small scope or 10x50 binos.",
    minScope: "Binoculars / Any Scope",
    approxRaDec: { ra: 180.0, dec: -2.0 },
  },
  mercury: {
    simImg: "/textures/planets_sim/mercury_sim.jpg",
    expectNote: "Small cratered crescent disc visible near horizon during evening/morning twilight window.",
    minScope: "Small Telescope",
    approxRaDec: { ra: 140.0, dec: 12.0 },
  },
  uranus: {
    simImg: "/textures/planets_sim/uranus_sim.jpg",
    expectNote: "Distinct pale cyan/turquoise disk visible through 4\"+ telescopes in dark sky.",
    minScope: "100mm (4\") Scope",
    approxRaDec: { ra: 52.0, dec: 18.0 },
  },
  neptune: {
    simImg: "/textures/planets_sim/neptune_sim.jpg",
    expectNote: "Tiny deep azure-blue star-like disc visible through 6\"+ astronomical telescope.",
    minScope: "150mm (6\") Scope",
    approxRaDec: { ra: 358.0, dec: -2.0 },
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
  const cfg = PLANET_CONFIGS[key] || {};

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
    if (cfg.tilt) {
      planetGroup.rotation.z = THREE.MathUtils.degToRad(cfg.tilt);
    }
    scene.add(planetGroup);

    const geo = new THREE.SphereGeometry(1, 48, 48);
    const texLoader = new THREE.TextureLoader();

    let mat: THREE.Material;
    if (key === "sun") {
      mat = new THREE.MeshBasicMaterial({
        map: cfg.texUrl ? texLoader.load(cfg.texUrl) : null,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        map: cfg.texUrl ? texLoader.load(cfg.texUrl) : null,
        bumpMap: new THREE.CanvasTexture(makePlanetBump(key)),
        bumpScale: cfg.bumpScale ?? 0.01,
        roughness: key === "venus" ? 0.9 : 0.7,
        metalness: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    planetGroup.add(mesh);

    let ringMesh: THREE.Mesh | null = null;
    if (cfg.hasRing) {
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
        map: cfg.ringTex ? texLoader.load(cfg.ringTex) : null,
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
    const speed = cfg.rotSpeed ?? 0.003;
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

  const bgStyle = cfg.radialGlow
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

function PlanetCard({
  planet,
  globalViewMode,
  onSimulate,
}: {
  planet: PlanetData;
  globalViewMode: "3d" | "sim";
  onSimulate: (planet: PlanetData) => void;
}) {
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const t = useTranslations();

  const getTxt = (key: string, fallback: string) => {
    const val = messages[key] || t(key as any);
    return val && val.trim() !== "" ? val : fallback;
  };

  const key = planet.name.toLowerCase();
  const simData = PLANET_SIM_DATA[key];
  const [localViewMode, setLocalViewMode] = useState<"3d" | "sim">(globalViewMode);
  const [eyepiece, setEyepiece] = useState<"25mm" | "10mm" | "6mm">("10mm");

  // Keep local mode in sync when user toggles global header view switch
  useEffect(() => {
    setLocalViewMode(globalViewMode);
  }, [globalViewMode]);

  // Eyepiece optical magnification scale factors (realistic field-of-view)
  const eyepieceScale =
    eyepiece === "25mm"
      ? "scale-[0.45]"
      : eyepiece === "6mm"
      ? "scale-[1.35]"
      : "scale-[0.85]";

  const eyepieceHudDefault =
    eyepiece === "25mm"
      ? locale === "pt"
        ? "25mm Plössl (48x Campo Largo)"
        : locale === "es"
        ? "25mm Plössl (48x Campo Ancho)"
        : "25mm Plössl (48x Wide)"
      : eyepiece === "6mm"
      ? locale === "pt"
        ? "6mm Planetária (200x Alta)"
        : locale === "es"
        ? "6mm Planetaria (200x Alta)"
        : "6mm Planetary (200x High)"
      : locale === "pt"
      ? "Ocular 10mm (120x Médio)"
      : locale === "es"
      ? "Ocular 10mm (120x Medio)"
      : "10mm Eyepiece (120x Mid)";

  const eyepieceHudKey =
    eyepiece === "25mm"
      ? "eyepiece_hud_25mm"
      : eyepiece === "6mm"
      ? "eyepiece_hud_6mm"
      : "eyepiece_hud_10mm";

  const SCOPE_EXPECT_DICT: Record<string, { pt: string; es: string; en: string }> = {
    jupiter: {
      pt: "Faixas de nuvens e 4 luas galileanas (Io, Europa, Ganímedes, Calisto) claramente visíveis em telescópios de 70mm+.",
      es: "Franjas nubladas y 4 lunas galileanas (Ío, Europa, Ganimedes, Calisto) claramente visibles en telescopios de 70mm+.",
      en: "Cloud belts & 4 Galilean Moons (Io, Europa, Ganymede, Callisto) clearly visible in 70mm+ scope.",
    },
    saturn: {
      pt: "Nítidos anéis dourados, divisão de Cassini e a brilhante lua Titã visíveis em pequenos telescópios de 60mm+.",
      es: "Nítidos anillos dorados, división de Cassini y la brillante luna Titán visibles en pequeños telescopios de 60mm+.",
      en: "Crisp golden rings, Cassini division gap & bright moon Titan visible in small 60mm+ scope.",
    },
    mars: {
      pt: "Disco avermelhado com calotas polares de gelo e marcas escuras de Syrtis Major visíveis a 150x+ de ampliação.",
      es: "Disco rojizo con casquetes polares de hielo y marcas oscuras de Syrtis Major visibles a 150x+ de aumento.",
      en: "Reddish disc with white polar ice caps & Syrtis Major dark markings visible at 150x+ magnification.",
    },
    venus: {
      pt: "Fase crescente ou gibosa amarelada deslumbrante claramente visível através de pequeno telescópio ou binóculos 10x50.",
      es: "Deslumbrante fase creciente o gibosa amarillenta claramente visible a través de un pequeño telescopio o binoculares 10x50.",
      en: "Dazzling yellowish crescent or gibbous phase visible clearly through small scope or 10x50 binos.",
    },
    mercury: {
      pt: "Pequeno disco crescente craterado visível perto do horizonte durante o crepúsculo vespertino/matutino.",
      es: "Pequeño disco creciente craterizado visible cerca del horizonte durante el crepúsculo vespertino/matutino.",
      en: "Small cratered crescent disc visible near horizon during evening/morning twilight window.",
    },
    uranus: {
      pt: "Disco pálido ciano/turquesa distinto visível através de telescópios de 4\"+ em céu escuro.",
      es: "Disco pálido cian/turquesa distinto visible a través de telescopios de 4\"+ en cielo oscuro.",
      en: "Distinct pale cyan/turquoise disk visible through 4\"+ telescopes in dark sky.",
    },
    neptune: {
      pt: "Pequeno disco azul-celeste estrelado visível através de telescópio astronômico de 6\"+.",
      es: "Pequeño disco azul celeste estelar visible a través de un telescopio astronómico de 6\"+.",
      en: "Tiny deep azure-blue star-like disc visible through 6\"+ astronomical telescope.",
    },
  };

  const expObj = SCOPE_EXPECT_DICT[key];
  const expDefault = expObj
    ? locale === "pt"
      ? expObj.pt
      : locale === "es"
      ? expObj.es
      : expObj.en
    : simData?.expectNote || "";

  const expectText = getTxt(`scope_expect_${key}`, expDefault);

  return (
    <div className="hud-card relative rounded-2xl border border-white/10 bg-slate-950/80 p-4 flex flex-col justify-between shadow-lg hover:border-sky-400/40 transition-all overflow-hidden group">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none z-10" />

      <div className="relative z-20">
        {/* Card Header: Emoji + Title + Direction + Mode Toggle */}
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

        {/* View Mode Toggle Switch (3D Globe vs Telescope Simulator) */}
        {simData && (
          <div className="flex items-center justify-between mb-2 bg-slate-900/90 border border-white/10 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setLocalViewMode("3d")}
              className={`flex-1 py-1 text-[0.65rem] font-bold rounded-md transition-all cursor-pointer ${
                localViewMode === "3d"
                  ? "bg-sky-500/30 text-sky-200 border border-sky-400/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTxt("planet_btn_3d_globe", locale === "pt" || locale === "es" ? "🌐 Globo 3D" : "🌐 3D Globe")}
            </button>
            <button
              type="button"
              onClick={() => setLocalViewMode("sim")}
              className={`flex-1 py-1 text-[0.65rem] font-bold rounded-md transition-all cursor-pointer ${
                localViewMode === "sim"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTxt("planet_btn_scope_view", locale === "pt" ? "🔭 Visão Telescópio" : locale === "es" ? "🔭 Vista Telescopio" : "🔭 Scope View")}
            </button>
          </div>
        )}

        {/* Viewport Display: 3D Globe OR Real Telescope Simulator Image */}
        {localViewMode === "sim" && simData ? (
          <div className="w-full h-44 rounded-xl overflow-hidden relative border border-purple-500/30 bg-[#020617] group/sim shadow-inner flex items-center justify-center">
            {/* Eyepiece Circular Field Frame Reticle Overlay */}
            <div className="absolute inset-0 border-[16px] border-[#020617] rounded-xl z-20 pointer-events-none" />
            <div className="absolute w-40 h-40 rounded-full border border-purple-500/40 z-20 pointer-events-none shadow-[0_0_15px_rgba(168,85,247,0.3)]" />

            {/* Real Telescope Eyepiece Photo with Eyepiece Zoom Scaling */}
            <img
              src={simData.simImg}
              alt={`Telescope simulator view of ${planet.name}`}
              className={`w-full h-full object-contain transition-transform duration-500 z-10 ${eyepieceScale}`}
            />

            {/* Eyepiece Reticle HUD Badge */}
            <div className="absolute top-2 left-2 bg-slate-950/90 border border-purple-400/40 px-2 py-0.5 rounded text-[0.6rem] font-mono text-purple-300 font-bold backdrop-blur-sm shadow-md z-30">
              🔭 {getTxt(eyepieceHudKey, eyepieceHudDefault)}
            </div>

            {/* Eyepiece Selector Controls (25mm / 10mm / 6mm) */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-slate-950/90 border border-white/15 p-1 rounded-lg backdrop-blur-sm z-30">
              <span className="text-[0.58rem] font-mono text-zinc-400 mr-1 select-none">{getTxt("eyepiece_selector_lbl", "Ocular:")}</span>
              <button
                type="button"
                onClick={() => setEyepiece("25mm")}
                className={`px-2 py-0.5 text-[0.6rem] font-mono font-bold rounded transition-all cursor-pointer ${
                  eyepiece === "25mm"
                    ? "bg-purple-500/40 text-purple-200 border border-purple-400/60 shadow-sm"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {getTxt("eyepiece_opt_25mm", "25mm (48x)")}
              </button>
              <button
                type="button"
                onClick={() => setEyepiece("10mm")}
                className={`px-2 py-0.5 text-[0.6rem] font-mono font-bold rounded transition-all cursor-pointer ${
                  eyepiece === "10mm"
                    ? "bg-purple-500/40 text-purple-200 border border-purple-400/60 shadow-sm"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {getTxt("eyepiece_opt_10mm", "10mm (120x)")}
              </button>
              <button
                type="button"
                onClick={() => setEyepiece("6mm")}
                className={`px-2 py-0.5 text-[0.6rem] font-mono font-bold rounded transition-all cursor-pointer ${
                  eyepiece === "6mm"
                    ? "bg-purple-500/40 text-purple-200 border border-purple-400/60 shadow-sm"
                    : "bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {getTxt("eyepiece_opt_6mm", "6mm (200x)")}
              </button>
            </div>
          </div>
        ) : (
          <Planet3DCanvas name={planet.name} />
        )}
      </div>

      <div className="relative z-20 mt-2">
        {/* Action Button: Simulate Sky View (Aladin FOV Modal) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-block rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[0.7rem] font-mono font-bold text-sky-300">
            {planet.constellation}
          </span>
          <button
            type="button"
            onClick={() => onSimulate(planet)}
            className="rounded-lg border border-purple-500/40 bg-purple-950/60 hover:bg-purple-500/30 px-2.5 py-1 text-[0.68rem] font-bold text-purple-300 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            {getTxt("planet_simulate_btn", locale === "pt" ? "Simular Visão 🔭" : locale === "es" ? "Simular Vista 🔭" : "Simulate View 🔭")}
          </button>
        </div>

        {/* Telescope Expectation Guide Note */}
        {simData && (
          <div className="mb-2 p-2 rounded-lg bg-purple-950/40 border border-purple-500/20 text-[0.68rem] text-purple-200/90 leading-tight">
            <span className="font-bold text-purple-300 block mb-0.5">
              {getTxt("scope_expectation_lbl", locale === "pt" ? "✨ Expectativa do Telescópio" : locale === "es" ? "✨ Expectativa del Telescopio" : "✨ Scope Expectation")} ({simData.minScope}):
            </span>
            {expectText}
          </div>
        )}

        <div className="mt-2 border-t border-white/10 pt-2 text-xs flex flex-col gap-1">
          <span className={`font-bold flex items-center gap-1.5 ${planet.visible_tonight ? "text-emerald-300" : "text-slate-400"}`}>
            <span className={`h-2 w-2 rounded-full ${planet.visible_tonight ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
            {planet.visible_tonight ? t("visible_tonight") : t("not_visible_tonight")}
          </span>
          <p className="text-[0.75rem] text-slate-300 leading-snug line-clamp-2 mt-0.5">
            {planet.how_to_find}
          </p>
          <span className="text-[0.7rem] text-slate-400 font-mono mt-0.5">
            {t("lbl_rise").replace(/:+$/, "")}: {(planet.rise_time || "N/A").replace(/^:\s*/, "")} · {t("lbl_set").replace(/:+$/, "")}: {(planet.set_time || "N/A").replace(/^:\s*/, "")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetGrid({ planets = [] }: { planets?: PlanetData[] }) {
  const locale = useLocale();
  const messages = (useMessages() as Record<string, string>) || {};
  const t = useTranslations();

  const getTxt = (key: string, fallback: string) => {
    const val = messages[key] || t(key as any);
    return val && val.trim() !== "" ? val : fallback;
  };

  const [globalViewMode, setGlobalViewMode] = useState<"3d" | "sim">("3d");
  const [fovPlanet, setFovPlanet] = useState<PlanetData | null>(null);

  const handleSimulate = (p: PlanetData) => {
    setFovPlanet(p);
  };

  const getRaDec = (p: PlanetData) => {
    if (p.ra_hours != null && p.dec_degrees != null) {
      return { raDeg: p.ra_hours * 15, decDeg: p.dec_degrees };
    }
    const key = p.name.toLowerCase();
    const fallback = PLANET_SIM_DATA[key]?.approxRaDec || { ra: 100, dec: 20 };
    return { raDeg: fallback.ra, decDeg: fallback.dec };
  };

  return (
    <section id="card-planets" className="card w-full mb-8 border border-sky-500/20 bg-slate-900/90 shadow-xl overflow-hidden">
      <div className="card-header border-b border-sky-500/20 px-6 py-4 bg-slate-900/80 justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Icon name="orbit" className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            {t("planets_tonight")}
          </h2>
        </div>

        {/* Global View Mode Toggle: 3D Globes vs Telescope Simulator Views */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-white/15 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setGlobalViewMode("3d")}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                globalViewMode === "3d"
                  ? "bg-sky-500/30 text-sky-300 border border-sky-400/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTxt("planets_view_3d_globes", locale === "pt" || locale === "es" ? "Globos 3D" : "3D Globes")}
            </button>
            <button
              type="button"
              onClick={() => setGlobalViewMode("sim")}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                globalViewMode === "sim"
                  ? "bg-purple-500/30 text-purple-300 border border-purple-400/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTxt("planets_view_scope_views", locale === "pt" ? "Vistas de Telescópio" : locale === "es" ? "Vistas de Telescopio" : "Scope Views")}
            </button>
          </div>

          <SourceTooltip
            source="NASA JPL & Skyfield"
            description={t("source_planets_desc")}
            attribution={t("source_planets_attr")}
          />
        </div>
      </div>

      <div className="p-6">
        {planets.length === 0 ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
            {t("planet_data_unavailable")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {planets.map((p) => (
              <PlanetCard
                key={p.name}
                planet={p}
                globalViewMode={globalViewMode}
                onSimulate={handleSimulate}
              />
            ))}
          </div>
        )}
      </div>

      {fovPlanet && (
        <FovModal
          open
          onClose={() => setFovPlanet(null)}
          raDeg={getRaDec(fovPlanet).raDeg}
          decDeg={getRaDec(fovPlanet).decDeg}
          targetName={fovPlanet.name}
        />
      )}
    </section>
  );
}

