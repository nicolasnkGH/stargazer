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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    let isVisible = false;
    let isPageVisible = true;
    let lastFrameTime = 0;
    let disposed = false;

    try {
      const width = container.clientWidth || 240;
      const height = container.clientHeight || 240;

      // Three.js Scene Setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x010206);

      // Camera setup — FOV scales inversely with magnification (50x -> wide, 300x -> zoomed high power)
      const baseFov = Math.max(2, Math.min(30, (80 / (magnification / 50)) * (eyepieceFov / 68)));
      const camera = new THREE.PerspectiveCamera(baseFov, width / height, 0.1, 500);
      camera.position.set(0, 0, 45);

      // Renderer — forced 1× pixel ratio and no antialias for card thumbnails
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

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
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.75 });
      const starPoints = new THREE.Points(starGeo, starMat);
      scene.add(starPoints);

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

        // Saturn Rings
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
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
            roughness: 0.6,
          });

          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 2;
          planetMesh.add(ringMesh);
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
        });
      } else {
        // NON-PLANET OPTICAL TARGETS (Star, Double Star, Galaxy, Nebula, Cluster)
        nonPlanetGroup = new THREE.Group();
        scene.add(nonPlanetGroup);

        const tType = (targetType || "").toLowerCase();
        const tName = targetName.toLowerCase();

        const isDoubleStar = tType.includes("double") || tName.includes("albireo") || tName.includes("mizar") || tName.includes("gamma ari") || tName.includes("61 cyg");
        const isGalaxy     = tType.includes("galaxy") || tName.includes("m31") || tName.includes("m51") || tName.includes("m82") || tName.includes("andromeda");
        const isNebula     = tType.includes("nebula") || tName.includes("m42") || tName.includes("m57") || tName.includes("ngc");
        const isCluster    = tType.includes("cluster") || tType.includes("globular") || tName.includes("m13") || tName.includes("m45") || tName.includes("pleiades");

        if (isDoubleStar) {
          // Double Star Pair (Primary: Amber/Gold, Companion: Sapphire-Blue)
          const pGeo = new THREE.SphereGeometry(1.0, 16, 16);
          const pMat = new THREE.MeshBasicMaterial({ color: 0xffb74d });
          const pMesh = new THREE.Mesh(pGeo, pMat);
          pMesh.position.set(-1.4, 0.4, 0);
          nonPlanetGroup.add(pMesh);

          const sGeo = new THREE.SphereGeometry(0.65, 16, 16);
          const sMat = new THREE.MeshBasicMaterial({ color: 0x64b5f6 });
          const sMesh = new THREE.Mesh(sGeo, sMat);
          sMesh.position.set(2.2, -0.6, 0);
          nonPlanetGroup.add(sMesh);

          const starLight = new THREE.PointLight(0xffb74d, 2.5, 30);
          starLight.position.set(-1.4, 0.4, 2);
          nonPlanetGroup.add(starLight);
        } else if (isGalaxy) {
          // Galaxy Luminous Core + Spiral Particle Disk
          const coreGeo = new THREE.SphereGeometry(1.8, 16, 16);
          const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1, transparent: true, opacity: 0.85 });
          const coreMesh = new THREE.Mesh(coreGeo, coreMat);
          nonPlanetGroup.add(coreMesh);

          const particleCount = 1000;
          const pGeo = new THREE.BufferGeometry();
          const pPos = new Float32Array(particleCount * 3);
          const pCols = new Float32Array(particleCount * 3);
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 12;
            const dist  = 1.5 + (i / particleCount) * 12;
            pPos[i * 3]     = Math.cos(angle) * dist + (Math.random() - 0.5) * 1.5;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
            pPos[i * 3 + 2] = Math.sin(angle) * dist + (Math.random() - 0.5) * 1.5;

            pCols[i * 3]     = 0.5 + Math.random() * 0.5;
            pCols[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            pCols[i * 3 + 2] = 1.0;
          }
          pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
          pGeo.setAttribute("color", new THREE.BufferAttribute(pCols, 3));
          const pMat = new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0.7 });
          const galaxyParticles = new THREE.Points(pGeo, pMat);
          galaxyParticles.rotation.x = Math.PI / 3;
          nonPlanetGroup.add(galaxyParticles);
        } else if (isNebula) {
          // Volumetric Glowing Particle Nebula Cloud
          const nCount = 600;
          const nGeo = new THREE.BufferGeometry();
          const nPos = new Float32Array(nCount * 3);
          const nCols = new Float32Array(nCount * 3);
          for (let i = 0; i < nCount; i++) {
            const rad = Math.random() * 8;
            const theta = Math.random() * Math.PI * 2;
            nPos[i * 3]     = Math.cos(theta) * rad;
            nPos[i * 3 + 1] = Math.sin(theta) * rad * 0.6;
            nPos[i * 3 + 2] = (Math.random() - 0.5) * 3;

            if (i % 2 === 0) {
              nCols[i * 3] = 0.1; nCols[i * 3 + 1] = 0.9; nCols[i * 3 + 2] = 0.9; // Cyan
            } else {
              nCols[i * 3] = 0.9; nCols[i * 3 + 1] = 0.3; nCols[i * 3 + 2] = 0.8; // Magenta
            }
          }
          nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
          nGeo.setAttribute("color", new THREE.BufferAttribute(nCols, 3));
          const nMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.65 });
          const nebPoints = new THREE.Points(nGeo, nMat);
          nonPlanetGroup.add(nebPoints);

          const cStarGeo = new THREE.SphereGeometry(0.6, 12, 12);
          const cStarMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
          const cStarMesh = new THREE.Mesh(cStarGeo, cStarMat);
          nonPlanetGroup.add(cStarMesh);
        } else if (isCluster) {
          // Sparkling Cluster Swarm
          const cCount = 500;
          const cGeo = new THREE.BufferGeometry();
          const cPos = new Float32Array(cCount * 3);
          for (let i = 0; i < cCount; i++) {
            const rad = Math.pow(Math.random(), 2.5) * 10;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI;
            cPos[i * 3]     = rad * Math.cos(theta) * Math.cos(phi);
            cPos[i * 3 + 1] = rad * Math.sin(phi);
            cPos[i * 3 + 2] = rad * Math.sin(theta) * Math.cos(phi);
          }
          cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
          const cMat = new THREE.PointsMaterial({ color: 0xfffaed, size: 0.9, transparent: true, opacity: 0.85 });
          const clusterPoints = new THREE.Points(cGeo, cMat);
          nonPlanetGroup.add(clusterPoints);
        } else {
          // Single Star (Spectral Color based on Name/Type)
          let starColor = 0xffe082; // Default Yellow
          if (tName.includes("betel") || tName.includes("anta") || tName.includes("red")) starColor = 0xef5350;
          else if (tName.includes("rigel") || tName.includes("vega") || tName.includes("sirius") || tName.includes("spica")) starColor = 0x90caf9;

          const sGeo = new THREE.SphereGeometry(1.2, 16, 16);
          const sMat = new THREE.MeshBasicMaterial({ color: starColor });
          const sMesh = new THREE.Mesh(sGeo, sMat);
          nonPlanetGroup.add(sMesh);

          const sLight = new THREE.PointLight(starColor, 3, 30);
          sLight.position.set(0, 0, 2);
          nonPlanetGroup.add(sLight);
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

        if (nonPlanetGroup) {
          nonPlanetGroup.rotation.y += delta * 0.1;
        }

        moonMeshes.forEach(({ mesh, periodDays, dist }, idx) => {
          const liveAngle = ((nowDays + elapsed / 86400) / periodDays) * Math.PI * 2 + idx * 1.2;
          mesh.position.x = Math.cos(liveAngle) * dist;
          mesh.position.z = Math.sin(liveAngle) * dist;
          mesh.position.y = Math.sin(liveAngle) * dist * 0.08;
        });

        if (seeingSim) {
          camera.position.x = Math.sin(elapsed * 4.5) * 0.04;
          camera.position.y = Math.cos(elapsed * 3.2) * 0.04;
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
        starGeo.dispose();
        starMat.dispose();
        if (planetMesh) {
          planetMesh.geometry.dispose();
          (planetMesh.material as THREE.Material).dispose();
        }
        moonMeshes.forEach(({ mesh }) => {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
      };
    } catch (err) {
      console.warn("Eyepiece WebGL init failed, fallback to 2D optical disc:", err);
      setTimeout(() => setHasError(true), 0);
    }
  }, [targetName, targetType, magnification, seeingSim, eyepieceFov, cfg, isPlanetTarget, key]);

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
