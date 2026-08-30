import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function createStarParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(200, 225, 255, 0.8)");
  gradient.addColorStop(0.7, "rgba(100, 160, 255, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

function createNebulaSkyboxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#02030a");
  bgGrad.addColorStop(0.3, "#060919");
  bgGrad.addColorStop(0.7, "#080d24");
  bgGrad.addColorStop(1, "#010208");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const nebulaClouds = [
    { x: 500, y: 350, r: 500, color: "rgba(91, 33, 182, 0.42)" },
    { x: 1400, y: 700, r: 600, color: "rgba(14, 116, 144, 0.38)" },
    { x: 1000, y: 300, r: 450, color: "rgba(126, 34, 206, 0.32)" },
    { x: 1700, y: 250, r: 550, color: "rgba(190, 24, 93, 0.25)" },
    { x: 300, y: 800, r: 400, color: "rgba(29, 78, 216, 0.35)" },
  ];

  nebulaClouds.forEach(({ x, y, r, color }) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace(/[\d.]+\)$/, "0.15)"));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 800; i++) {
    const sx = pseudoRandom(i * 1.1) * canvas.width;
    const sy = pseudoRandom(i * 2.3) * canvas.height;
    const sr = pseudoRandom(i * 3.7) * 1.5;
    const alpha = pseudoRandom(i * 4.9) * 0.7 + 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const SpaceBackground: React.FC = () => {
  const starsRef = useRef<THREE.Points>(null);
  const nebulaSkyboxRef = useRef<THREE.Mesh>(null);

  const starSprite = useMemo(() => createStarParticleTexture(), []);
  const skyboxTex = useMemo(() => createNebulaSkyboxTexture(), []);

  const [starPositions, starColors] = useMemo(() => {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#b3d9ff"),
      new THREE.Color("#ffd9a6"),
      new THREE.Color("#a6ffff"),
      new THREE.Color("#e6ccff"),
    ];

    for (let i = 0; i < count; i++) {
      const r = 200 + pseudoRandom(i * 1.01) * 450;
      const theta = pseudoRandom(i * 2.02) * Math.PI * 2;
      const phi = Math.acos(2 * pseudoRandom(i * 3.03) - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(pseudoRandom(i * 4.04) * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return [positions, colors];
  }, []);

  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.003;
    }
    if (nebulaSkyboxRef.current) {
      nebulaSkyboxRef.current.rotation.y += delta * 0.001;
    }
  });

  return (
    <group>
      <mesh ref={nebulaSkyboxRef}>
        <sphereGeometry args={[500, 64, 64]} />
        <meshBasicMaterial
          map={skyboxTex}
          side={THREE.BackSide}
          transparent
          opacity={0.95}
        />
      </mesh>

      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={starSprite}
          size={1.8}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
