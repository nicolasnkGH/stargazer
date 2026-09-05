"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { normalizePlanetKey } from "@/lib/constants/planet-grid";

interface EyepieceSimulationProps {
  targetName: string;
  magnification: number;
  seeingSim: boolean;
  eyepieceFov: number;
}

const PLANET_CONFIGS: Record<string, { texture: string; radius: number; tilt: number; rotPeriodHours: number }> = {
  sun:     { texture: "/textures/2k_sun.jpg",           radius: 1.0,  tilt: 7.25,   rotPeriodHours: 600    },
  mercury: { texture: "/textures/mercury.jpg",           radius: 0.38, tilt: 0.03,   rotPeriodHours: 1407   },
  venus:   { texture: "/textures/venus.jpg",             radius: 0.95, tilt: 177.3,  rotPeriodHours: -5832  },
  earth:   { texture: "/textures/2k_earth_daymap.jpg",   radius: 1.0,  tilt: 23.44,  rotPeriodHours: 23.93  },
  moon:    { texture: "/textures/moon_texture.jpg",      radius: 0.8,  tilt: 6.68,   rotPeriodHours: 655    },
  mars:    { texture: "/textures/mars.jpg",              radius: 0.53, tilt: 25.19,  rotPeriodHours: 24.62  },
  jupiter: { texture: "/textures/jupiter.jpg",           radius: 1.8,  tilt: 3.13,   rotPeriodHours: 9.92   },
  saturn:  { texture: "/textures/saturn.jpg",            radius: 1.5,  tilt: 26.73,  rotPeriodHours: 10.55  },
  uranus:  { texture: "/textures/uranus.jpg",            radius: 1.1,  tilt: 97.77,  rotPeriodHours: -17.24 },
  neptune: { texture: "/textures/neptune.jpg",           radius: 1.05, tilt: 28.32,  rotPeriodHours: 16.11  },
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const key = normalizePlanetKey(targetName);
  const cfg = PLANET_CONFIGS[key] || PLANET_CONFIGS["jupiter"];
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

      // Renderer — forced 1× pixel ratio and no antialias for card thumbnails (largest single perf saving)
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

      // Subtle Starfield Background Points — reduced count
      const starCount = 120;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPos[i]     = (Math.random() - 0.5) * 120;
        starPos[i + 1] = (Math.random() - 0.5) * 120;
        starPos[i + 2] = -50 - Math.random() * 50;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.7 });
      const starPoints = new THREE.Points(starGeo, starMat);
      scene.add(starPoints);

      // Lights
      const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
      sunLight.position.set(-20, 10, 35);
      scene.add(sunLight);

      // Target Planet Mesh — reduced segments (32 vs 64): 4x fewer vertices, imperceptible at card size
      const planetGeo = new THREE.SphereGeometry(cfg.radius, 32, 32);
      const texLoader = new THREE.TextureLoader();
      const texture = texLoader.load(cfg.texture, undefined, undefined, () => setHasError(true));
      texture.colorSpace = THREE.SRGBColorSpace;

      const planetMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
      });

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.rotation.z = THREE.MathUtils.degToRad(cfg.tilt);
      scene.add(planetMesh);

      // Saturn Rings
      let ringMesh: THREE.Mesh | null = null;
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

        const ringTex = texLoader.load("/textures/saturn_ring_color.jpg");
        ringTex.colorSpace = THREE.SRGBColorSpace;
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
          roughness: 0.6,
        });

        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        planetMesh.add(ringMesh);
      }

      // Ephemeris Moons — low-poly (8 segments)
      const moonMeshes: { mesh: THREE.Mesh; periodDays: number; dist: number }[] = [];
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

      // Animation Loop — frame-rate capped at TARGET_FPS; skips when off-screen or tab hidden
      const startTime = performance.now();

      const animate = (now: number) => {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);

        // Pause when element is not visible in viewport or page is backgrounded
        if (!isVisible || !isPageVisible) return;

        // Frame cap — skip expensive render calls until interval has elapsed
        if (now - lastFrameTime < FRAME_INTERVAL_MS) return;
        lastFrameTime = now;

        const elapsed = (now - startTime) / 1000;
        const delta   = Math.min(0.1, FRAME_INTERVAL_MS / 1000);

        const rotSpeed = (2 * Math.PI) / (Math.abs(cfg.rotPeriodHours) * 3600);
        planetMesh.rotation.y += rotSpeed * delta * 5000;

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
        planetGeo.dispose();
        planetMat.dispose();
        starGeo.dispose();
        starMat.dispose();
        if (ringMesh) {
          ringMesh.geometry.dispose();
          (ringMesh.material as THREE.Material).dispose();
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
  }, [targetName, magnification, seeingSim, eyepieceFov, cfg, key]);

  if (hasError) {
    const scale = magnification / 120;
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#010206] rounded-full overflow-hidden">
        <div
          className="relative rounded-full bg-cover bg-center border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-300"
          style={{
            width: `${Math.max(12, Math.min(80, 24 * scale))}px`,
            height: `${Math.max(12, Math.min(80, 24 * scale))}px`,
            backgroundImage: `url(${cfg.texture})`,
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
