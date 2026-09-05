/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import { TargetReticle } from './TargetReticle';

interface SunProps {
  data: PlanetData;
  isSelected: boolean;
  onSelect: (data: PlanetData) => void;
}

// -----------------------------------------------------------------------------
// 1. Procedural 4D Simplex/Perlin Noise Shaders for Cubemap Generation
// -----------------------------------------------------------------------------
const perlinVS = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const perlinFS = `
  precision highp float;

  varying vec3 vWorld;
  uniform float uTime;
  uniform float uSpatialFrequency;
  uniform float uTemporalFrequency;
  uniform float uH;
  uniform float uContrast;
  uniform float uFlatten;

  #ifndef OCTAVES
  #define OCTAVES 5
  #endif

  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  float mod289(float x){ return x - floor(x * (1.0/289.0)) * 289.0; }

  vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
  float permute(float x){ return mod289(((x * 34.0) + 1.0) * x); }

  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float taylorInvSqrt(float r){ return 1.79284291400159 - 0.85373472095314 * r; }

  vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w   = 1.5 - dot(abs(p.xyz), ones.xyz);
    s     = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
  }

  #define F4 0.309016994374947451

  float snoise(vec4 v) {
    const vec4 C = vec4(
      0.138196601125011,  
      0.276393202250021,  
      0.414589803375032,  
     -0.447213595499958   
    );

    vec4 i  = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);

    vec4 i0;
    vec3 isX  = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);

    i0.x   = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y  += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z  += isYZ.z;
    i0.w  += 1.0 - isYZ.z;

    vec4 i3 = clamp(i0,     0.0, 1.0);
    vec4 i2 = clamp(i0-1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0-2.0, 0.0, 1.0);

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1  = permute(permute(permute(permute(
                 i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
                 + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
                 + i.x + vec4(i1.x, i2.x, i3.x, 1.0));

    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0);

    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));

    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
    m0 = m0 * m0; m1 = m1 * m1;

    return 49.0 * (
      dot(m0*m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2))) +
      dot(m1*m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
  }

  vec2 fbm(vec4 p){
    float a = 1.0;
    float f = 1.0;
    vec2 sum = vec2(0.0);
    for (int i = 0; i < OCTAVES; i++){
        sum.x += snoise(p * f) * a;
        p.w += 100.0;
        sum.y += snoise(p * f) * a;
        a *= uH;
        f *= 2.0;
    }
    return sum;
  }

  void main(){
      vec3 world = normalize(vWorld);
      world += 12.45; 

      vec4 p = vec4(world * uSpatialFrequency, uTime * uTemporalFrequency);
      vec2 f = fbm(p) * uContrast + 0.5;

      vec4 p2 = vec4(world * 2.0, uTime * uTemporalFrequency);
      float modulate = max(snoise(p2), 0.0);
      float x = mix(f.x, f.x * modulate, uFlatten);

      gl_FragColor = vec4(x, f.y, f.y, x); 
  }
`;

// -----------------------------------------------------------------------------
// 2. Main Sun Sphere Shaders (Rich Fiery Orange Plasma Palette)
// -----------------------------------------------------------------------------
const sunSphereVS = `
  varying vec3 vWorld;
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;   
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  uniform float uTime;

  mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

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

  uniform float uVisibility;
  uniform float uDirection;
  uniform vec3  uLightView;

  float getAlpha(vec3 n){
    float nDotL = dot(n, uLightView) * uDirection;
    return smoothstep(1.0, 1.5, nDotL + uVisibility * 2.5);
  }

  varying vec3 vWorld;
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;   
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  uniform samplerCube uPerlinCube;

  uniform float uFresnelPower;
  uniform float uFresnelInfluence;
  uniform float uTint;
  uniform float uBase;
  uniform float uBrightnessOffset;
  uniform float uBrightness;

  // Rich fiery orange color curve with deep red crust & warm golden plasma highlights
  vec3 brightnessToColor(float b){
    b *= uTint;
    float r = b;
    float g = pow(b, 2.2) * 0.65;
    float b_chan = pow(b, 4.5) * 0.3;
    return (vec3(r, g, b_chan) / uTint) * uBrightness;
  }

  float ocean(){
      float s = 0.0;
      s += textureCube(uPerlinCube, vLayer0).r;
      s += textureCube(uPerlinCube, vLayer1).r;
      s += textureCube(uPerlinCube, vLayer2).r;
      return s * 0.3333333;
  }

  void main(){
      vec3 Vview = normalize((viewMatrix * vec4(vWorld - cameraPosition, 0.0)).xyz);
      float nDotV = dot(vNormalView, -Vview);
      float fresnel = pow(1.0 - nDotV, uFresnelPower) * uFresnelInfluence;

      float brightness = ocean() * uBase + uBrightnessOffset + fresnel;
      vec3 col = clamp(brightnessToColor(brightness), 0.0, 1.0);
      float a = getAlpha(normalize(vNormalWorld));

      gl_FragColor = vec4(col, a);
  }
`;

// -----------------------------------------------------------------------------
// 3. Coronal Halo Glow Shaders (Warm Fiery Coronal Aura)
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

  uniform float uVisibility;
  uniform float uDirection;
  uniform vec3  uLightView;

  float getAlpha(vec3 n){
    float nDotL = dot(n, uLightView) * uDirection;
    return smoothstep(1.0, 1.5, nDotL + uVisibility * 2.5);
  }

  varying float vRadial;
  varying vec3 vWorld;

  uniform float uTint;
  uniform float uBrightness;
  uniform float uFalloffColor;

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
      alpha *= getAlpha(normalize(vWorld));
      gl_FragColor.xyz = brightnessToColor(brightness) * alpha;
      gl_FragColor.w = alpha;
  }
`;

// -----------------------------------------------------------------------------
// 4. Magma Ribbon Solar Flares Shaders
// -----------------------------------------------------------------------------
const sunFlaresVS = `
  #ifdef GL_ES
  precision highp float;
  #endif

  attribute vec3 aPos;         
  attribute vec3 aPos0;        
  attribute vec3 aPos1;        
  attribute vec4 aWireRandom;  

  varying float vUVY;
  varying float vOpacity;
  varying vec3  vColor;
  varying vec3  vNormal;       

  uniform float uWidth;
  uniform float uAmp;
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform vec3  uCamPos;       
  uniform mat4  uViewProjection;
  uniform float uOpacity;
  uniform float uHueSpread;
  uniform float uHue;

  #define m4  mat4( 0.00, 0.80, 0.60, -0.4, \
                   -0.80, 0.36, -0.48, -0.5, \
                   -0.60, -0.48, 0.64, 0.2,  \
                    0.40, 0.30, 0.20, 0.4)

  vec4 twistedSineNoise(vec4 q, float falloff){
    float a = 1.0;
    float f = 1.0;
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) {
      q = m4 * q;
      vec4 s = sin(q.ywxz * f) * a;
      q += s;
      sum += s;
      a *= falloff;
      f /= falloff;
    }
    return sum;
  }

  vec3 getPosOBJ(float phase, float animPhase){
    float size = distance(aPos0, aPos1);
    vec3  n    = normalize((aPos0 + aPos1) * 0.5);
    vec3 p = mix(aPos0, aPos1, phase);
    float amp = sin(phase * 3.14159265) * size * uAmp;
    amp *= animPhase;
    p += n * amp;
    p += twistedSineNoise(vec4(p * uNoiseFrequency, uTime), 0.707).xyz * (amp * uNoiseAmplitude);
    return p;
  }

  #define hue(v) ( .6 + .6 * cos( 6.3*(v) + vec3(-0.4, 22.8, 20.8) ) )

  void main(void){
    vUVY = aPos.z;
    float animPhase = fract(uTime * 0.3 * (aWireRandom.y * 0.5) + aWireRandom.x);

    vec3 pOBJ  = getPosOBJ(aPos.x,        animPhase);
    vec3 p1OBJ = getPosOBJ(aPos.x + 0.01, animPhase);

    vec3 pW  = (modelMatrix * vec4(pOBJ , 1.0)).xyz;
    vec3 p1W = (modelMatrix * vec4(p1OBJ, 1.0)).xyz;

    vec3 dirW  = normalize(p1W - pW);
    vec3 vW    = normalize(pW - uCamPos);
    vec3 sideW = normalize(cross(vW, dirW));

    float R = length(aPos0);
    float width = uWidth * aPos.z * (1.0 + animPhase) * R;
    pW += sideW * width;
    vNormal  = normalize(pW);

    float lenW = length(pW);
    vOpacity  = smoothstep(R, R * 1.03, lenW);
    vOpacity *= (1.0 - animPhase);
    vOpacity *= uOpacity;

    vColor = hue(aWireRandom.w * uHueSpread + uHue);

    gl_Position = uViewProjection * vec4(pW, 1.0);
  }
`;

const sunFlaresFS = `
  #ifdef GL_ES
  precision highp float;
  #endif

  uniform float uVisibility;
  uniform float uDirection;
  uniform vec3  uLightView;

  float getAlpha(vec3 n){
    float nDotL = dot(n, uLightView) * uDirection;
    return smoothstep(1.0, 1.5, nDotL + uVisibility * 2.5);
  }

  varying float vUVY;
  varying float vOpacity;
  varying vec3  vColor;
  varying vec3  vNormal;

  uniform float uAlphaBlended;

  void main(void){
      float alpha = smoothstep(1.0, 0.0, abs(vUVY));
      alpha *= alpha;
      alpha *= vOpacity;
      alpha *= getAlpha(vNormal);  

      gl_FragColor = vec4(vColor * alpha, alpha * uAlphaBlended);
  }
`;

// -----------------------------------------------------------------------------
// 5. Radial Solar Rays Shaders
// -----------------------------------------------------------------------------
const sunRaysVS = `
  attribute vec3 aPos;
  attribute vec3 aPos0;
  attribute vec4 aWireRandom;

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;

  uniform float uHueSpread;
  uniform float uHue;
  uniform float uLength;
  uniform float uWidth;
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform vec3  uCamPos;
  uniform mat4  uViewProjection;
  uniform float uOpacity;

  #define m4  mat4( 0.00, 0.80, 0.60, -0.4, -0.80,  0.36, -0.48, -0.5, -0.60, -0.48, 0.64, 0.2, 0.40, 0.30, 0.20,0.4)

  vec4 twistedSineNoise(vec4 q, float falloff)
  {
      float a = 1.;
      float f = 1.;
      vec4 sum = vec4(0);
      for (int i = 0; i < 4; i++) {
          q = m4 * q;
          vec4 s = sin(q.ywxz * f) * a;
          q += s;
          sum += s;
          a *= falloff;
          f /= falloff;
      }
      return sum;
  }

  vec3 getPos(float phase, float animPhase)
  {
      float size = aWireRandom.z + 0.2;
      float d = phase * uLength * size;
      vec3 p = aPos0 + aPos0 * d;
      p += twistedSineNoise(vec4(p * uNoiseFrequency, uTime), 0.707).xyz * (d * uNoiseAmplitude);
      return p;
  }

  vec3 spectrum(in float d)
  {
      return smoothstep(0.25, 0., abs(d + vec3(-0.375, -0.5, -0.625)));
  }

  void main(void) {
      vUVY = aPos.z;

      float animPhase = fract(uTime * 0.3 * (aWireRandom.y * 0.5) + aWireRandom.x);

      vec3 p  = getPos(aPos.x,        animPhase);
      vec3 p1 = getPos(aPos.x + 0.01, animPhase);

      vec3 p0w = (modelMatrix * vec4(p , 1.0)).xyz;
      vec3 p1w = (modelMatrix * vec4(p1, 1.0)).xyz;

      vec3 dirW  = normalize(p1w - p0w);
      vec3 vW    = normalize(p0w - uCamPos);
      vec3 sideW = normalize(cross(vW, dirW));

      if (length(sideW) < 1e-6) {
          vec3 up = (abs(dirW.y) < 0.99) ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
          sideW = normalize(cross(up, dirW));
      }

      float width = uWidth * aPos.z * (1.0 - aPos.x);
      vec3 pWorld = p0w + sideW * width;
      vNormal  = normalize(pWorld);

      vOpacity = uOpacity * (0.5 + aWireRandom.w);
      vColor   = spectrum(aWireRandom.w * uHueSpread + uHue);

      gl_Position = uViewProjection * vec4(pWorld, 1.0);
  }
`;

const sunRaysFS = `
  #ifdef GL_ES
  precision highp float;
  #endif

  uniform float uVisibility;
  uniform float uDirection;
  uniform vec3  uLightView;

  float getAlpha(vec3 n){
    float nDotL = dot(n, uLightView) * uDirection;
    return smoothstep(1.0, 1.5, nDotL + uVisibility * 2.5);
  }

  varying float vUVY;
  varying float vOpacity;
  varying vec3  vColor;
  varying vec3  vNormal;

  uniform float uAlphaBlended; 

  void main(void) {
      float alpha = 1.0 - smoothstep(0.0, 1.0, abs(vUVY));
      alpha *= alpha;          
      alpha *= vOpacity;
      alpha *= getAlpha(vNormal);

      gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// -----------------------------------------------------------------------------
// Buffer Geometry Helpers
// -----------------------------------------------------------------------------
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

const createSunFlaresGeometry = (sunRadius: number, lineCount = 2047, lineLength = 16) => {
  const totalVerts = lineCount * lineLength * 2;
  const aPos = new Float32Array(totalVerts * 3);
  const aPos0 = new Float32Array(totalVerts * 3);
  const aPos1 = new Float32Array(totalVerts * 3);
  const aWireRand = new Float32Array(totalVerts * 4);
  const indices = new Uint16Array(lineCount * (lineLength - 1) * 6);

  const held = new THREE.Vector3();
  const d = new THREE.Vector3();
  const f = new THREE.Vector3();
  const p = new THREE.Vector3();
  const g = new THREE.Vector3();

  let s = 0, l = 0, c = 0, h = 0, u = 0;
  f.set(Math.random(), Math.random(), Math.random()).normalize();
  let m = Math.random(), _p = Math.random();

  for (let y = 0; y < lineCount; y++) {
    if (Math.random() < 0.025 || y === 0) {
      d.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      held.copy(d);
      g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.4);
      held.add(g).normalize();
      m = Math.random();
      _p = Math.random();
    }
    f.copy(d);
    g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.02);
    f.add(g).normalize();
    p.copy(held);
    g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.075);
    p.add(g).normalize();

    const rands = [m, _p, Math.random(), Math.random()];
    for (let E = 0; E < lineLength; E++) {
      const baseIdx = 2 * (y * lineLength + E);
      for (let A = 0; A <= 1; A++) {
        aPos[s++] = (E + 0.5) / lineLength;
        aPos[s++] = (y + 0.5) / lineCount;
        aPos[s++] = 2 * A - 1;
        for (let R = 0; R < 4; R++) aWireRand[l++] = rands[R];
        aPos0[c++] = f.x * sunRadius;
        aPos0[c++] = f.y * sunRadius;
        aPos0[c++] = f.z * sunRadius;
        aPos1[h++] = p.x * sunRadius;
        aPos1[h++] = p.y * sunRadius;
        aPos1[h++] = p.z * sunRadius;
      }
      if (E < lineLength - 1) {
        indices[u++] = baseIdx + 0;
        indices[u++] = baseIdx + 1;
        indices[u++] = baseIdx + 2;
        indices[u++] = baseIdx + 2;
        indices[u++] = baseIdx + 1;
        indices[u++] = baseIdx + 3;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aPos', new THREE.BufferAttribute(aPos, 3));
  geo.setAttribute('aPos0', new THREE.BufferAttribute(aPos0, 3));
  geo.setAttribute('aPos1', new THREE.BufferAttribute(aPos1, 3));
  geo.setAttribute('aWireRandom', new THREE.BufferAttribute(aWireRand, 4));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
};

const createSunRaysGeometry = (sunRadius: number, lineCount = 2048, lineLength = 8) => {
  const vertsPerSegment = 2;
  const totalVerts = lineCount * lineLength * vertsPerSegment;
  const aPos = new Float32Array(totalVerts * 3);
  const aPos0 = new Float32Array(totalVerts * 3);
  const aWireRand = new Float32Array(totalVerts * 4);
  const indices = new Uint16Array(lineCount * (lineLength - 1) * 6);

  const base = new THREE.Vector3();
  const jitter = new THREE.Vector3();
  const held = new THREE.Vector3();

  let ip = 0, i0 = 0, ir = 0, ii = 0;

  const randomUnit = (v: THREE.Vector3) => {
    const z = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    v.set(r * Math.cos(t), r * Math.sin(t), z);
    return v;
  };

  let d = Math.random();
  let p = Math.random();

  for (let v = 0; v < lineCount; v++) {
    if (Math.random() < 0.1 || v === 0) {
      randomUnit(held).normalize();
      d = Math.random();
      p = Math.random();
    }
    base.copy(held);
    randomUnit(jitter).multiplyScalar(0.025);
    base.add(jitter).normalize();
    const rands = [d, p, Math.random(), Math.random()];

    for (let m = 0; m < lineLength; m++) {
      const vertBase = 2 * (v * lineLength + m);
      for (let y = 0; y <= 1; y++) {
        aPos[ip++] = (m + 0.5) / lineLength;
        aPos[ip++] = (v + 0.5) / lineCount;
        aPos[ip++] = 2 * y - 1;

        aPos0[i0++] = base.x * sunRadius;
        aPos0[i0++] = base.y * sunRadius;
        aPos0[i0++] = base.z * sunRadius;

        for (let r = 0; r < 4; r++) aWireRand[ir++] = rands[r];
      }

      if (m < lineLength - 1) {
        indices[ii++] = vertBase + 0;
        indices[ii++] = vertBase + 1;
        indices[ii++] = vertBase + 2;
        indices[ii++] = vertBase + 2;
        indices[ii++] = vertBase + 1;
        indices[ii++] = vertBase + 3;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aPos', new THREE.BufferAttribute(aPos, 3));
  geo.setAttribute('aPos0', new THREE.BufferAttribute(aPos0, 3));
  geo.setAttribute('aWireRandom', new THREE.BufferAttribute(aWireRand, 4));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
};

// -----------------------------------------------------------------------------
// Main Sun Component Implementation
// -----------------------------------------------------------------------------
export const Sun: React.FC<SunProps> = ({ data, isSelected, onSelect }) => {
  const { gl, camera } = useThree();
  const sunGroupRef = useRef<THREE.Group>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  // Direction vector used across visibility includes
  const lightDirWorld = useMemo(() => new THREE.Vector3(1, 1, 1).normalize(), []);

  // Perlin Cubemap Render Target & Camera Setup
  const perlinSetup = useMemo(() => {
    const perlinScene = new THREE.Scene();
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });
    const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
    const perlinMat = new THREE.ShaderMaterial({
      vertexShader: perlinVS,
      fragmentShader: perlinFS,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uSpatialFrequency: { value: 6 },
        uTemporalFrequency: { value: 0.1 },
        uH: { value: 1 },
        uContrast: { value: 0.25 },
        uFlatten: { value: 0.72 },
      },
    });
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const perlinBox = new THREE.Mesh(boxGeo, perlinMat);
    perlinScene.add(perlinBox);

    return { perlinScene, cubeRT, cubeCam, perlinMat };
  }, []);

  // Dispose WebGL target on unmount
  useEffect(() => {
    return () => {
      perlinSetup.cubeRT.dispose();
    };
  }, [perlinSetup]);

  // Main Sun Sphere Shader Material
  const sunMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sunSphereVS,
      fragmentShader: sunSphereFS,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.NormalBlending,
      depthWrite: true,
      uniforms: {
        uTime: { value: 0 },
        uPerlinCube: { value: perlinSetup.cubeRT.texture },
        uFresnelPower: { value: 1.0 },
        uFresnelInfluence: { value: 0.8 },
        uTint: { value: 0.18 },
        uBase: { value: 4.2 },
        uBrightnessOffset: { value: 1.0 },
        uBrightness: { value: 0.65 },
        uVisibility: { value: 1.0 },
        uDirection: { value: 1.0 },
        uLightView: { value: lightDirWorld },
      },
    });
  }, [perlinSetup, lightDirWorld]);

  // Glow Halo Material & Geometry
  const glowGeo = useMemo(() => createGlowGeometry(data.radius * 0.99), [data.radius]);
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uViewProjection: { value: new THREE.Matrix4() },
        uRadius: { value: 0.4 },
        uTint: { value: 0.35 },
        uBrightness: { value: 1.1 },
        uFalloffColor: { value: 0.6 },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamPos: { value: new THREE.Vector3() },
        uVisibility: { value: 1.0 },
        uDirection: { value: 1.0 },
        uLightView: { value: lightDirWorld },
      },
    });
  }, [lightDirWorld]);

  // Magma Ribbon Prominence Solar Flares
  const flaresGeo = useMemo(() => createSunFlaresGeometry(data.radius * 0.99, 2047, 16), [data.radius]);
  const flaresMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sunFlaresVS,
      fragmentShader: sunFlaresFS,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uViewProjection: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uWidth: { value: 0.005 },
        uAmp: { value: 0.5 },
        uNoiseFrequency: { value: 4.0 },
        uNoiseAmplitude: { value: 0.2 },
        uOpacity: { value: 0.2 },
        uHueSpread: { value: 0.16 },
        uHue: { value: 0.0 },
        uAlphaBlended: { value: 0.65 },
        uLightView: { value: lightDirWorld },
        uVisibility: { value: 1.0 },
        uDirection: { value: 1.0 },
      },
    });
  }, [lightDirWorld]);

  // Solar Corona Rays
  const raysGeo = useMemo(() => createSunRaysGeometry(data.radius * 0.99, 2048, 8), [data.radius]);
  const raysMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sunRaysVS,
      fragmentShader: sunRaysFS,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uViewProjection: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uLength: { value: 0.45 },
        uWidth: { value: 0.03 },
        uNoiseFrequency: { value: 8.0 },
        uNoiseAmplitude: { value: 0.4 },
        uOpacity: { value: 0.03 },
        uHueSpread: { value: 0.2 },
        uHue: { value: 0.0 },
        uAlphaBlended: { value: 0.3 },
        uLightView: { value: lightDirWorld },
        uVisibility: { value: 1.0 },
        uDirection: { value: 1.0 },
      },
    });
  }, [lightDirWorld]);

  // Render loop update with explicit immutability suppression for Three.js WebGL uniforms
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Update Perlin Noise Cubemap
    perlinSetup.perlinMat.uniforms.uTime.value = time * 0.1;
    perlinSetup.cubeCam.update(gl, perlinSetup.perlinScene);

    // 2. Update Main Sun Sphere
    sunMaterial.uniforms.uTime.value = time;
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += data.rotationSpeed * delta * 15;
    }

    // Camera matrices for billboard & projection calculations
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    const viewMatrix = camera.matrixWorldInverse;
    const viewProjMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);

    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    // 3. Update Coronal Halo Glow
    glowMaterial.uniforms.uViewProjection.value.copy(viewProjMatrix);
    glowMaterial.uniforms.uCamPos.value.copy(camPos);
    glowMaterial.uniforms.uCamUp.value.copy(camUp);

    // 4. Update Magma Ribbon Flares
    flaresMaterial.uniforms.uViewProjection.value.copy(viewProjMatrix);
    flaresMaterial.uniforms.uCamPos.value.copy(camPos);
    flaresMaterial.uniforms.uTime.value = time;

    // 5. Update Corona Rays
    raysMaterial.uniforms.uViewProjection.value.copy(viewProjMatrix);
    raysMaterial.uniforms.uCamPos.value.copy(camPos);
    raysMaterial.uniforms.uTime.value = time;
  });

  return (
    <group ref={sunGroupRef} position={[0, 0, 0]}>
      {/* Dynamic Solar Illumination Light Source */}
      <pointLight
        color="#fff2d6"
        intensity={10.0}
        distance={500}
        decay={0.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <ambientLight intensity={0.25} />

      {/* Main Multi-Layer Dynamic Sun Sphere Mesh */}
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
        <sphereGeometry args={[data.radius, 64, 64]} />
      </mesh>

      {/* Coronal Halo Glow Mesh */}
      <mesh material={glowMaterial} geometry={glowGeo} frustumCulled={false} renderOrder={2} />

      {/* Magma Ribbon Solar Prominence Flares */}
      <mesh material={flaresMaterial} geometry={flaresGeo} frustumCulled={false} renderOrder={1} />

      {/* Radial Solar Corona Rays */}
      <mesh material={raysMaterial} geometry={raysGeo} frustumCulled={false} renderOrder={3} />

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
