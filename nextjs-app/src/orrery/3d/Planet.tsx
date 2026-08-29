import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import {
  CDN_TEXTURES,
  getSmartTexture,
  createMercuryTexture,
  createVenusTexture,
  createEarthTexture,
  createEarthCloudTexture,
  createEarthSpecularMap,
  createEarthBumpMap,
  createMoonTexture,
  createMarsTexture,
  createJupiterTexture,
  createSaturnTexture,
  createSaturnRingsTexture,
  createUranusTexture,
  createNeptuneTexture,
} from '../utils/textureGenerator';
import { TargetReticle } from './TargetReticle';

interface PlanetProps {
  data: PlanetData;
  timeMultiplier: number;
  isPaused: boolean;
  isSelected: boolean;
  onSelect: (data: PlanetData) => void;
}

export const Planet: React.FC<PlanetProps> = ({
  data,
  timeMultiplier,
  isPaused,
  isSelected,
  onSelect,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const [hovered, setHovered] = useState(false);
  const angleRef = useRef<number>(Math.random() * Math.PI * 2);

  // Smart texture loader with CDN & Procedural fallback
  const texture = useMemo(() => {
    switch (data.textureType) {
      case 'mercury':
        return getSmartTexture('mercury', CDN_TEXTURES.mercury, createMercuryTexture);
      case 'venus':
        return getSmartTexture('venus', CDN_TEXTURES.venus, createVenusTexture);
      case 'earth':
        return getSmartTexture('earth', CDN_TEXTURES.earth, createEarthTexture);
      case 'moon':
        return getSmartTexture('moon', CDN_TEXTURES.moon, createMoonTexture);
      case 'mars':
        return getSmartTexture('mars', CDN_TEXTURES.mars, createMarsTexture);
      case 'jupiter':
        return getSmartTexture('jupiter', CDN_TEXTURES.jupiter, createJupiterTexture);
      case 'saturn':
        return getSmartTexture('saturn', CDN_TEXTURES.saturn, createSaturnTexture);
      case 'uranus':
        return getSmartTexture('uranus', CDN_TEXTURES.uranus, createUranusTexture);
      case 'neptune':
        return getSmartTexture('neptune', CDN_TEXTURES.neptune, createNeptuneTexture);
      default:
        return getSmartTexture('mercury', CDN_TEXTURES.mercury, createMercuryTexture);
    }
  }, [data.textureType]);

  // Earth bump & specular maps
  const earthSpecularMap = useMemo(() => {
    if (data.id === 'earth') {
      return getSmartTexture('earthSpecular', CDN_TEXTURES.earthSpecular, createEarthSpecularMap);
    }
    return null;
  }, [data.id]);

  const earthBumpMap = useMemo(() => {
    if (data.id === 'earth') {
      return getSmartTexture('earthNormal', CDN_TEXTURES.earthNormal, createEarthBumpMap);
    }
    return null;
  }, [data.id]);

  const earthCloudsTexture = useMemo(() => {
    if (data.id === 'earth') {
      return getSmartTexture('earthClouds', CDN_TEXTURES.earthClouds, createEarthCloudTexture);
    }
    return null;
  }, [data.id]);

  const moonTexture = useMemo(() => {
    if (data.id === 'earth') {
      return getSmartTexture('moon', CDN_TEXTURES.moon, createMoonTexture);
    }
    return null;
  }, [data.id]);

  const saturnRingsTexture = useMemo(() => {
    if (data.hasRings) {
      return getSmartTexture('saturnRings', CDN_TEXTURES.saturnRings, createSaturnRingsTexture);
    }
    return null;
  }, [data.hasRings]);

  // Concentrically re-mapped RingGeometry for Saturn's Rings
  const ringGeometry = useMemo(() => {
    if (!data.hasRings) return null;
    const innerR = data.ringInnerRadius || data.radius * 1.4;
    const outerR = data.ringOuterRadius || data.radius * 2.55;
    const geo = new THREE.RingGeometry(innerR, outerR, 128, 32);

    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const distance = Math.sqrt(x * x + y * y);
      const u = (distance - innerR) / (outerR - innerR);
      const angle = Math.atan2(y, x);
      const v = (angle + Math.PI) / (Math.PI * 2);
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;
    return geo;
  }, [data.hasRings, data.ringInnerRadius, data.ringOuterRadius, data.radius]);

  useFrame((_, delta) => {
    // Orbital rotation around the Sun
    if (!isPaused) {
      angleRef.current += data.orbitSpeed * timeMultiplier * delta;
    }

    const currentDistance = data.distanceFromSunAU;
    const x = Math.cos(angleRef.current) * currentDistance;
    const z = Math.sin(angleRef.current) * currentDistance;

    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
    }

    // Planet self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed * delta * 60;
    }

    // Earth Clouds rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += data.rotationSpeed * 1.25 * delta * 60;
    }

    // Earth's Moon orbit
    if (moonRef.current) {
      const moonAngle = angleRef.current * 4;
      moonRef.current.position.set(Math.cos(moonAngle) * 2.8, 0.2, Math.sin(moonAngle) * 2.8);
      moonRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Planet Sphere Mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
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
          map={texture}
          roughness={data.id === 'earth' ? 0.5 : 0.8}
          metalness={0.1}
          roughnessMap={earthSpecularMap || undefined}
          bumpMap={earthBumpMap || undefined}
          bumpScale={0.05}
          emissive={hovered || isSelected ? new THREE.Color(data.color).multiplyScalar(0.25) : new THREE.Color(0x000000)}
        />
      </mesh>

      {/* Earth Cloud Layer */}
      {data.id === 'earth' && earthCloudsTexture && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[data.radius * 1.02, 64, 64]} />
          <meshStandardMaterial
            map={earthCloudsTexture}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Earth's Orbiting Moon */}
      {data.id === 'earth' && moonTexture && (
        <mesh
          ref={moonRef}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            const moonData = {
              id: 'moon',
              name: 'THE MOON',
              tagline: 'Earth\'s Natural Satellite',
              type: 'moon' as const,
              radius: 0.5,
              realRadiusKm: 1737,
              distanceFromSunAU: 15.5,
              orbitSpeed: 0,
              rotationSpeed: 0.003,
              color: '#ffffff',
              textureType: 'moon' as const,
              atmosphere: [
                { gas: 'Helium', formula: 'He', percentage: 29, color: '#ffaa00' },
                { gas: 'Neon', formula: 'Ne', percentage: 29, color: '#ff3366' },
                { gas: 'Argon', formula: 'Ar', percentage: 20, color: '#aa55ff' },
              ],
              temperature: { average: '-20°C', high: '120°C', low: '-130°C' },
              distanceFromEarth: '384,400 km',
              distanceFromSun: '149.6 Million km',
              orbitalPeriod: '27.3 Days',
              rotationPeriod: '27.3 Days',
              moonsCount: 0,
              gravity: '1.62 m/s²',
              description: 'Earth\'s natural satellite with heavily cratered highland terrain and dark lunar maria.',
              observationTip: 'Best viewed near first quarter phase when crater rims throw long shadows.',
              bortleRecommended: 'Bortle 1 - 9',
            };
            onSelect(moonData);
          }}
        >
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial map={moonTexture} roughness={0.9} />
        </mesh>
      )}

      {/* Saturn 3D Rings Mesh Tilted at ~26.7 degrees (0.466 rad) */}
      {data.hasRings && saturnRingsTexture && ringGeometry && (
        <mesh
          geometry={ringGeometry}
          rotation={[Math.PI / 2, 0, 0.466]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={saturnRingsTexture}
            alphaMap={saturnRingsTexture}
            side={THREE.DoubleSide}
            transparent
            opacity={0.95}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Target Reticle Overlay on Hover / Click */}
      {(hovered || isSelected) && (
        <TargetReticle
          planetName={data.name}
          distanceStr={data.distanceFromEarth}
          isSelected={isSelected}
          isHovered={hovered}
        />
      )}
    </group>
  );
};
