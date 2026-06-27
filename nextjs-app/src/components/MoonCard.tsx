"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Moon } from "lucide-react";

interface MoonData {
  phase_name: string;
  illumination_pct: number;
  emoji?: string;
  altitude_deg?: number;
  direction?: string;
  rise?: string;
  set?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function Moon3DWidget({ illumination_pct }: { illumination_pct: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambient);

    const illum = illumination_pct / 100;
    const lightAngle = Math.PI * (1 - illum * 2);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(Math.cos(lightAngle) * 5, 0.5, Math.sin(lightAngle) * 5);
    scene.add(dirLight);

    const geo = new THREE.SphereGeometry(1, 48, 48);
    const texLoader = new THREE.TextureLoader();
    const mat = new THREE.MeshPhongMaterial({
      map: texLoader.load("/assets/moon_texture.jpg"),
      bumpMap: texLoader.load("/assets/moon_texture.jpg"),
      bumpScale: 0.02,
      specular: 0x111111,
      shininess: 5,
    });

    const mesh = new THREE.Mesh(geo, mat);
    meshRef.current = mesh;
    mesh.rotation.y = -Math.PI / 2;
    mesh.rotation.x = 0.1;
    scene.add(mesh);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      mat.dispose();
      geo.dispose();
    };
  }, [illumination_pct]);

  return (
    <div className="w-full h-44 flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ background: "radial-gradient(circle at center, rgba(30,40,60,0.3) 0%, transparent 70%)" }} />
    </div>
  );
}

export default function MoonCard() {
  const [moon, setMoon] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTonight() {
      try {
        const res = await fetch(`${API_BASE}/tonight`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMoon(data.moon);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch moon data");
      } finally {
        setLoading(false);
      }
    }
    fetchTonight();
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Moon className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
          <div className="h-5 w-16 bg-white/10 rounded" />
        </div>
        <div className="h-32 bg-white/5 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 h-full">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!moon) return null;

  return (
    <div className="card card-body flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Moon</h3>
        <span className="ml-auto text-xs text-zinc-500">{moon.illumination_pct}%</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{moon.emoji ?? "🌙"}</span>
        <div>
          <p className="text-base font-semibold text-zinc-100">{moon.phase_name}</p>
        </div>
      </div>

      <div className="w-full rounded-full bg-white/10 h-2 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all"
          style={{ width: `${moon.illumination_pct}%` }}
        />
      </div>

      <Moon3DWidget illumination_pct={moon.illumination_pct} />

      {moon.altitude_deg != null && (
        <p className="mt-3 text-xs text-zinc-400 font-mono">
          Alt: {moon.altitude_deg}° {moon.direction ?? ""}
        </p>
      )}
    </div>
  );
}
