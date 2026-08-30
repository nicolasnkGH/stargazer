import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// Cache loaded textures to avoid recreate/re-fetch overhead
const textureCache = new Map<string, THREE.Texture>();

// Helper for smooth noise blending
function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amplitude = 1.0;
  let frequency = 1.0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * (noise2D(x * frequency, y * frequency) + 1) / 2;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}

// CDN Image URLs for Photorealistic Solar System Assets (b-cdn / SolarSystemScope / Three.js)
export const CDN_TEXTURES = {
  sun: '/textures/2k_sun.webp',
  mercury: '/textures/mercury.webp',
  venus: '/textures/venus.webp',
  earth: '/textures/2k_earth_daymap.webp',
  earthSpecular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_specular_2048.jpg',
  earthNormal: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_normal_2048.jpg',
  earthClouds: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_1024.png',
  moon: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/moon_1024.jpg',
  mars: '/textures/mars.webp',
  jupiter: '/textures/jupiter.webp',
  saturn: '/textures/saturn.webp',
  saturnRings: '/textures/saturn_ring_color.webp',
  uranus: '/textures/uranus.webp',
  neptune: '/textures/neptune.webp',
};

/**
 * Generates a seamless, ultra-soft radial corona sprite texture with 0 hard edges
 */
export function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0.0, 'rgba(255, 250, 230, 1.0)');
  gradient.addColorStop(0.18, 'rgba(255, 180, 50, 0.85)');
  gradient.addColorStop(0.42, 'rgba(255, 100, 10, 0.4)');
  gradient.addColorStop(0.7, 'rgba(200, 40, 0, 0.12)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Loads a texture from CDN with instant procedural fallback if network or CORS fails
 */
export function getSmartTexture(key: string, cdnUrl: string, proceduralFallback: () => THREE.Texture): THREE.Texture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  // Generate fallback first so scene renders instantly
  const fallbackTexture = proceduralFallback();
  textureCache.set(key, fallbackTexture);

  // Attempt async CDN fetch
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';

  loader.load(
    cdnUrl,
    (loadedTex) => {
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.needsUpdate = true;
      // Copy loaded image onto cached texture or swap
      fallbackTexture.image = loadedTex.image;
      fallbackTexture.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn(`[StarGazer] CDN Texture load failed for ${key}, using procedural shader fallback.`, err);
    }
  );

  return fallbackTexture;
}

export function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const nx = Math.cos(u * Math.PI * 2) * 2;
      const ny = Math.sin(v * Math.PI) * 2;
      const nz = Math.sin(u * Math.PI * 2) * 2;

      const n = fbm(nx * 3, ny * 3 + nz * 3, 5);
      const n2 = fbm(nx * 6 + 10, ny * 6, 3);

      const idx = (y * canvas.width + x) * 4;
      const intensity = Math.min(1, Math.max(0, n * 0.7 + n2 * 0.4));

      let r = 255;
      let g = Math.floor(180 * intensity + 70);
      let b = Math.floor(40 * Math.pow(intensity, 2));

      if (n > 0.78 && n2 < 0.35) {
        r = 60;
        g = 20;
        b = 10;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createMercuryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const n1 = fbm(u * 8, v * 8, 4);
      const n2 = fbm(u * 20, v * 20, 3);

      const base = Math.floor(110 + n1 * 80 + n2 * 30);
      const idx = (y * canvas.width + x) * 4;

      data[idx] = base;
      data[idx + 1] = Math.floor(base * 0.95);
      data[idx + 2] = Math.floor(base * 0.9);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  for (let i = 0; i < 180; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = Math.random() * 12 + 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

export function createVenusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const swirl = fbm(u * 5 + fbm(u * 3, v * 3), v * 5, 5);
      const idx = (y * canvas.width + x) * 4;

      data[idx] = Math.floor(220 + swirl * 35);
      data[idx + 1] = Math.floor(185 + swirl * 30);
      data[idx + 2] = Math.floor(125 + swirl * 20);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const landVal = fbm(u * 4, v * 4, 5);
      const idx = (y * canvas.width + x) * 4;

      let r = 20, g = 60, b = 160;

      if (v < 0.1 || v > 0.9) {
        r = 240; g = 245; b = 255;
      } else if (landVal > 0.48) {
        if (landVal > 0.62) {
          r = 180; g = 150; b = 90;
        } else {
          r = 40; g = 130; b = 50;
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthSpecularMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const landVal = fbm(u * 4, v * 4, 5);
      const idx = (y * canvas.width + x) * 4;

      // Oceans reflect light brightly (white = specular 255), land is dark (0)
      const spec = landVal <= 0.48 && v >= 0.1 && v <= 0.9 ? 230 : 10;

      data[idx] = spec;
      data[idx + 1] = spec;
      data[idx + 2] = spec;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const heightVal = Math.floor(fbm(u * 8, v * 8, 4) * 255);
      const idx = (y * canvas.width + x) * 4;

      data[idx] = heightVal;
      data[idx + 1] = heightVal;
      data[idx + 2] = heightVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const cloudNoise = fbm(u * 6 + fbm(u * 2, v * 2), v * 6, 4);
      const idx = (y * canvas.width + x) * 4;

      const alpha = cloudNoise > 0.52 ? Math.floor((cloudNoise - 0.52) * 5 * 255) : 0;

      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.min(240, alpha);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const n = fbm(u * 8, v * 8, 4);
      const maria = fbm(u * 3, v * 3, 3);

      let val = 180 + n * 60;
      if (maria > 0.55) {
        val -= 70;
      }

      const idx = (y * canvas.width + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const n = fbm(u * 6, v * 6, 5);
      const darkRegion = fbm(u * 3 + 12, v * 3, 3);

      const idx = (y * canvas.width + x) * 4;

      let r = Math.floor(190 + n * 50);
      let g = Math.floor(75 + n * 30);
      let b = Math.floor(40 + n * 20);

      if (darkRegion > 0.58) {
        r = Math.floor(r * 0.55);
        g = Math.floor(g * 0.55);
        b = Math.floor(b * 0.55);
      }

      if (v < 0.08 || v > 0.92) {
        r = 245; g = 245; b = 250;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const wave = Math.sin(v * Math.PI * 18 + fbm(u * 8, v * 4) * 2);
      const n = fbm(u * 10, v * 10, 3);

      const idx = (y * canvas.width + x) * 4;

      let r = 210, g = 160, b = 110;

      if (wave > 0.2) {
        r = Math.floor(180 + n * 40);
        g = Math.floor(110 + n * 30);
        b = Math.floor(60 + n * 20);
      } else if (wave < -0.3) {
        r = Math.floor(235 + n * 20);
        g = Math.floor(220 + n * 25);
        b = Math.floor(190 + n * 30);
      }

      const du = (u - 0.65) * 2;
      const dv = (v - 0.65) * 4;
      const spotDist = du * du + dv * dv;
      if (spotDist < 0.015) {
        r = 210;
        g = 70;
        b = 40;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createSaturnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const wave = Math.sin(v * Math.PI * 12 + fbm(u * 4, v * 2) * 0.8);
      const idx = (y * canvas.width + x) * 4;

      data[idx] = Math.floor(225 + wave * 20);
      data[idx + 1] = Math.floor(205 + wave * 25);
      data[idx + 2] = Math.floor(150 + wave * 30);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createSaturnRingsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let x = 0; x < canvas.width; x++) {
    const t = x / canvas.width;

    let alpha = 230;
    let r = 210, g = 190, b = 140;

    if (t < 0.1 || t > 0.95) {
      alpha = 0;
    } else if (t > 0.55 && t < 0.62) {
      alpha = 20;
      r = 40; g = 40; b = 40;
    } else {
      const ringNoise = Math.sin(t * 180) * 0.5 + 0.5;
      alpha = Math.floor(160 + ringNoise * 90);
      r = Math.floor(190 + ringNoise * 45);
      g = Math.floor(170 + ringNoise * 40);
      b = Math.floor(120 + ringNoise * 30);
    }

    for (let y = 0; y < canvas.height; y++) {
      const idx = (y * canvas.width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createUranusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const n = fbm(u * 2, v * 2, 2);
      const idx = (y * canvas.width + x) * 4;

      data[idx] = Math.floor(110 + n * 20);
      data[idx + 1] = Math.floor(190 + n * 30);
      data[idx + 2] = Math.floor(215 + n * 30);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function createNeptuneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;

      const n = fbm(u * 4, v * 4, 3);
      const cloud = fbm(u * 12, v * 12, 2);
      const idx = (y * canvas.width + x) * 4;

      let r = Math.floor(40 + n * 30);
      let g = Math.floor(90 + n * 40);
      let b = Math.floor(190 + n * 50);

      if (cloud > 0.72) {
        r += 100;
        g += 110;
        b += 60;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

