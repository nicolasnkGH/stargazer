"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TwilightTimeline } from "@/types";
import { TEX_BASE, PLANETS } from "@/lib/constants";

// ── Dark-in countdown helper ────────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr || timeStr.length < 5) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(minutes: number): string {
  const absMin = Math.abs(Math.round(minutes));
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function useDarkInCountdown(
  astroStart: string | null,
  astroEnd: string | null,
  dawn: string | null
): string {
  const [display, setDisplay] = useState("In --");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      const startMin = parseTimeToMinutes(astroStart);
      const endMin = parseTimeToMinutes(astroEnd) ?? parseTimeToMinutes(dawn);

      if (startMin === null) {
        setDisplay("In --");
        return;
      }

      if (endMin !== null && startMin > endMin) {
        if (currentMin >= startMin) {
          const totalDark = (1440 - startMin) + endMin;
          const elapsed = currentMin - startMin;
          setDisplay(`${formatDuration(totalDark - elapsed)} left`);
        } else if (currentMin < endMin) {
          const totalDark = (1440 - startMin) + endMin;
          const remaining = endMin - currentMin;
          setDisplay(`${formatDuration(remaining)} left`);
        } else {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        }
      } else if (endMin !== null) {
        if (currentMin >= startMin && currentMin < endMin) {
          setDisplay(`${formatDuration(endMin - currentMin)} left`);
        } else if (currentMin < startMin) {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        } else {
          setDisplay(`In ${formatDuration(1440 - currentMin + startMin)}`);
        }
      } else {
        if (currentMin < startMin) {
          setDisplay(`In ${formatDuration(startMin - currentMin)}`);
        } else {
          setDisplay(`In ${formatDuration(1440 - currentMin + startMin)}`);
        }
      }
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [astroStart, astroEnd, dawn]);

  return display;
}

// ── Props Interface ─────────────────────────────────────────────────────────

interface SolarSystemHeroProps {
  twilight?: TwilightTimeline | null;
  bortle?: number | null;
}

export default function SolarSystemHero({ twilight, bortle }: SolarSystemHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // States
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(10);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(140);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  const darkInValue = useDarkInCountdown(
    twilight?.astro_start ?? null,
    twilight?.astro_end ?? null,
    twilight?.sunrise ?? null
  );
  const bortleValue = bortle ? `B${bortle}` : "B6";

  // Three.js internal refs
  const timeRef = useRef(0);
  const speedRef = useRef(10);
  const selectedPlanetRef = useRef<string | null>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);

  // Sync refs with state
  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    selectedPlanetRef.current = selectedPlanet;
  }, [selectedPlanet]);

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeParts = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const dateParts = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).toUpperCase();
      setCurrentTimeStr(`${timeParts} ${dateParts}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 110, 160);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 450;
    controlsRef.current = controls;

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0x223355, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfff0dd, 5, 800);
    scene.add(sunLight);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();

    // Planet Meshes & Orbits Array
    const meshes: THREE.Mesh[] = [];

    PLANETS.forEach((def) => {
      // 1. Create Orbit Ring (if not Sun)
      if (def.orbitRadius > 0) {
        const orbitGeo = new THREE.BufferGeometry();
        const points: THREE.Vector3[] = [];
        const segments = 128;
        for (let j = 0; j <= segments; j++) {
          const theta = (j / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta) * def.orbitRadius, 0, Math.sin(theta) * def.orbitRadius));
        }
        orbitGeo.setFromPoints(points);

        const orbitMat = new THREE.LineBasicMaterial({
          color: 0x3060a0,
          transparent: true,
          opacity: 0.35,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
      }

      // 2. Create Planet Sphere
      const geo = new THREE.SphereGeometry(def.radius, 48, 48);
      let mat: THREE.Material;

      if (def.name === "Sun") {
        const sunTex = textureLoader.load(def.textureUrl!);
        mat = new THREE.MeshBasicMaterial({
          map: sunTex,
          color: 0xffdd66,
        });

        // Sun Glow Halo
        const glowGeo = new THREE.SphereGeometry(def.radius * 1.35, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 0.3,
          side: THREE.BackSide,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glowMesh);
      } else {
        const tex = textureLoader.load(def.textureUrl!);
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.7,
          metalness: 0.1,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      meshes.push(mesh);

      // Saturn Rings
      if (def.name === "Saturn" && def.ringInner && def.ringOuter) {
        const ringGeo = new THREE.RingGeometry(def.ringInner, def.ringOuter, 64);
        // Fix UV mapping for RingGeometry
        const pos = ringGeo.attributes.position;
        const uvs = [];
        for (let i = 0; i < pos.count; i++) {
          const vertex = new THREE.Vector3().fromBufferAttribute(pos, i);
          const length = vertex.length();
          const u = (length - def.ringInner) / (def.ringOuter - def.ringInner);
          uvs.push(u, 0.5);
        }
        ringGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

        const ringTex = textureLoader.load(`${TEX_BASE}saturn_ring_color.jpg`);
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.2;
        mesh.add(ringMesh);
      }

      // Earth Moon
      if (def.name === "Earth") {
        const moonGeo = new THREE.SphereGeometry(0.6, 24, 24);
        const moonTex = textureLoader.load(`${TEX_BASE}moon_texture.jpg`);
        const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.8 });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.name = "Moon";
        mesh.add(moonMesh);
      }
    });

    planetMeshesRef.current = meshes;

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      timeRef.current += delta * speedRef.current;

      // Update Planet Positions
      PLANETS.forEach((def, i) => {
        const mesh = meshes[i];
        if (!mesh) return;

        if (def.orbitRadius <= 0) {
          // Sun rotation
          mesh.rotation.y += delta * 0.1;
        } else {
          // Orbital position
          const angle = timeRef.current * def.speed;
          mesh.position.x = Math.cos(angle) * def.orbitRadius;
          mesh.position.z = Math.sin(angle) * def.orbitRadius;

          // Axial rotation
          mesh.rotation.y += delta * 0.5;

          // Earth Moon orbit
          if (def.name === "Earth") {
            const moon = mesh.getObjectByName("Moon");
            if (moon) {
              const moonAngle = timeRef.current * 0.15;
              moon.position.x = Math.cos(moonAngle) * 5;
              moon.position.z = Math.sin(moonAngle) * 5;
            }
          }
        }
      });

      // Handle Camera Focus / Transition
      const selName = selectedPlanetRef.current;
      if (selName) {
        const planetIndex = PLANETS.findIndex(
          (p) => p.name.toLowerCase() === selName.toLowerCase()
        );
        if (planetIndex >= 0 && meshes[planetIndex]) {
          const targetMesh = meshes[planetIndex];
          const targetPos = targetMesh.position;

          // Smoothly move orbit control target to selected planet
          controls.target.lerp(targetPos, 0.08);

          // Maintain smooth camera offset
          const offset = new THREE.Vector3(0, 15, 30);
          const desiredCamPos = targetPos.clone().add(offset);
          camera.position.lerp(desiredCamPos, 0.05);
        }
      } else {
        // Default target at origin (Sun)
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate(performance.now());

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Camera Pan D-Pad Handlers
  const handlePan = (dir: "up" | "down" | "left" | "right" | "reset") => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (dir === "reset") {
      setSelectedPlanet(null);
      controls.target.set(0, 0, 0);
      return;
    }

    const step = 15;
    if (dir === "up") controls.target.z -= step;
    if (dir === "down") controls.target.z += step;
    if (dir === "left") controls.target.x -= step;
    if (dir === "right") controls.target.x += step;
  };

  // Zoom Slider Handler
  const handleZoomChange = (val: number) => {
    setZoomLevel(val);
    const controls = controlsRef.current;
    if (controls) {
      const dir = controls.object.position.clone().sub(controls.target).normalize();
      controls.object.position.copy(controls.target.clone().add(dir.multiplyScalar(val)));
    }
  };

  return (
    <section id="hero-section" className="relative w-full overflow-hidden bg-[#040714] text-white" style={{ minHeight: "85vh" }}>
      {/* 3D Canvas Layer */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* ── 1. TOP NAVBAR HEADER ─────────────────────────────────────────────── */}
      <div className="relative z-20 w-full px-4 pt-4 sm:px-8">
        <header className="orrery-glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-3.5">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <span className="text-xl">🔭</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">StarGazer</span>
          </div>

          {/* Center Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium">
            <div className="orrery-pill-btn flex items-center gap-2 rounded-xl px-3.5 py-2">
              <span className="text-amber-300">🌙</span>
              <span>Full Moon (99.7%)</span>
            </div>
            <div className="orrery-pill-btn flex items-center gap-2 rounded-xl px-3.5 py-2">
              <span className="text-cyan-400">🌡️</span>
              <span>24.2°C</span>
            </div>
            <div className="orrery-pill-btn flex items-center gap-2 rounded-xl px-3.5 py-2">
              <span className="text-blue-400">💨</span>
              <span>14.4 km/h</span>
            </div>
            <div className="orrery-pill-btn flex items-center gap-2 rounded-xl px-3.5 py-2">
              <span className="text-emerald-400">📍</span>
              <span>Columbus 40.101°N, 83.078°W</span>
            </div>
          </div>

          {/* Right Clock & Actions */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-wider text-cyan-400">
              {currentTimeStr || "15:57:32 SAT, AUG 29"}
            </span>

            <div className="flex items-center gap-1.5 border-l border-slate-700/60 pl-3">
              <button title="Search" className="orrery-pill-btn flex h-9 w-9 items-center justify-center rounded-xl text-sm">
                🔍
              </button>
              <button title="Settings" className="orrery-pill-btn flex h-9 w-9 items-center justify-center rounded-xl text-sm">
                ⚙️
              </button>
              <button title="Units" className="orrery-pill-btn flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold px-2.5">
                °C/km
              </button>
              <button title="Profile" className="orrery-pill-btn flex h-9 w-9 items-center justify-center rounded-xl text-sm">
                👤
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* ── 2. CENTER HERO OVERLAY (TITLE & STATS) ─────────────────────────── */}
      <div className="relative z-10 pointer-events-none flex flex-col items-center justify-between px-4 pt-12 pb-6 min-h-[45vh]">
        <div className="flex w-full max-w-6xl items-center justify-between text-center">
          {/* Left Stat */}
          <div className="pointer-events-auto flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{darkInValue}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80">DARK IN</span>
          </div>

          {/* Center Main Title */}
          <div className="flex flex-col items-center px-4">
            <h1 className="orrery-title-glow text-5xl sm:text-7xl font-black tracking-tight">
              StarGazer
            </h1>
            <p className="mt-2 text-sm sm:text-base font-medium text-slate-300/90 tracking-wide">
              Astronomy made simple.
            </p>
          </div>

          {/* Right Stat */}
          <div className="pointer-events-auto flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{bortleValue}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80">BORTLE SCALE</span>
          </div>
        </div>
      </div>

      {/* ── 3. BOTTOM CONTROL PANELS ───────────────────────────────────────── */}
      <div className="relative z-20 w-full px-4 pb-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          
          {/* Bottom Left: D-Pad & Time Controls */}
          <div className="flex items-center gap-4">
            {/* Directional D-Pad */}
            <div className="orrery-glass-panel relative flex h-24 w-24 items-center justify-center rounded-full p-2">
              <button
                onClick={() => handlePan("up")}
                className="orrery-dpad-btn absolute top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                title="Pan Up"
              >
                ▲
              </button>
              <button
                onClick={() => handlePan("down")}
                className="orrery-dpad-btn absolute bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                title="Pan Down"
              >
                ▼
              </button>
              <button
                onClick={() => handlePan("left")}
                className="orrery-dpad-btn absolute left-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                title="Pan Left"
              >
                ◀
              </button>
              <button
                onClick={() => handlePan("right")}
                className="orrery-dpad-btn absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                title="Pan Right"
              >
                ▶
              </button>
              <button
                onClick={() => handlePan("reset")}
                className="orrery-dpad-btn flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-cyan-400"
                title="Center Sun"
              >
                🎯
              </button>
            </div>

            {/* Time Controls Bar */}
            <div className="orrery-glass-panel flex items-center gap-1.5 rounded-2xl p-2">
              <button
                onClick={() => setSpeedMultiplier(speedMultiplier === 0 ? 10 : 0)}
                className={`orrery-pill-btn flex h-10 w-10 items-center justify-center rounded-xl text-sm ${
                  speedMultiplier === 0 ? "active" : ""
                }`}
                title={speedMultiplier === 0 ? "Play Orbit" : "Pause Orbit"}
              >
                {speedMultiplier === 0 ? "▶️" : "⏸️"}
              </button>

              {[1, 10, 100, 1000].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`orrery-pill-btn rounded-xl px-3 py-2 text-xs font-bold ${
                    speedMultiplier === s ? "active" : ""
                  }`}
                >
                  {s}x
                </button>
              ))}

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`orrery-pill-btn flex h-10 w-10 items-center justify-center rounded-xl text-sm ${
                  !isMuted ? "active" : ""
                }`}
                title="Audio"
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>

          {/* Bottom Right: Planet Selector Bar */}
          <div className="orrery-glass-panel flex max-w-full flex-wrap items-center gap-1.5 overflow-x-auto rounded-2xl p-2">
            {PLANETS.map((planet) => {
              const name = planet.name;
              const isSel = selectedPlanet?.toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={name}
                  onClick={() => setSelectedPlanet(isSel ? null : name)}
                  className={`orrery-pill-btn rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider ${
                    isSel ? "active" : ""
                  }`}
                >
                  {name}
                </button>
              );
            })}
            <button className="orrery-pill-btn flex h-9 w-9 items-center justify-center rounded-xl text-sm" title="Filters">
              🎛️
            </button>
          </div>

        </div>
      </div>

      {/* ── 4. RIGHT EDGE VERTICAL ZOOM SLIDER ─────────────────────────────── */}
      <div className="absolute right-4 top-1/2 z-20 -translate-y-1/2 hidden md:flex flex-col items-center gap-3">
        <div className="orrery-glass-panel flex flex-col items-center gap-3 rounded-2xl p-2.5">
          <button
            onClick={() => handleZoomChange(Math.max(zoomLevel - 25, 30))}
            className="orrery-pill-btn flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold"
            title="Zoom In"
          >
            +
          </button>

          <input
            type="range"
            min="30"
            max="350"
            value={zoomLevel}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="orrery-slider-track h-32 w-2 appearance-none rounded-lg accent-cyan-400 [writing-mode:vertical-lr]"
            style={{ direction: "rtl" }}
          />

          <button
            onClick={() => handleZoomChange(Math.min(zoomLevel + 25, 350))}
            className="orrery-pill-btn flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold"
            title="Zoom Out"
          >
            -
          </button>
        </div>
      </div>

      {/* Bottom Fade Gradient */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#040714] to-transparent" />
    </section>
  );
}
