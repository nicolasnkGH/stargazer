// planets3d.js — Three.js textured planets v10
// Mirrors moon3d.js pattern: THREE.TextureLoader from /assets/*.jpg
// Procedural canvas fallback for planets without texture files (earth, sun, pluto)
// Shared 12fps throttled loop + IntersectionObserver per card

(function () {
'use strict';

/* ── Planet configs ─────────────────────────────────────────────────────── */
const CFG = {
  sun:     { tilt:  7.25, speed: 0.48, bumpScale: 0.002 },
  mercury: { tilt:  0.03, speed: 0.017, tex: '/assets/mercury.jpg', bumpScale: 0.015 },
  venus:   { tilt: 177.4, speed: 0.004, tex: '/assets/venus.jpg', bumpScale: 0.006 },
  earth:   { tilt:  23.4, speed: 0.50, bumpScale: 0.008 },   // no texture file yet — procedural
  mars:    { tilt:  25.2, speed: 0.24, tex: '/assets/mars.jpg', bumpScale: 0.012 },
  jupiter: { tilt:   3.1, speed: 0.45, tex: '/assets/jupiter.jpg', bumpScale: 0.003 },
  saturn:  { tilt:  26.7, speed: 0.38, tex: '/assets/saturn.jpg', hasRing: true, ringTex: '/assets/saturn_ring_color.jpg', bumpScale: 0.003 },
  uranus:  { tilt:  97.8, speed: 0.23, tex: '/assets/uranus.jpg', bumpScale: 0.002 },
  neptune: { tilt:  28.3, speed: 0.15, tex: '/assets/neptune.jpg', bumpScale: 0.003 },
  moon:    { tilt:   1.5, speed: 0.036, tex: '/assets/moon_texture.jpg', bumpScale: 0.01 },
  pluto:   { tilt: 122.5, speed: 0.006, bumpScale: 0.01 },   // no texture file yet — procedural
};

/* ── Procedural canvas fallbacks (only for planets without .jpg assets) ── */

function drawEarth(ctx, W, H) {
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, '#0e3870'); og.addColorStop(0.5, '#1a6ab8'); og.addColorStop(1, '#0e3870');
  ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4a8a3a';
  ctx.beginPath(); ctx.ellipse(W*0.60, H*0.28, W*0.20, H*0.14, -0.15, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.55, H*0.52, W*0.07, H*0.22, 0,    0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.19, H*0.32, W*0.09, H*0.20, 0.1,  0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a7a2a';
  ctx.beginPath(); ctx.ellipse(W*0.24, H*0.62, W*0.06, H*0.18, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8a7a40';
  ctx.beginPath(); ctx.ellipse(W*0.79, H*0.66, W*0.066, H*0.09, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(220,235,255,0.88)';
  ctx.fillRect(0, 0, W, H*0.06); ctx.fillRect(0, H*0.92, W, H);
  ctx.save(); ctx.globalAlpha = 0.44;
  for (let i = 0; i < 14; i++) {
    const cy = Math.random() * H;
    const cg = ctx.createLinearGradient(0, cy-10, 0, cy+10);
    cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.5, 'rgba(255,255,255,0.65)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, cy + Math.sin(x*0.02+i)*11);
    ctx.lineTo(W, cy+22); ctx.lineTo(0, cy+22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawSun(ctx, W, H) {
  const bg = ctx.createRadialGradient(W*0.42,H*0.42,0,W*0.5,H*0.5,W*0.55);
  bg.addColorStop(0,'#fff8d0'); bg.addColorStop(0.3,'#ffe060'); bg.addColorStop(0.7,'#ff8800'); bg.addColorStop(1,'#cc3300');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.12;
  for(let i=0;i<280;i++){
    const gx=Math.random()*W, gy=Math.random()*H, gr=Math.random()*8+3;
    ctx.fillStyle='rgba(255,195,50,0.85)';
    ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawPluto(ctx, W, H) {
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#987860'); bg.addColorStop(0.5,'#a88870'); bg.addColorStop(1,'#886858');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#e8ddc0';
  ctx.beginPath(); ctx.ellipse(W*0.55,H*0.50,W*0.13,H*0.13,0.3,0,Math.PI*2); ctx.fill(); ctx.restore();
  for(let i=0;i<30;i++){
    ctx.save(); ctx.globalAlpha=0.22+Math.random()*0.22;
    ctx.fillStyle=Math.random()>0.5?'#6a5848':'#ccc0a8';
    ctx.beginPath(); ctx.arc(Math.random()*W,Math.random()*H,Math.random()*W*0.022+W*0.005,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function makeProceduralTexture(name) {
  const W=512, H=256, cv=document.createElement('canvas');
  cv.width=W; cv.height=H;
  const ctx=cv.getContext('2d');
  if (name==='earth') drawEarth(ctx,W,H);
  else if (name==='sun') drawSun(ctx,W,H);
  else drawPluto(ctx,W,H);
  return new THREE.CanvasTexture(cv);
}

/* ── Procedural bump maps — per-planet surface relief ─────────────────────── */
function makePlanetBump(name) {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);

  switch (name) {
    case 'mercury':
      for (let i = 0; i < 60; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.025 + W * 0.003;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(30,30,30,0.5)');
        g.addColorStop(0.6, 'rgba(30,30,30,0.3)');
        g.addColorStop(0.8, 'rgba(180,180,180,0.25)');
        g.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 'venus':
      ctx.save(); ctx.globalAlpha = 0.15;
      for (let y = 0; y < H; y += 6) {
        const offset = Math.sin(y * 0.03) * 30;
        ctx.fillStyle = (y % 12 < 6) ? '#999' : '#666';
        ctx.fillRect(offset, y, W, 6);
      }
      ctx.restore();
      break;

    case 'earth':
      ctx.save(); ctx.globalAlpha = 0.12;
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#999' : '#666';
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 12 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;

    case 'mars':
      ctx.save(); ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#aaa';
      ctx.fillRect(0, 0, W, H * 0.05);
      ctx.fillRect(0, H * 0.95, W, H * 0.05);
      ctx.restore();
      for (let i = 0; i < 35; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.03 + W * 0.004;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(40,40,40,0.4)');
        g.addColorStop(0.7, 'rgba(40,40,40,0.2)');
        g.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 'jupiter':
      ctx.save(); ctx.globalAlpha = 0.25;
      for (let y = 0; y < H; y += 4) {
        const band = Math.sin(y / H * Math.PI * 12) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? '#a0a0a0' : '#606060';
        ctx.fillRect(0, y, W, 4);
      }
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.ellipse(W * 0.65, H * 0.58, W * 0.06, H * 0.04, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 'saturn':
      ctx.save(); ctx.globalAlpha = 0.2;
      for (let y = 0; y < H; y += 5) {
        const band = Math.sin(y / H * Math.PI * 8) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? '#a8a8a8' : '#585858';
        ctx.fillRect(0, y, W, 5);
      }
      ctx.restore();
      break;

    case 'uranus':
      ctx.save(); ctx.globalAlpha = 0.08;
      for (let y = 0; y < H; y += 8) {
        ctx.fillStyle = (y % 16 < 8) ? '#909090' : '#707070';
        ctx.fillRect(0, y, W, 8);
      }
      ctx.restore();
      break;

    case 'neptune':
      ctx.save(); ctx.globalAlpha = 0.22;
      for (let y = 0; y < H; y += 5) {
        const band = Math.sin(y / H * Math.PI * 10) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? '#888' : '#444';
        ctx.fillRect(0, y, W, 5);
      }
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(W * 0.4, H * 0.4, W * 0.05, H * 0.03, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 'sun':
      ctx.save(); ctx.globalAlpha = 0.18;
      for (let i = 0; i < 400; i++) {
        const gx = Math.random() * W, gy = Math.random() * H;
        const gr = Math.random() * 5 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#aaa' : '#666';
        ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;

    case 'pluto':
      ctx.save(); ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.ellipse(W * 0.55, H * 0.5, W * 0.1, H * 0.1, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.025 + W * 0.004;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(35,35,35,0.4)');
        g.addColorStop(0.7, 'rgba(35,35,35,0.2)');
        g.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 'moon':
      for (let i = 0; i < 80; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.04 + W * 0.005;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(20,20,20,0.55)');
        g.addColorStop(0.65, 'rgba(20,20,20,0.35)');
        g.addColorStop(0.85, 'rgba(200,200,200,0.30)');
        g.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      break;
  }

  // Fine surface noise overlay for all planets
  const imgData = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    imgData.data[i]   = Math.min(255, Math.max(0, imgData.data[i]   + n));
    imgData.data[i+1] = imgData.data[i];
    imgData.data[i+2] = imgData.data[i];
  }
  ctx.putImageData(imgData, 0, 0);

  return cv;
}

/* ── Saturn ring texture from /assets/saturn_ring_color.jpg ──────────────── */
function makeSaturnRingGeo() {
  const ringGeo = new THREE.RingGeometry(1.26, 2.22, 128);
  // Remap UVs radially so the texture maps from inner to outer edge
  const pos = ringGeo.attributes.position;
  const uv  = ringGeo.attributes.uv;
  const v3  = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    uv.setXY(i, (r - 1.26) / (2.22 - 1.26), 0.5);
  }
  uv.needsUpdate = true;
  return ringGeo;
}

/* ── Shared 12fps animation loop ─────────────────────────────────────────── */
const active = [];
let rafId = null, lastT = 0;
const DT = 1000 / 25; // 25fps
let _pageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => { _pageVisible = !document.hidden; });
const ROT_SPEED = 0.036; // gentle auto-rotation — matches moon's idle spin rate

function loop(t) {
  rafId = requestAnimationFrame(loop);
  if (!_pageVisible) return;
  if (t - lastT < DT) return;
  lastT = t;
  for (const p of active) {
    if (p.paused || p.disposed) continue;
    p.controls.update();
    if (p.idle) {
      p.mesh.rotation.y += ROT_SPEED * (DT / 1000);
    }
    p.renderer.render(p.scene, p.camera);
  }
}

/* ── initPlanets3D ───────────────────────────────────────────────────────── */
function initPlanets3D() {
  // Cancel old loop & dispose old renderers
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  active.forEach(p => {
    p.disposed = true;
    if (p.observer) p.observer.disconnect();
    p.resizeObserver?.disconnect();
    try { p.renderer.dispose(); } catch(_) {}
  });
  active.length = 0;

  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (!containers.length || typeof THREE === 'undefined') return;

  const loader = new THREE.TextureLoader();

  requestAnimationFrame(() => {
    containers.forEach(container => {
      const name = (container.dataset.planet || 'mercury').toLowerCase();
      const cfg  = CFG[name] || CFG.mercury;

      container.innerHTML = '';

      // ── Renderer — identical to moon3d.js ──
      // Use full container dimensions (rectangular), not forced square
      const width  = container.clientWidth  || 300;
      const height = container.clientHeight || 200;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setClearColor(0x050510, 1);
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);

      // Scene & camera — same FOV/distance as moon3d.js
      const scene  = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050510, 0.06);
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 3.5;

      // Lighting — soft, natural illumination (no harsh terminator)
      const ambient  = new THREE.AmbientLight(0x303050, 0.35);
      const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
      keyLight.position.set(-2, 1, 2);
      const fillLight = new THREE.DirectionalLight(0x8090b0, 0.25);
      fillLight.position.set(2, -0.5, 1);
      const rimLight = new THREE.DirectionalLight(0x4040a0, 0.15);
      rimLight.position.set(5, 0, -5);
      scene.add(ambient, keyLight, fillLight, rimLight);

      // OrbitControls — drag to rotate, scroll to zoom (same as moon3d.js)
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 1.5;
      controls.maxDistance = 6;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.5;

      let _planetRotateTimer = null;
      let planetIdle = true;
      renderer.domElement.addEventListener('pointerdown', () => {
        planetIdle = false;
        clearTimeout(_planetRotateTimer);
      });
      renderer.domElement.addEventListener('pointerup', () => {
        _planetRotateTimer = setTimeout(() => { planetIdle = true; }, 2000);
      });

      // Geometry
      const geo = new THREE.SphereGeometry(1, 48, 48);

      // Material — created after texture loads
      function buildSphere(texture) {
        const bumpCanvas = makePlanetBump(name);
        const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
        const mat = new THREE.MeshStandardMaterial({
          map:       texture,
          bumpMap:   bumpTexture,
          bumpScale: cfg.bumpScale || 0.01,
          roughness: 0.95,
          metalness: 0.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = THREE.MathUtils.degToRad(cfg.tilt || 0);
        scene.add(mesh);

        // Saturn ring
        if (cfg.hasRing && cfg.ringTex) {
          loader.load(cfg.ringTex, ringTex => {
            const ringMat = new THREE.MeshBasicMaterial({
              map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92,
            });
            const ring = new THREE.Mesh(makeSaturnRingGeo(), ringMat);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
          });
        } else if (cfg.hasRing) {
          // Fallback procedural ring if no file
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xc8b890, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
          const ring = new THREE.Mesh(makeSaturnRingGeo(), ringMat);
          ring.rotation.x = Math.PI / 2;
          scene.add(ring);
        }

        // First render immediately
        renderer.render(scene, camera);

        // IntersectionObserver — pause off-screen planets
        const entry = { renderer, scene, camera, mesh, controls, rotSpeed: cfg.speed, idle: true, paused: false, disposed: false, observer: null, resizeObserver: null };
        const io = new IntersectionObserver(([e]) => { entry.paused = !e.isIntersecting; }, { threshold: 0.05 });
        io.observe(container);
        entry.observer = io;

        // ResizeObserver — keep camera aspect & renderer size in sync
        const ro = new ResizeObserver(entries => {
          for (const e of entries) {
            const { width, height } = e.contentRect;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
          }
        });
        ro.observe(container);
        entry.resizeObserver = ro;

        active.push(entry);

        // Start shared loop if not running
        if (!rafId) rafId = requestAnimationFrame(loop);
      }

      // Load real texture file if available, otherwise procedural
      if (cfg.tex) {
        loader.load(
          cfg.tex,
          tex => { buildSphere(tex); },          // onLoad
          undefined,                              // onProgress
          () => {                                 // onError — fall back to procedural
            console.warn(`planets3d: failed to load ${cfg.tex}, using procedural`);
            buildSphere(makeProceduralTexture(name));
          }
        );
      } else {
        buildSphere(makeProceduralTexture(name));
      }
    });
  });
}

window.initPlanets3D = initPlanets3D;

})(); // end IIFE
