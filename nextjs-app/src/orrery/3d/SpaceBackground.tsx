import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Generate circular star sprite texture so star particles are round and soft
function createStarParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(200, 225, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(100, 160, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

// Generate high-resolution cosmic nebula texture for the skybox dome
function createNebulaSkyboxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep cosmic background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#02030a');
  bgGrad.addColorStop(0.3, '#060919');
  bgGrad.addColorStop(0.7, '#080d24');
  bgGrad.addColorStop(1, '#010208');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft glowing nebula dust clouds
  const nebulaClouds = [
    { x: 500, y: 350, r: 500, color: 'rgba(91, 33, 182, 0.42)' },  // Deep Purple
    { x: 1400, y: 700, r: 600, color: 'rgba(14, 116, 144, 0.38)' }, // Cyan Teal
    { x: 1000, y: 300, r: 450, color: 'rgba(126, 34, 206, 0.32)' }, // Violet
    { x: 1700, y: 250, r: 550, color: 'rgba(190, 24, 93, 0.25)' },  // Deep Magenta
    { x: 300, y: 800, r: 400, color: 'rgba(29, 78, 216, 0.35)' },  // Deep Blue
  ];

  nebulaClouds.forEach(({ x, y, r, color }) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.15)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  // Add subtle distant star dust particles directly onto skybox
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 800; i++) {
    const sx = Math.random() * canvas.width;
    const sy = Math.random() * canvas.height;
    const sr = Math.random() * 1.5;
    const alpha = Math.random() * 0.7 + 0.3;
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

  // Generate 6000 multi-depth background stars
  const [starPositions, starColors, starSizes] = useMemo(() => {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#b3d9ff'),
      new THREE.Color('#ffd9a6'),
      new THREE.Color('#a6ffff'),
      new THREE.Color('#e6ccff'),
    ];

    for (let i = 0; i < count; i++) {
      const r = 200 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 2.2 + 0.8;
    }

    return [positions, colors, sizes];
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
      {/* High-Resolution Deep Space Cosmic Nebula Skybox Dome */}
      <mesh ref={nebulaSkyboxRef}>
        <sphereGeometry args={[500, 64, 64]} />
        <meshBasicMaterial
          map={skyboxTex}
          side={THREE.BackSide}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Round Luminous Starfield Particles */}
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

