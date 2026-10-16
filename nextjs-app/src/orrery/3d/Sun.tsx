/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import { createSunCoronaTexture } from '../utils/textureGenerator';
import { TargetReticle } from './TargetReticle';

interface SunProps {
  data: PlanetData;
  isSelected: boolean;
  onSelect: (data: PlanetData) => void;
}

// -----------------------------------------------------------------------------
// 1. Photorealistic Sun Sphere Shaders (Native Single-Pass, Zero CubeCamera)
// -----------------------------------------------------------------------------
const sunSphereVS = `
  varying vec3 vWorld;
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;   
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  uniform float uTime;

  mat2 rot(float a){ float s = sin(a); float c = cos(a); return mat2(c, -s, s, c); }

  void setLayers(vec3 p){
      float t = uTime;

      vec3 p1 = p;
      p1.yz = rot(t) * p1.yz;
      vLayer0 = p1;

      p1 = p;
      p1.zx = rot(t + 2.094) * p1.zx;
      vLayer1 = p1;

      p1 = p;
      p1.xy = rot(t - 4.188) * p1.xy;
      vLayer2 = p1;
  }

  void main(){
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vNormalView = normalize(normalMatrix * normal);
      vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      setLayers(normalize(normal));
      gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const sunSphereFS = `
  precision highp float;

  varying vec3 vWorld;
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;   
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  uniform float uFresnelPower;
  uniform float uFresnelInfluence;
  uniform float uTint;
  uniform float uBase;
  uniform float uBrightnessOffset;
  uniform float uBrightness;

  // GPU-accelerated Simplex 3D Noise - zero render targets, instantaneous 60fps
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
      float v = 0.0;
      v += 0.500 * (snoise(p * 2.5) * 0.5 + 0.5);
      v += 0.250 * (snoise(p * 5.0) * 0.5 + 0.5);
      v += 0.125 * (snoise(p * 10.0) * 0.5 + 0.5);
      return v / 0.875;
  }

  float ocean(){
      float s = 0.0;
      s += fbm(vLayer0 * 1.5);
      s += fbm(vLayer1 * 1.5);
      s += fbm(vLayer2 * 1.5);
      return s * 0.3333333;
  }

  // Rich fiery golden color curve with deep red/amber crust & warm plasma highlights
  vec3 brightnessToColor(float b){
    b *= uTint;
    float r = b;
    float g = pow(b, 2.2) * 0.65;
    float b_chan = pow(b, 4.5) * 0.3;
    return (vec3(r, g, b_chan) / uTint) * uBrightness;
  }

  void main(){
      vec3 Vview = normalize((viewMatrix * vec4(vWorld - cameraPosition, 0.0)).xyz);
      float nDotV = dot(vNormalView, -Vview);
      float fresnel = pow(1.0 - max(0.0, nDotV), uFresnelPower) * uFresnelInfluence;

      float brightness = ocean() * uBase + uBrightnessOffset + fresnel;
      vec3 col = clamp(brightnessToColor(brightness), 0.0, 1.0);

      gl_FragColor = vec4(col, 1.0);
  }
`;

// -----------------------------------------------------------------------------
// 2. Coronal Halo Glow Shaders (Warm Fiery Solar Atmospheric Aura)
// -----------------------------------------------------------------------------
const glowVS = `
  attribute vec3 aPos;

  varying float vRadial;
  varying vec3 vWorld;

  uniform mat4 uViewProjection;
  uniform float uRadius;

  uniform vec3 uCamUp;
  uniform vec3 uCamPos;

  void main(void){
    vRadial = aPos.z;
    vec3 side = normalize(cross(normalize(-uCamPos), uCamUp));
    vec3 p = aPos.x * side + aPos.y * uCamUp;
    p *= 1.0 + aPos.z * uRadius;
    vec4 world = vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = uViewProjection * world;
  }
`;

const glowFS = `
  precision highp float;

  varying float vRadial;
  varying vec3 vWorld;

  uniform float uFalloffColor;
  uniform float uTint;
  uniform float uBrightness;

  vec3 brightnessToColor(float b){
    b *= uTint;
    float r = b;
    float g = pow(b, 2.0) * 0.55;
    float b_chan = pow(b, 4.0) * 0.2;
    return (vec3(r, g, b_chan) / (uTint)) * uBrightness;
  }

  void main(void){
      float alpha = (1.0 - vRadial);
      alpha *= alpha;
      float brightness = 1.0 + alpha * uFalloffColor;
      gl_FragColor.xyz = brightnessToColor(brightness) * alpha;
      gl_FragColor.w = alpha;
  }
`;

const createGlowGeometry = (rSphere: number, segments = 134) => {
  const positions = new Float32Array(3 * (2 * segments));
  let r = 0;
  for (let a = 0; a < segments; a++) {
    const s = (a / segments) * Math.PI * 2;
    const sx = Math.sin(s) * rSphere;
    const sy = Math.cos(s) * rSphere;
    positions[r++] = sx;
    positions[r++] = sy;
    positions[r++] = 0;
    positions[r++] = sx;
    positions[r++] = sy;
    positions[r++] = 1;
  }
  const indices = new Uint16Array(2 * segments * 3);
  let o = 0;
  for (let a = 0; a < segments; a++) {
    const i0 = 2 * a;
    const i1 = 2 * a + 1;
    const i2 = 2 * ((a + 1) % segments);
    const i3 = i2 + 1;
    indices[o++] = i0;
    indices[o++] = i1;
    indices[o++] = i2;
    indices[o++] = i2;
    indices[o++] = i1;
    indices[o++] = i3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aPos', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
};

// -----------------------------------------------------------------------------
// 3. Main Sun React Component
// -----------------------------------------------------------------------------
export const Sun: React.FC<SunProps> = ({ data, isSelected, onSelect }) => {
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = React.useState(false);
  const { camera } = useThree();

  const coronaTexture = useMemo(() => createSunCoronaTexture(), []);

  // Main Sun Sphere Shader Material
  const sunMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sunSphereVS,
      fragmentShader: sunSphereFS,
      transparent: false,
      depthWrite: true,
      uniforms: {
        uTime: { value: 0 },
        uFresnelPower: { value: 1.0 },
        uFresnelInfluence: { value: 0.8 },
        uTint: { value: 0.18 },
        uBase: { value: 4.2 },
        uBrightnessOffset: { value: 1.0 },
        uBrightness: { value: 0.65 },
      },
    });
  }, []);
  const sunMaterialRef = useRef(sunMaterial);

  // Glow Halo Material & Geometry
  const glowGeo = useMemo(() => createGlowGeometry(data.radius * 0.99), [data.radius]);
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uViewProjection: { value: new THREE.Matrix4() },
        uRadius: { value: 0.45 },
        uTint: { value: 0.35 },
        uBrightness: { value: 1.1 },
        uFalloffColor: { value: 0.6 },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamPos: { value: new THREE.Vector3() },
      },
    });
  }, []);

  // Dispose materials and geometries on unmount to prevent leaks
  useEffect(() => {
    return () => {
      sunMaterial.dispose();
      glowMaterial.dispose();
      glowGeo.dispose();
      coronaTexture.dispose();
    };
  }, [sunMaterial, glowMaterial, glowGeo, coronaTexture]);

  // Fast, lightweight 60fps render loop
  useFrame((state, delta) => {
    const time = (state.clock && typeof state.clock.getElapsedTime === 'function')
      ? state.clock.getElapsedTime()
      : (typeof performance !== 'undefined' ? performance.now() * 0.001 : 0);

    // Update Main Sun Sphere
    sunMaterialRef.current.uniforms.uTime.value = time * 0.25;
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += data.rotationSpeed * delta * 15;
    }

    // Camera matrices for coronal billboard halo
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const viewMatrix = camera.matrixWorldInverse;
    const viewProjMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    glowMaterial.uniforms.uViewProjection.value.copy(viewProjMatrix);
    glowMaterial.uniforms.uCamPos.value.copy(camPos);
    glowMaterial.uniforms.uCamUp.value.copy(camUp);

    if (spriteRef.current) {
      const pulse = 1 + Math.sin(time * 2.0) * 0.03;
      spriteRef.current.scale.set(data.radius * 3.6 * pulse, data.radius * 3.6 * pulse, 1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* High-Intensity Sun Point Light illuminating all planets */}
      <pointLight
        color="#fff2d6"
        intensity={9.0}
        distance={500}
        decay={0.15}
      />
      <ambientLight intensity={0.2} />

      {/* Main Dynamic Fiery Sun Sphere Mesh */}
      <mesh
        ref={sunMeshRef}
        material={sunMaterial}
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
        <sphereGeometry args={[data.radius, 48, 48]} />
      </mesh>

      {/* Coronal Halo Glow Mesh */}
      <mesh material={glowMaterial} geometry={glowGeo} frustumCulled={false} renderOrder={2} />

      {/* Seamless Soft Sun Corona Billboard Sprite */}
      <sprite ref={spriteRef} scale={[data.radius * 3.6, data.radius * 3.6, 1]} renderOrder={3}>
        <spriteMaterial
          map={coronaTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.85}
        />
      </sprite>

      {/* Target Reticle Overlay on Hover or Selected */}
      {(hovered || isSelected) && (
        <TargetReticle
          planetName={data.name}
          distanceStr="CENTER STAR"
          isSelected={isSelected}
        />
      )}
    </group>
  );
};
