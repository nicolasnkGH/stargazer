"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { normalizePlanetKey } from "@/lib/constants/planet-grid";

interface EyepieceSimulationProps {
  targetName: string;
  magnification: number;
  seeingSim: boolean;
  eyepieceFov: number;
  targetType?: string;
}

const PLANET_CONFIGS: Record<string, { texture: string; radius: number; tilt: number; rotPeriodHours: number }> = {
  sun:     { texture: "/textures/2k_sun.webp",           radius: 1.0,  tilt: 7.25,   rotPeriodHours: 600    },
  mercury: { texture: "/textures/mercury.webp",          radius: 0.38, tilt: 0.03,   rotPeriodHours: 1407   },
  venus:   { texture: "/textures/venus.webp",            radius: 0.95, tilt: 177.3,  rotPeriodHours: -5832  },
  earth:   { texture: "/textures/2k_earth_daymap.webp",  radius: 1.0,  tilt: 23.44,  rotPeriodHours: 23.93  },
  moon:    { texture: "/textures/moon_texture.webp",     radius: 0.8,  tilt: 6.68,   rotPeriodHours: 655    },
  mars:    { texture: "/textures/mars.webp",             radius: 0.53, tilt: 25.19,  rotPeriodHours: 24.62  },
  jupiter: { texture: "/textures/jupiter.webp",          radius: 1.8,  tilt: 3.13,   rotPeriodHours: 9.92   },
  saturn:  { texture: "/textures/saturn.webp",           radius: 1.5,  tilt: 26.73,  rotPeriodHours: 10.55  },
  uranus:  { texture: "/textures/uranus.webp",           radius: 1.1,  tilt: 97.77,  rotPeriodHours: -17.24 },
  neptune: { texture: "/textures/neptune.webp",          radius: 1.05, tilt: 28.32,  rotPeriodHours: 16.11  },
};

/** Ephemeris calculation for Galilean Moons (days per orbit, relative distance in radii) */
const JUPITER_MOONS = [
  { name: "Io",       periodDays: 1.769,  distFactor: 2.8,  size: 0.12, color: 0xfef08a },
  { name: "Europa",   periodDays: 3.551,  distFactor: 4.4,  size: 0.1,  color: 0xffffff },
  { name: "Ganymede", periodDays: 7.155,  distFactor: 7.0,  size: 0.15, color: 0xe0f2fe },
  { name: "Callisto", periodDays: 16.689, distFactor: 12.3, size: 0.13, color: 0xc084fc },
];

/** Saturn's Titan Moon Ephemeris */
const SATURN_MOONS = [
  { name: "Titan", periodDays: 15.945, distFactor: 9.5, size: 0.14, color: 0xfde047 },
  { name: "Rhea",  periodDays: 4.518,  distFactor: 5.2, size: 0.08, color: 0xe2e8f0 },
];

/** Target frame interval — 20 fps cap to prevent GPU/CPU overload when many cards render simultaneously. */
const TARGET_FPS = 20;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/** Helper to generate a soft Gaussian circular star sprite texture */
function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.2, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.25)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Helper to generate an authentic diffuse galaxy profile (exponential halo, bulge, dust lane) */
function createGalaxyTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 256;
  const lowerName = name.toLowerCase();

  ctx.save();
  ctx.translate(cx, cy);

  const angle = lowerName.includes("m51") ? 0 : -32;
  ctx.rotate(THREE.MathUtils.degToRad(angle));

  const isFaceOn = lowerName.includes("m51") || lowerName.includes("m101") || lowerName.includes("whirlpool");
  const scaleX = isFaceOn ? 1.25 : 2.5;
  const scaleY = isFaceOn ? 1.25 : 0.95;
  ctx.scale(scaleX, scaleY);

  // 1. Outer diffuse galactic halo (exponential luminous falloff)
  const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 115);
  haloGrad.addColorStop(0, "rgba(205, 225, 245, 0.22)");
  haloGrad.addColorStop(0.35, "rgba(180, 205, 230, 0.12)");
  haloGrad.addColorStop(0.7, "rgba(140, 175, 210, 0.04)");
  haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 115, 0, Math.PI * 2);
  ctx.fill();

  // 2. Inner galactic disk
  const diskGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 68);
  diskGrad.addColorStop(0, "rgba(255, 248, 230, 0.58)");
  diskGrad.addColorStop(0.35, "rgba(238, 228, 205, 0.32)");
  diskGrad.addColorStop(0.75, "rgba(195, 210, 230, 0.1)");
  diskGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, Math.PI * 2);
  ctx.fill();

  // 3. Central galactic bulge
  const bulgeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
  bulgeGrad.addColorStop(0, "rgba(255, 252, 242, 0.9)");
  bulgeGrad.addColorStop(0.35, "rgba(255, 240, 215, 0.55)");
  bulgeGrad.addColorStop(0.75, "rgba(235, 215, 185, 0.2)");
  bulgeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bulgeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  // 4. Stellar nucleus (unresolved core visible in amateur eyepieces)
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
  coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  coreGrad.addColorStop(0.4, "rgba(255, 250, 235, 0.7)");
  coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 5. Subtle absorption dust lane cutting through the bulge
  if (!isFaceOn) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(THREE.MathUtils.degToRad(angle));

    const dustGrad = ctx.createLinearGradient(0, -18, 0, -4);
    dustGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    dustGrad.addColorStop(0.5, "rgba(1, 2, 6, 0.7)");
    dustGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.ellipse(0, -11, 105, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Helper to generate realistic diffuse or planetary nebula clouds */
function createNebulaTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 256;
  const isRing = name.toLowerCase().includes("m57") || name.toLowerCase().includes("ring");

  if (isRing) {
    // M57 Ring Nebula: Ethereal oval donut of ionized gas [O III] / H-alpha
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.25, 0.95);
    const ringGrad = ctx.createRadialGradient(0, 0, 24, 0, 0, 85);
    ringGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    ringGrad.addColorStop(0.2, "rgba(90, 215, 205, 0.12)");
    ringGrad.addColorStop(0.65, "rgba(100, 235, 220, 0.65)");
    ringGrad.addColorStop(0.85, "rgba(175, 130, 205, 0.4)");
    ringGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Diffuse / Emission Nebula (like M42 Orion): multi-lobed luminous gas veils
    const wing1 = ctx.createRadialGradient(cx - 28, cy + 12, 0, cx - 28, cy + 12, 135);
    wing1.addColorStop(0, "rgba(110, 235, 225, 0.52)");
    wing1.addColorStop(0.35, "rgba(90, 195, 210, 0.28)");
    wing1.addColorStop(0.75, "rgba(145, 115, 185, 0.1)");
    wing1.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = wing1;
    ctx.beginPath();
    ctx.arc(cx - 28, cy + 12, 135, 0, Math.PI * 2);
    ctx.fill();

    const wing2 = ctx.createRadialGradient(cx + 38, cy - 18, 0, cx + 38, cy - 18, 115);
    wing2.addColorStop(0, "rgba(130, 242, 220, 0.48)");
    wing2.addColorStop(0.4, "rgba(105, 185, 215, 0.22)");
    wing2.addColorStop(0.75, "rgba(170, 125, 195, 0.08)");
    wing2.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = wing2;
    ctx.beginPath();
    ctx.arc(cx + 38, cy - 18, 115, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46);
    core.addColorStop(0, "rgba(225, 255, 252, 0.8)");
    core.addColorStop(0.45, "rgba(145, 240, 230, 0.38)");
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    const darkGrad = ctx.createRadialGradient(cx - 16, cy - 38, 0, cx - 16, cy - 38, 52);
    darkGrad.addColorStop(0, "rgba(1, 2, 6, 0.88)");
    darkGrad.addColorStop(0.65, "rgba(1, 2, 6, 0.5)");
    darkGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = darkGrad;
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 38, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Helper to generate an authentic optical Airy disk pattern for stars */
function createAiryDiskTexture(colorRgb: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 64;
  const cy = 64;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 54);
  halo.addColorStop(0, colorRgb.replace("ALPHA", "0.28"));
  halo.addColorStop(0.45, colorRgb.replace("ALPHA", "0.09"));
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colorRgb.replace("ALPHA", "0.24");
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 21, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
  core.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  core.addColorStop(0.35, colorRgb.replace("ALPHA", "0.95"));
  core.addColorStop(0.75, colorRgb.replace("ALPHA", "0.45"));
  core.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const EyepieceSimulation: React.FC<EyepieceSimulationProps> = ({
  targetName,
  magnification,
  seeingSim,
  eyepieceFov,
  targetType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const key = normalizePlanetKey(targetName);
  const isPlanetTarget = Boolean(PLANET_CONFIGS[key] && (PLANET_CONFIGS[key] !== PLANET_CONFIGS["jupiter"] || key === "jupiter"));
  const cfg = isPlanetTarget ? PLANET_CONFIGS[key] : null;
  const [hasError, setHasError] = useState(false);
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

    let animationId: number;
    let isVisible = false;
    let isPageVisible = true;
    let lastFrameTime = 0;
    let disposed = false;

    // Disposables registry to prevent WebGL memory leaks
    const disposables: { dispose: () => void }[] = [];

    try {
      const width = container.clientWidth || 240;
      const height = container.clientHeight || 240;

      // Three.js Scene Setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x010206);

      // Camera setup — FOV scales inversely with magnification
      const baseFov = Math.max(2, Math.min(30, (80 / (magnification / 50)) * (eyepieceFov / 68)));
      const camera = new THREE.PerspectiveCamera(baseFov, width / height, 0.1, 500);
      camera.position.set(0, 0, 45);

      // Renderer — forced 1× pixel ratio and no antialias for card thumbnails
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      renderer.domElement.setAttribute("data-transparent", "true");

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

      // Reusable soft circular star sprite texture
      const starTexture = createStarTexture();
      disposables.push(starTexture);

      // Background Starfield Points
      const starCount = 220;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPos[i]     = (Math.random() - 0.5) * 140;
        starPos[i + 1] = (Math.random() - 0.5) * 140;
        starPos[i + 2] = -40 - Math.random() * 60;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        map: starTexture,
        size: 0.7,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const starPoints = new THREE.Points(starGeo, starMat);
      scene.add(starPoints);
      disposables.push(starGeo, starMat);

      // Lights
      const ambientLight = new THREE.AmbientLight(0x333344, 0.6);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
      sunLight.position.set(-20, 10, 35);
      scene.add(sunLight);

      let planetMesh: THREE.Mesh | null = null;
      let nonPlanetGroup: THREE.Group | null = null;
      const moonMeshes: { mesh: THREE.Mesh; periodDays: number; dist: number }[] = [];

      if (isPlanetTarget && cfg) {
        // Target Planet Mesh
        const planetGeo = new THREE.SphereGeometry(cfg.radius, 32, 32);
        const texLoader = new THREE.TextureLoader();
        const texture = texLoader.load(cfg.texture, undefined, undefined, () => setHasError(true));
        texture.colorSpace = THREE.SRGBColorSpace;

        const planetMat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.8,
          metalness: 0.1,
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        planetMesh.rotation.z = THREE.MathUtils.degToRad(cfg.tilt);
        scene.add(planetMesh);
        disposables.push(planetGeo, planetMat);

        // Saturn Rings with transparent division and outer fade
        if (key === "saturn") {
          const ringGeo = new THREE.RingGeometry(cfg.radius * 1.35, cfg.radius * 2.3, 48);
          const pos = ringGeo.attributes.position;
          const uv = ringGeo.attributes.uv;
          for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vy = pos.getY(i);
            const distance = Math.sqrt(vx * vx + vy * vy);
            const normalized = (distance - cfg.radius * 1.35) / (cfg.radius * 2.3 - cfg.radius * 1.35);
            uv.setXY(i, normalized, 0.5);
          }

          const ringTex = texLoader.load("/textures/saturn_ring_color.webp");
          ringTex.colorSpace = THREE.SRGBColorSpace;
          const ringMat = new THREE.MeshStandardMaterial({
            map: ringTex,
            alphaMap: ringTex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92,
            roughness: 0.6,
          });

          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 2;
          planetMesh.add(ringMesh);
          disposables.push(ringGeo, ringMat);
        }

        // Ephemeris Moons
        const moonData = key === "jupiter" ? JUPITER_MOONS : key === "saturn" ? SATURN_MOONS : [];
        const nowDays = (Date.now() - 946728000000) / 86400000;

        moonData.forEach((m, idx) => {
          const mGeo  = new THREE.SphereGeometry(m.size, 8, 8);
          const mMat  = new THREE.MeshBasicMaterial({ color: m.color });
          const mMesh = new THREE.Mesh(mGeo, mMat);

          const angle = (nowDays / m.periodDays) * Math.PI * 2 + idx * 1.2;
          const dist  = cfg.radius * m.distFactor;
          mMesh.position.x = Math.cos(angle) * dist;
          mMesh.position.z = Math.sin(angle) * dist;
          mMesh.position.y = Math.sin(angle) * dist * 0.08;

          scene.add(mMesh);
          moonMeshes.push({ mesh: mMesh, periodDays: m.periodDays, dist });
          disposables.push(mGeo, mMat);
        });
      } else {
        // NON-PLANET OPTICAL TARGETS (Star, Double Star, Galaxy, Nebula, Cluster)
        nonPlanetGroup = new THREE.Group();
        scene.add(nonPlanetGroup);

        const tType = (targetType || "").toLowerCase();
        const tName = targetName.toLowerCase();

        const isDoubleStar = tType.includes("double") || tName.includes("albireo") || tName.includes("mizar") || tName.includes("gamma ari") || tName.includes("61 cyg");
        const isGalaxy     = tType.includes("galaxy") || tName.includes("m31") || tName.includes("m51") || tName.includes("m82") || tName.includes("m33") || tName.includes("m81") || tName.includes("m101") || tName.includes("andromeda") || tName.includes("whirlpool") || tName.includes("sombrero") || tName.includes("bode");
        const isNebula     = tType.includes("nebula") || tName.includes("m42") || tName.includes("m57") || tName.includes("m27") || tName.includes("m8") || tName.includes("orion") || tName.includes("ring nebula") || tName.includes("dumbbell") || tName.includes("ngc");
        const isCluster    = tType.includes("cluster") || tType.includes("globular") || tName.includes("m13") || tName.includes("m45") || tName.includes("m3") || tName.includes("m5") || tName.includes("m22") || tName.includes("pleiades") || tName.includes("hercules");

        if (isDoubleStar) {
          // Double Star Pair (Airy Disk Diffraction Profiles: Primary Gold, Companion Blue)
          const pTex = createAiryDiskTexture("rgba(255, 183, 77, ALPHA)");
          const pMat = new THREE.SpriteMaterial({ map: pTex, blending: THREE.AdditiveBlending, transparent: true });
          const pSprite = new THREE.Sprite(pMat);
          pSprite.scale.set(6.5, 6.5, 1);
          pSprite.position.set(-1.8, 0.5, 0);
          nonPlanetGroup.add(pSprite);

          const sTex = createAiryDiskTexture("rgba(96, 165, 250, ALPHA)");
          const sMat = new THREE.SpriteMaterial({ map: sTex, blending: THREE.AdditiveBlending, transparent: true });
          const sSprite = new THREE.Sprite(sMat);
          sSprite.scale.set(4.5, 4.5, 1);
          sSprite.position.set(2.4, -0.7, 0);
          nonPlanetGroup.add(sSprite);

          disposables.push(pTex, pMat, sTex, sMat);
        } else if (isGalaxy) {
          // Authentic Diffuse Galactic Halo & Luminous Core
          const galTex = createGalaxyTexture(targetName);
          const galMat = new THREE.MeshBasicMaterial({
            map: galTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const galGeo = new THREE.PlaneGeometry(34, 34);
          const galMesh = new THREE.Mesh(galGeo, galMat);
          nonPlanetGroup.add(galMesh);
          disposables.push(galTex, galMat, galGeo);

          // Resolved Stellar Associations / H II Spiral Arm Knots
          const spiralKnotCount = 280;
          const knotGeo = new THREE.BufferGeometry();
          const knotPos = new Float32Array(spiralKnotCount * 3);
          const knotCols = new Float32Array(spiralKnotCount * 3);
          const rad32 = THREE.MathUtils.degToRad(-32);
          for (let i = 0; i < spiralKnotCount; i++) {
            const theta = (i / spiralKnotCount) * Math.PI * 7.5;
            const r = 2.0 + Math.pow(i / spiralKnotCount, 1.4) * 11.5;
            const armOffset = (i % 2 === 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.4;
            const x = Math.cos(theta + armOffset) * r * 2.1 + (Math.random() - 0.5) * 0.8;
            const y = Math.sin(theta + armOffset) * r * 0.85 + (Math.random() - 0.5) * 0.5;

            knotPos[i * 3]     = x * Math.cos(rad32) - y * Math.sin(rad32);
            knotPos[i * 3 + 1] = x * Math.sin(rad32) + y * Math.cos(rad32);
            knotPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

            knotCols[i * 3]     = 0.85 + Math.random() * 0.15;
            knotCols[i * 3 + 1] = 0.9 + Math.random() * 0.1;
            knotCols[i * 3 + 2] = 1.0;
          }
          knotGeo.setAttribute("position", new THREE.BufferAttribute(knotPos, 3));
          knotGeo.setAttribute("color", new THREE.BufferAttribute(knotCols, 3));
          const knotMat = new THREE.PointsMaterial({
            size: 0.55,
            map: starTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const knotPoints = new THREE.Points(knotGeo, knotMat);
          nonPlanetGroup.add(knotPoints);
          disposables.push(knotGeo, knotMat);

          // Foreground Field Stars (Milky Way stars in FOV)
          const fieldStarCount = 28;
          const fieldGeo = new THREE.BufferGeometry();
          const fieldPos = new Float32Array(fieldStarCount * 3);
          for (let i = 0; i < fieldStarCount * 3; i += 3) {
            fieldPos[i]     = (Math.random() - 0.5) * 26;
            fieldPos[i + 1] = (Math.random() - 0.5) * 26;
            fieldPos[i + 2] = 1.0 + Math.random() * 2.0;
          }
          fieldGeo.setAttribute("position", new THREE.BufferAttribute(fieldPos, 3));
          const fieldMat = new THREE.PointsMaterial({
            size: 0.85,
            map: starTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
          });
          const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
          nonPlanetGroup.add(fieldPoints);
          disposables.push(fieldGeo, fieldMat);
        } else if (isNebula) {
          // Ethereal Diffuse Gas Cloud
          const nebTex = createNebulaTexture(targetName);
          const nebMat = new THREE.MeshBasicMaterial({
            map: nebTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const nebGeo = new THREE.PlaneGeometry(32, 32);
          const nebMesh = new THREE.Mesh(nebGeo, nebMat);
          nonPlanetGroup.add(nebMesh);
          disposables.push(nebTex, nebMat, nebGeo);

          // Embedded Stars (e.g. Trapezium in Orion or Central Star in Ring Nebula)
          const isRing = targetName.toLowerCase().includes("m57") || targetName.toLowerCase().includes("ring");
          const trapCount = isRing ? 1 : 4;
          const trapGeo = new THREE.BufferGeometry();
          const trapPos = new Float32Array(trapCount * 3);
          if (isRing) {
            trapPos[0] = 0; trapPos[1] = 0; trapPos[2] = 0.5;
          } else {
            trapPos[0] = -0.4; trapPos[1] =  0.3; trapPos[2] = 0.5;
            trapPos[3] =  0.4; trapPos[4] =  0.4; trapPos[5] = 0.5;
            trapPos[6] =  0.2; trapPos[7] = -0.3; trapPos[8] = 0.5;
            trapPos[9] = -0.3; trapPos[10] = -0.4; trapPos[11] = 0.5;
          }
          trapGeo.setAttribute("position", new THREE.BufferAttribute(trapPos, 3));
          const trapMat = new THREE.PointsMaterial({
            size: 1.2,
            map: starTexture,
            color: 0xecfeff,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
          });
          const trapPoints = new THREE.Points(trapGeo, trapMat);
          nonPlanetGroup.add(trapPoints);
          disposables.push(trapGeo, trapMat);
        } else if (isCluster) {
          // Unresolved Central Glow
          const glowCanvas = document.createElement("canvas");
          glowCanvas.width = 128;
          glowCanvas.height = 128;
          const glowCtx = glowCanvas.getContext("2d");
          if (glowCtx) {
            const gGrad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 58);
            gGrad.addColorStop(0, "rgba(255, 245, 220, 0.45)");
            gGrad.addColorStop(0.3, "rgba(240, 230, 200, 0.2)");
            gGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            glowCtx.fillStyle = gGrad;
            glowCtx.fillRect(0, 0, 128, 128);
          }
          const glowTex = new THREE.CanvasTexture(glowCanvas);
          const glowMat = new THREE.MeshBasicMaterial({
            map: glowTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const glowGeo = new THREE.PlaneGeometry(18, 18);
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          nonPlanetGroup.add(glowMesh);
          disposables.push(glowTex, glowMat, glowGeo);

          // 650 Resolved Pinpoint Stars with King/Plummer radial density
          const cCount = 650;
          const cGeo = new THREE.BufferGeometry();
          const cPos = new Float32Array(cCount * 3);
          const cCols = new Float32Array(cCount * 3);
          for (let i = 0; i < cCount; i++) {
            const u = Math.random();
            const rad = Math.pow(u, 2.2) * 11.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI;
            cPos[i * 3]     = rad * Math.cos(theta) * Math.cos(phi);
            cPos[i * 3 + 1] = rad * Math.sin(phi);
            cPos[i * 3 + 2] = rad * Math.sin(theta) * Math.cos(phi) * 0.5;

            if (i % 5 === 0) {
              cCols[i * 3] = 1.0; cCols[i * 3 + 1] = 0.85; cCols[i * 3 + 2] = 0.65;
            } else if (i % 7 === 0) {
              cCols[i * 3] = 0.75; cCols[i * 3 + 1] = 0.9; cCols[i * 3 + 2] = 1.0;
            } else {
              cCols[i * 3] = 0.98; cCols[i * 3 + 1] = 0.98; cCols[i * 3 + 2] = 1.0;
            }
          }
          cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
          cGeo.setAttribute("color", new THREE.BufferAttribute(cCols, 3));
          const cMat = new THREE.PointsMaterial({
            size: 0.85,
            map: starTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const clusterPoints = new THREE.Points(cGeo, cMat);
          nonPlanetGroup.add(clusterPoints);
          disposables.push(cGeo, cMat);
        } else {
          // Single Star with Airy disk diffraction glow
          let starColorRgb = "rgba(255, 224, 130, ALPHA)";
          if (tName.includes("betel") || tName.includes("anta") || tName.includes("red") || tName.includes("aldebaran")) {
            starColorRgb = "rgba(248, 113, 113, ALPHA)";
          } else if (tName.includes("rigel") || tName.includes("vega") || tName.includes("sirius") || tName.includes("spica")) {
            starColorRgb = "rgba(147, 197, 253, ALPHA)";
          }

          const starTex = createAiryDiskTexture(starColorRgb);
          const starMat = new THREE.SpriteMaterial({ map: starTex, blending: THREE.AdditiveBlending, transparent: true });
          const starSprite = new THREE.Sprite(starMat);
          starSprite.scale.set(7.5, 7.5, 1);
          nonPlanetGroup.add(starSprite);
          disposables.push(starTex, starMat);
        }
      }

      // Animation Loop — frame-rate capped at TARGET_FPS
      const startTime = performance.now();
      const nowDays = (Date.now() - 946728000000) / 86400000;

      const animate = (now: number) => {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);

        if (!isVisible || !isPageVisible) return;

        if (now - lastFrameTime < FRAME_INTERVAL_MS) return;
        lastFrameTime = now;

        const elapsed = (now - startTime) / 1000;
        const delta   = Math.min(0.1, FRAME_INTERVAL_MS / 1000);

        if (planetMesh && cfg) {
          const rotSpeed = (2 * Math.PI) / (Math.abs(cfg.rotPeriodHours) * 3600);
          planetMesh.rotation.y += rotSpeed * delta * 5000;
        }

        moonMeshes.forEach(({ mesh, periodDays, dist }, idx) => {
          const liveAngle = ((nowDays + elapsed / 86400) / periodDays) * Math.PI * 2 + idx * 1.2;
          mesh.position.x = Math.cos(liveAngle) * dist;
          mesh.position.z = Math.sin(liveAngle) * dist;
          mesh.position.y = Math.sin(liveAngle) * dist * 0.08;
        });

        if (seeingSim) {
          camera.position.x = Math.sin(elapsed * 6.5) * 0.02 + Math.cos(elapsed * 11.2) * 0.01;
          camera.position.y = Math.cos(elapsed * 5.1) * 0.02 + Math.sin(elapsed * 9.7) * 0.01;
        } else {
          camera.position.x = 0;
          camera.position.y = 0;
        }

        renderer.render(scene, camera);
      };

      animationId = requestAnimationFrame(animate);

      // IntersectionObserver — pause animation when card scrolls off-screen
      const observer = new IntersectionObserver(
        (entries) => { isVisible = entries[0]?.isIntersecting ?? false; },
        { threshold: 0.1 }
      );
      observer.observe(container);

      // Page Visibility API — pause when tab is backgrounded
      const onVisibilityChange = () => { isPageVisible = document.visibilityState === "visible"; };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        try {
          renderer.dispose();
          if (container && renderer.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        } catch {
          // ignore cleanup error
        }
        setHasError(true);
      };
      renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

      return () => {
        disposed = true;
        cancelAnimationFrame(animationId);
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
        renderer.dispose();
        disposables.forEach((item) => {
          try {
            item.dispose();
          } catch {
            // ignore item disposal error
          }
        });
      };
    } catch (err) {
      console.warn("Eyepiece WebGL init failed, fallback to 2D optical disc:", err);
      setTimeout(() => setHasError(true), 0);
    }
  }, [targetName, targetType, magnification, seeingSim, eyepieceFov, cfg, isPlanetTarget, key, isInView]);

  if (hasError) {
    const scale = magnification / 120;
    const bgTexture = cfg?.texture;
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#010206] rounded-full overflow-hidden">
        <div
          className="relative rounded-full bg-cover bg-center border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-300"
          style={{
            width: `${Math.max(12, Math.min(80, 24 * scale))}px`,
            height: `${Math.max(12, Math.min(80, 24 * scale))}px`,
            ...(bgTexture ? { backgroundImage: `url(${bgTexture})` } : { backgroundColor: "#90caf9" }),
          }}
        >
          {key === "saturn" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-full border-[1.5px] border-amber-200/90 bg-amber-500/25 transform -rotate-15 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{
                  width:  `${Math.max(36, Math.min(180, 72 * scale))}px`,
                  height: `${Math.max(10, Math.min(50,  20 * scale))}px`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full flex items-center justify-center rounded-full overflow-hidden" />
    </div>
  );
};

export default EyepieceSimulation;
