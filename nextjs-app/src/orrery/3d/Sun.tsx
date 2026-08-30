import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import {
  createSunTexture,
  createSunCoronaTexture,
  getSmartTexture,
  CDN_TEXTURES,
} from '../utils/textureGenerator';
import { TargetReticle } from './TargetReticle';

interface SunProps {
  data: PlanetData;
  isSelected: boolean;
  onSelect: (data: PlanetData) => void;
}

export const Sun: React.FC<SunProps> = ({ data, isSelected, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = React.useState(false);

  const sunTexture = useMemo(
    () => getSmartTexture('sun', CDN_TEXTURES.sun, createSunTexture),
    []
  );

  const coronaTexture = useMemo(() => createSunCoronaTexture(), []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed * delta * 60;
    }
    if (spriteRef.current) {
      const pulse = 1 + Math.sin(time * 2.5) * 0.03;
      spriteRef.current.scale.set(data.radius * 3.8 * pulse, data.radius * 3.8 * pulse, 1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* High-Intensity Sun Point Light illuminating all planets and casting shadows */}
      <pointLight
        color="#fff4e0"
        intensity={8.5}
        distance={400}
        decay={0.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <ambientLight intensity={0.18} />

      {/* Main Photorealistic Sun Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(data);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[data.radius, 64, 64]} />
        <meshStandardMaterial
          map={sunTexture}
          emissive="#ffaa00"
          emissiveMap={sunTexture}
          emissiveIntensity={3.2}
          roughness={0.15}
        />
      </mesh>

      {/* Seamless Soft Sun Corona Billboard Sprite - Zero hard edges */}
      <sprite ref={spriteRef} scale={[data.radius * 3.8, data.radius * 3.8, 1]}>
        <spriteMaterial
          map={coronaTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.88}
        />
      </sprite>

      {/* Target Reticle Overlay on Hover or Selected */}
      {(hovered || isSelected) && (
        <TargetReticle
          planetName={data.name}
          distanceStr="CENTER STAR"
          isSelected={isSelected}
          isHovered={hovered}
        />
      )}
    </group>
  );
};
