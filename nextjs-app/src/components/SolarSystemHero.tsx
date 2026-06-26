"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Texture base URL (SolarSystemScope, CC0) ────────────────────────────────
const TEX_BASE = "https://solarsystemscope.com/textures/download/";

// ── Planet data ──────────────────────────────────────────────────────────────
interface PlanetDef {
  name: string;
  radius: number;
  orbitRadius: number;
  speed: number;
  color: number;
  emissive: number;
  emissiveIntensity?: number;
  textureUrl?: string;
  ringInner?: number;
  ringOuter?: number;
}

const PLANETS: PlanetDef[] = [
  {
    name: "Sun",
    radius: 10,
    orbitRadius: 0,
    speed: 0,
    color: 0xffcc33,
    emissive: 0xffaa00,
    emissiveIntensity: 2.0,
    textureUrl: `${TEX_BASE}2k_sun.jpg`,
  },
  {
    name: "Mercury",
    radius: 1.5,
    orbitRadius: 26,
    speed: 0.018,
    color: 0x8c7e6d,
    emissive: 0x1a1510,
    textureUrl: `${TEX_BASE}2k_mercury.jpg`,
  },
  {
    name: "Venus",
    radius: 2.2,
    orbitRadius: 38,
    speed: 0.012,
    color: 0xc8a878,
    emissive: 0x1a1408,
    textureUrl: `${TEX_BASE}2k_venus_surface.jpg`,
  },
  {
    name: "Earth",
    radius: 2.3,
    orbitRadius: 52,
    speed: 0.01,
    color: 0x4488cc,
    emissive: 0x0a1020,
    textureUrl: `${TEX_BASE}2k_earth_daymap.jpg`,
  },
  {
    name: "Mars",
    radius: 1.8,
    orbitRadius: 68,
    speed: 0.008,
    color: 0xb85a3a,
    emissive: 0x1a0800,
    textureUrl: `${TEX_BASE}2k_mars.jpg`,
  },
  {
    name: "Jupiter",
    radius: 5.5,
    orbitRadius: 95,
    speed: 0.004,
    color: 0xc8a878,
    emissive: 0x1a1408,
    textureUrl: `${TEX_BASE}2k_jupiter.jpg`,
  },
  {
    name: "Saturn",
    radius: 4.5,
    orbitRadius: 125,
    speed: 0.003,
    color: 0xd8c898,
    emissive: 0x1a1508,
    textureUrl: `${TEX_BASE}2k_saturn.jpg`,
    ringInner: 6.0,
    ringOuter: 10.0,
  },
  {
    name: "Uranus",
    radius: 3.2,
    orbitRadius: 155,
    speed: 0.002,
    color: 0x78b8c8,
    emissive: 0x0a1520,
    textureUrl: `${TEX_BASE}2k_uranus.jpg`,
  },
  {
    name: "Neptune",
    radius: 3.0,
    orbitRadius: 180,
    speed: 0.001,
    color: 0x3355bb,
    emissive: 0x050a20,
    textureUrl: `${TEX_BASE}2k_neptune.jpg`,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function SolarSystemHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);

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
    // High-angle view looking down at the solar system (SolarSystemScope style)
    camera.position.set(80, 160, 160);
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
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x4466aa,
        transparent: true,
        opacity: 0.15,
      });
      scene.add(new THREE.LineLoop(orbitGeo, orbitMat));
    });

    // ── Labels (HTML overlay) ────────────────────────────────────────────
    const labelElements: HTMLElement[] = [];
    const _projVec = new THREE.Vector3();

    PLANETS.forEach((def, i) => {
      const label = document.createElement("div");
      label.className = "hero-planet-label";
      label.textContent = def.name;
      labelContainer.appendChild(label);
      labelElements.push(label);

      // Position above planet
      meshes[i].position.y = def.radius + 2;
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

    const animate = (now: number) => {
      requestAnimationFrame(animate);
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
      camera.position.x += (camTargetX * 40 - camera.position.x + 80) * 0.02;
      camera.position.y += (camTargetY * 25 - camera.position.y + 160) * 0.02;
      camera.lookAt(0, 0, 0);

      controls.update();
      renderer.render(scene, camera);

      // Update label positions
      labelElements.forEach((label, i) => {
        const worldPos = new THREE.Vector3();
        meshes[i].getWorldPosition(worldPos);
        _projVec.copy(worldPos).project(camera);

        const rect = container.getBoundingClientRect();
        const x = (_projVec.x + 1) / 2 * rect.width;
        const y = (-_projVec.y + 1) / 2 * rect.height;

        if (_projVec.z > 1) {
          label.style.display = "none";
        } else {
          label.style.display = "";
          label.style.left = `${x}px`;
          label.style.top = `${y}px`;
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
              <span className="hero-stat-value">--:--</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-label">Bortle Scale</span>
              <span className="hero-stat-value">--</span>
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
