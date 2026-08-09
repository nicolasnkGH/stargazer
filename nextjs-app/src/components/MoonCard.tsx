"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLocale, useTranslations } from "next-intl";
import { Moon } from "lucide-react";
import type { MoonData } from "@/types";
import { MOON_FACT_STORAGE_KEY_PREFIX } from "@/lib/constants";
import { addToPlan } from "@/hooks/useNightPlan";
import GalleryButton from "./GalleryButton";

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

function useMoonFact(fresh: string | undefined) {
  const locale = useLocale();
  const [cached, setCached] = useState<string | null>(null);

  // Hydrating from localStorage, which doesn't exist during SSR — can't be a lazy
  // useState initializer without a hydration mismatch, so this has to be an effect.
  useEffect(() => {
    const key = `${MOON_FACT_STORAGE_KEY_PREFIX}${locale}`;
    if (fresh) {
      localStorage.setItem(key, fresh);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCached(fresh);
    } else {
      setCached(localStorage.getItem(key));
    }
  }, [fresh, locale]);

  return fresh ?? cached;
}

export default function MoonCard({ moon, moonFact }: { moon: MoonData | null; moonFact?: string }) {
  const t = useTranslations();
  const fact = useMoonFact(moonFact);

  function addMoonToPlan() {
    const err = addToPlan("moon", "🌙 The Moon");
    if (err) alert(err);
  }

  if (!moon) {
    return (
      <div className="card p-5 h-full">
        <p className="text-sm text-red-400">Moon data unavailable.</p>
      </div>
    );
  }

  return (
    <div className="card card-body flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="h-5 w-5 text-amber-400" strokeWidth={1.6} />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Moon</h3>
        <span className="ml-auto text-xs text-zinc-500">{moon.illumination_pct}%</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <GalleryButton targetId="moon" targetName="Moon" />
        <button
          onClick={addMoonToPlan}
          className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
        >
          {t("btn_add_moon_to_plan")}
        </button>
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

      {fact && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-zinc-400 leading-relaxed italic">{fact}</p>
        </div>
      )}
    </div>
  );
}
