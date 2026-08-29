import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbitRingProps {
  radius: number;
  speed?: number;
}

export const OrbitRing: React.FC<OrbitRingProps> = ({ radius, speed = 0.2 }) => {
  const cometRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef<number>((radius * 1.5) % (Math.PI * 2));

  const lineMesh = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x418dff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geometry, material);
  }, [radius]);

  useFrame((_, delta) => {
    angleRef.current += (speed / (radius * 0.1)) * delta;
    if (cometRef.current) {
      const x = Math.cos(angleRef.current) * radius;
      const z = Math.sin(angleRef.current) * radius;
      cometRef.current.position.set(x, 0, z);
    }
  });

  return (
    <group>
      {/* Glowing Orbit Path Line */}
      <primitive object={lineMesh} />

      {/* Orbit Comet Particle */}
      <mesh ref={cometRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial
          color="#a0c8ff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};


