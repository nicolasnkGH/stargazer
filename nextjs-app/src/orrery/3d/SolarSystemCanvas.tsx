import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { PlanetData } from "../types";
import { CELESTIAL_BODIES } from "../data/planetsData";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { OrbitRing } from "./OrbitRing";
import { SpaceBackground } from "./SpaceBackground";

interface CameraControllerProps {
  selectedBody: PlanetData | null;
  zoomLevel: number;
  panOffset?: { x: number; y: number };
  resetCount?: number;
}

const CameraController: React.FC<CameraControllerProps> = ({ selectedBody, zoomLevel, panOffset, resetCount }) => {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const desiredCamPos = useRef(new THREE.Vector3(0, 45, 70));
  const isAnimating = useRef(true);
  const prevSelectedBodyRef = useRef<PlanetData | null>(null);
  const prevZoomRef = useRef<number>(zoomLevel);
  const prevPanRef = useRef(panOffset);
  const prevResetCountRef = useRef<number>(resetCount ?? 0);

  useEffect(() => {
    const resetTriggered = resetCount !== undefined && resetCount !== prevResetCountRef.current;
    const bodyChanged = prevSelectedBodyRef.current?.id !== selectedBody?.id;
    const zoomChanged = prevZoomRef.current !== zoomLevel;
    const panChanged = prevPanRef.current?.x !== panOffset?.x || prevPanRef.current?.y !== panOffset?.y;

    prevResetCountRef.current = resetCount ?? 0;
    prevSelectedBodyRef.current = selectedBody;
    prevZoomRef.current = zoomLevel;
    prevPanRef.current = panOffset;

    if (resetTriggered) {
      targetPos.current.set(0, 0, 0);
      const mult = isMobile ? 1.4 : 1.0;
      const baseHeight = Math.max(3, 85 - (6 - 1) * 4);
      const baseDist = Math.max(5, 130 - (6 - 1) * 6.2);
      desiredCamPos.current.set(0, baseHeight * mult, baseDist * mult);
      isAnimating.current = true;
    } else if (selectedBody) {
      if (selectedBody.id === "sun") {
        targetPos.current.set(0, 0, 0);
        desiredCamPos.current.set(0, 8, 18);
      } else {
        const dist = selectedBody.distanceFromSunAU;
        targetPos.current.set(dist, 0, 0);
        desiredCamPos.current.set(dist + selectedBody.radius * 3.5, selectedBody.radius * 2, selectedBody.radius * 4.5);
      }
      isAnimating.current = true;
    } else if (bodyChanged || zoomChanged || panChanged) {
      targetPos.current.set(0, 0, 0);
      const mult = isMobile ? 1.4 : 1.0;
      const baseHeight = Math.max(3, 85 - (zoomLevel - 1) * 4);
      const baseDist = Math.max(5, 130 - (zoomLevel - 1) * 6.2);
      desiredCamPos.current.set(0, baseHeight * mult, baseDist * mult);
      isAnimating.current = true;
    }
  }, [selectedBody, zoomLevel, panOffset, resetCount, isMobile]);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      if (isAnimating.current) {
        const offsetVec = new THREE.Vector3(panOffset?.x ?? 0, panOffset?.y ?? 0, 0);
        const finalTarget = targetPos.current.clone().add(offsetVec);
        const finalCamPos = desiredCamPos.current.clone().add(offsetVec);

        controlsRef.current.target.lerp(finalTarget, delta * 4);
        camera.position.lerp(finalCamPos, delta * 4);

        if (
          camera.position.distanceTo(finalCamPos) < 0.05 &&
          controlsRef.current.target.distanceTo(finalTarget) < 0.05
        ) {
          isAnimating.current = false;
        }
      }
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.05}
      onStart={() => {
        isAnimating.current = false;
      }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      maxDistance={350}
      minDistance={1.5}
      maxPolarAngle={Math.PI / 1.8}
    />
  );
};

interface SolarSystemCanvasProps {
  selectedBody: PlanetData | null;
  onSelectBody: (body: PlanetData | null) => void;
  timeMultiplier: number;
  isPaused: boolean;
  zoomLevel: number;
  panOffset?: { x: number; y: number };
  resetCount?: number;
}

export const SolarSystemCanvas: React.FC<SolarSystemCanvasProps> = ({
  selectedBody,
  onSelectBody,
  timeMultiplier,
  isPaused,
  zoomLevel,
  panOffset,
  resetCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sunData = CELESTIAL_BODIES.find((b) => b.id === "sun")!;
  const planetBodies = CELESTIAL_BODIES.filter((b) => b.type !== "star" && b.id !== "moon");

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-slate-950 overflow-hidden select-none touch-pan-y">
      <Canvas
        frameloop={isVisible ? "always" : "never"}
        dpr={[1, 1.5]}
        shadows={false}
        camera={{ position: [0, 35, 55], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectBody(null);
          }
        }}
      >
        <color attach="background" args={["#020617"]} />

        <CameraController selectedBody={selectedBody} zoomLevel={zoomLevel} panOffset={panOffset} resetCount={resetCount} />
        <SpaceBackground />

        {planetBodies.map((planet) => (
          <OrbitRing key={`orbit-${planet.id}`} radius={planet.distanceFromSunAU} />
        ))}

        <Sun
          data={sunData}
          isSelected={selectedBody?.id === "sun"}
          onSelect={onSelectBody}
        />

        {planetBodies.map((planet) => (
          <Planet
            key={planet.id}
            data={planet}
            timeMultiplier={timeMultiplier}
            isPaused={isPaused}
            isSelected={selectedBody?.id === planet.id}
            onSelect={onSelectBody}
          />
        ))}

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.85}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
