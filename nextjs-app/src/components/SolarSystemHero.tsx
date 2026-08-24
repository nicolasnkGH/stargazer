"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PlanetDef, TwilightTimeline } from "@/types";
import { TEX_BASE, PLANETS } from "@/lib/constants";

// ── Dark-in countdown helper ────────────────────────────────────────────────

/** Parse "HH:MM" into minutes-since-midnight (NaN if invalid). */
function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr || timeStr.length < 5) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** Format minutes difference into human-readable string like "2h 15m". */
function formatDuration(minutes: number): string {
  const absMin = Math.abs(Math.round(minutes));
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

/** Compute a display string for the dark-in metric.
 *
 *  Before astro_start → "In Xh Ym"  (countdown until dark begins)
 *  During dark        → "Xh Ym left" (remaining dark window, counting down to astro_end/dawn)
 *  After astro_end    → "--:--"      (daytime, no dark window remaining)
 */
function useDarkInCountdown(
  astroStart: string | null,
  astroEnd: string | null,
): string {
  const [display, setDisplay] = useState("--:--");

  useEffect(() => {
    const startMin = parseTimeToMinutes(astroStart);
    const endMin = parseTimeToMinutes(astroEnd);
    if (startMin == null) return;

    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      // Normalize times relative to now for day-boundary handling.
      // astro_start is usually evening (e.g. 21:30), astro_end is early morning (e.g. 04:45).
      let start = startMin - nowMin;
      let end = endMin != null ? endMin - nowMin : null;

      // If astro_start already passed today (diff < 0), it belongs to tonight —
      // push it forward so the "In Xh" countdown still works for early-evening now.
      // If astro_end < astro_start (crosses midnight), push end to tomorrow as well.
      if (end != null && end < start) end += 24 * 60;
      if (start < 0) {
        start += 24 * 60;
        if (end != null) end += 24 * 60;
      }

      if (start > 0) {
        // Before dark: countdown to astro_start
        setDisplay(`In ${formatDuration(start)}`);
      } else if (end != null && end > 0) {
        // During dark: remaining dark window (countdown to dawn/astro_end)
        setDisplay(`${formatDuration(end)} left`);
      } else {
        // After astro_end (daytime) — dark window has passed
        setDisplay("--:--");
      }
    };

    tick();
    const id = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(id);
  }, [astroStart, astroEnd]);

  return display;
}

// ── Component ────────────────────────────────────────────────────────────────

interface SolarSystemHeroProps {
  twilight?: TwilightTimeline | null;
  bortle?: number | null;
}

export default function SolarSystemHero({ twilight, bortle }: SolarSystemHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);

  const darkInValue = useDarkInCountdown(
    twilight?.astro_start ?? null,
    twilight?.astro_end ?? null,
  );
  const bortleValue = bortle != null ? `Class ${bortle}` : "--";

  const isDragging = useRef(false);
  const autoRotate = useRef(true);
  const time = useRef(0);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const lastRaf = useRef(0);
  const planetMeshes = useRef<THREE.Mesh[]>([]);
  const sunLight = useRef<THREE.PointLight | null>(null);

  const handlePointerDown = useCallback(() => {
    isDragging.current = true;
    autoRotate.current = false;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.current = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY.current = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    const labelContainer = labelContainerRef.current;
    if (!container || !labelContainer) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // Starfield background using a large sphere with inverted normals
    const starGeo = new THREE.SphereGeometry(400, 32, 32);
    const starTex = new THREE.TextureLoader().load(`${TEX_BASE}2k_stars.jpg`);
    const starMat = new THREE.MeshBasicMaterial({
      map: starTex,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(starGeo, starMat));

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    // SolarSystemScope style: low angle, looking slightly down at the ecliptic
    camera.position.set(0, 45, 180);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.insertBefore(renderer.domElement, container.firstChild);

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x111122, 0.4));
    const light = new THREE.PointLight(0xffddaa, 3, 400);
    light.position.set(0, 0, 0);
    scene.add(light);
    sunLight.current = light;

    // ── Texture loader ───────────────────────────────────────────────────
    const textureLoader = new THREE.TextureLoader();
    const meshes: THREE.Mesh[] = [];

    const createPlanet = (def: PlanetDef): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(def.radius, 48, 32);
      let mat: THREE.Material;

      if (def.textureUrl) {
        const tex = textureLoader.load(
          def.textureUrl,
          undefined,
          undefined,
          () => {} // fallback: use color below
        );
        tex.colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshPhongMaterial({
          map: tex,
          emissive: def.emissive,
          emissiveIntensity: def.emissiveIntensity ?? (def.name === "Sun" ? 2.0 : 0.2),
          shininess: def.name === "Sun" ? 80 : 15,
          specular: 0x112233,
        });
      } else {
        mat = new THREE.MeshPhongMaterial({
          color: def.color,
          emissive: def.emissive,
          emissiveIntensity: def.emissiveIntensity ?? (def.name === "Sun" ? 2.0 : 0.2),
          shininess: def.name === "Sun" ? 80 : 15,
          specular: 0x112233,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        def.orbitRadius > 0 ? Math.cos(0) * def.orbitRadius : 0,
        0,
        def.orbitRadius > 0 ? Math.sin(0) * def.orbitRadius : 0
      );

      // Add sun glow sprite
      if (def.name === "Sun") {
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = 128;
        glowCanvas.height = 128;
        const ctx = glowCanvas.getContext("2d")!;
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(255, 230, 150, 1)");
        grad.addColorStop(0.3, "rgba(255, 180, 50, 0.8)");
        grad.addColorStop(1, "rgba(255, 100, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        const glowTex = new THREE.CanvasTexture(glowCanvas);
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffddaa,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(def.radius * 4, def.radius * 4, 1);
        mesh.add(glowSprite);
      }

      scene.add(mesh);
      return mesh;
    };

    PLANETS.forEach((def) => {
      const mesh = createPlanet(def);
      meshes.push(mesh);
    });
    planetMeshes.current = meshes;

    // ── Saturn's rings with real alpha texture ───────────────────────────
    const saturnIdx = PLANETS.findIndex((p) => p.name === "Saturn");
    if (saturnIdx >= 0 && meshes[saturnIdx]) {
      const ringGeo = new THREE.RingGeometry(
        PLANETS[saturnIdx].ringInner!,
        PLANETS[saturnIdx].ringOuter!,
        128
      );

      // Try to load real Saturn ring alpha texture
      const ringTex = textureLoader.load(`${TEX_BASE}2k_saturn_ring_alpha.png`);
      ringTex.colorSpace = THREE.SRGBColorSpace;
      const ringMat = new THREE.MeshPhongMaterial({
        map: ringTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        opacity: 0.85,
      });

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2 + 0.47; // ~27 degree tilt
      meshes[saturnIdx].add(ring);
    }

    // ── Orbital paths ────────────────────────────────────────────────────
    PLANETS.forEach((def) => {
      if (def.orbitRadius <= 0) return;
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * def.orbitRadius,
            0,
            Math.sin(angle) * def.orbitRadius
          )
        );
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = new THREE.LineDashedMaterial({
        color: 0x5588ff,
        transparent: true,
        opacity: 0.35,
        dashSize: 2,
        gapSize: 1.5,
      });
      const line = new THREE.LineLoop(orbitGeo, orbitMat);
      line.computeLineDistances();
      scene.add(line);
    });

    // ── Ecliptic Grid ────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(400, 40, 0x334466, 0x112233);
    grid.material.transparent = true;
    grid.material.opacity = 0.2;
    // Fade out grid at edges
    grid.material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying vec3 vWorldPosition;
        ${shader.vertexShader}
      `.replace(
        `#include <worldpos_vertex>`,
        `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        `
      );
      shader.fragmentShader = `
        varying vec3 vWorldPosition;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float dist = length(vWorldPosition);
        float fade = smoothstep(200.0, 50.0, dist);
        vec4 diffuseColor = vec4( diffuse, opacity * fade );
        `
      );
    };
    scene.add(grid);

    // ── Labels (HTML overlay) ────────────────────────────────────────────
    const labels: { mesh: THREE.Mesh; element: HTMLElement }[] = [];
    const _projVec = new THREE.Vector3();

    PLANETS.forEach((def, i) => {
        const mesh = meshes[i];
        const label = document.createElement("div");
        label.className = "hero-planet-label";
        label.textContent = def.name;
        labelContainer.appendChild(label);
        labels.push({ mesh, element: label });
    });

    // ── OrbitControls ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = true;
    controls.minDistance = 60;
    controls.maxDistance = 400;
    controls.autoRotate = false;
    controls.addEventListener("start", handlePointerDown);
    controls.addEventListener("end", handlePointerUp);

    // ── Micro-parallax ───────────────────────────────────────────────────
    const PARALLAX_STRENGTH = 0.015;
    container.addEventListener("mousemove", handlePointerMove, { passive: true });
    container.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const rect = container.getBoundingClientRect();
          mouseX.current = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
          mouseY.current = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        }
      },
      { passive: true }
    );

    // ── Visibility guards ────────────────────────────────────────────────
    let heroVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    let pageVisible = !document.hidden;
    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // ── Animation loop — 20fps ───────────────────────────────────────────
    const FPS_INTERVAL = 1000 / 20;
    let animationFrameId: number;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!pageVisible || !heroVisible) return;
      if (now - lastRaf.current < FPS_INTERVAL) return;
      lastRaf.current = now;

      if (autoRotate.current && !isDragging.current) {
        time.current += 0.01;
      }

      // Update planet positions
      PLANETS.forEach((def, i) => {
        if (def.orbitRadius <= 0) {
          // Sun — gentle pulse
          const pulse = Math.sin(time.current * 0.7) * 0.5;
          meshes[i].position.y = pulse;
          return;
        }

        const angle = time.current * def.speed * 100;
        meshes[i].position.x = Math.cos(angle) * def.orbitRadius;
        meshes[i].position.z = Math.sin(angle) * def.orbitRadius;
      });

      // Update sun light position
      if (sunLight.current) {
        sunLight.current.position.copy(meshes[0].position);
      }

      // Micro-parallax camera
      const camTargetX = mouseX.current * PARALLAX_STRENGTH;
      const camTargetY = mouseY.current * PARALLAX_STRENGTH * 0.6;
      camera.position.x += (camTargetX * 40 - camera.position.x + 0) * 0.02;
      camera.position.y += (camTargetY * 25 - camera.position.y + 45) * 0.02;
      camera.lookAt(0, 0, 0);

      controls.update();
      renderer.render(scene, camera);

      // Update label positions
      labels.forEach(({ mesh, element }) => {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        _projVec.copy(worldPos).project(camera);

        const rect = container.getBoundingClientRect();
        const x = (_projVec.x + 1) / 2 * rect.width;
        // Offset Y slightly so the label sits nicely under/over the planet
        const y = (-_projVec.y + 1) / 2 * rect.height + 15;

        if (_projVec.z > 1) {
          element.style.display = "none";
        } else {
          element.style.display = "";
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
        }
      });
    };

    animate(performance.now());

    // ── Resize ───────────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      container.removeEventListener("mousemove", handlePointerMove);
      controls.removeEventListener("start", handlePointerDown);
      controls.removeEventListener("end", handlePointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      labelContainer.innerHTML = "";
      scene.traverse((obj) => {
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
  }, [handlePointerDown, handlePointerUp, handlePointerMove]);

  return (
    <section id="hero-section" className="relative w-full" style={{ minHeight: "60vh", minWidth: "100%" }}>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={labelContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      />
      {/* Glass card overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="hero-glass-card max-w-lg mx-4">
          {/* Eyebrow */}
          <div className="hero-eyebrow">
            <span className="hero-pulse-dot" />
            <span>Observatory &middot; Dashboard</span>
          </div>
          {/* Title */}
          <h1 className="hero-title">StarGazer</h1>
          {/* Subtitle */}
          <p className="hero-subtitle">Astronomy made simple.</p>
          {/* Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-label">Dark In</span>
              <span className="hero-stat-value">{darkInValue}</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-label">Bortle Scale</span>
              <span className="hero-stat-value">{bortleValue}</span>
            </div>
          </div>
          {/* Badges */}
          <div className="hero-badges">
            <span className="hero-badge hero-badge-version">v0.2.0</span>
            <a
              href="https://github.com/nickt-star/stargazer"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-badge hero-badge-link"
            >
              GitHub
            </a>
            <a
              href="#collaborate"
              className="hero-badge hero-badge-link"
            >
              Collaborate
            </a>
          </div>
        </div>
      </div>
      {/* Bottom fade */}
      <div className="hero-fade" />
    </section>
  );
}
