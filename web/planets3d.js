// planets3d.js — Three.js textured planets v10
// Mirrors moon3d.js pattern: THREE.TextureLoader from /assets/*.jpg
// Procedural canvas fallback for planets without texture files (earth, sun, pluto)
// Shared 12fps throttled loop + IntersectionObserver per card

(function () {
'use strict';

/* ── Planet configs ─────────────────────────────────────────────────────── */
const CFG = {
  sun:     { tilt:  7.25, speed: 0.48 },
  mercury: { tilt:  0.03, speed: 0.017, tex: '/assets/mercury.jpg' },
  venus:   { tilt: 177.4, speed: 0.004, tex: '/assets/venus.jpg'   },
  earth:   { tilt:  23.4, speed: 0.50  },   // no texture file yet — procedural
  mars:    { tilt:  25.2, speed: 0.24,  tex: '/assets/mars.jpg'    },
  jupiter: { tilt:   3.1, speed: 0.45,  tex: '/assets/jupiter.jpg' },
  saturn:  { tilt:  26.7, speed: 0.38,  tex: '/assets/saturn.jpg', hasRing: true, ringTex: '/assets/saturn_ring_color.jpg' },
  uranus:  { tilt:  97.8, speed: 0.23,  tex: '/assets/uranus.jpg'  },
  neptune: { tilt:  28.3, speed: 0.15,  tex: '/assets/neptune.jpg' },
  moon:    { tilt:   1.5, speed: 0.036, tex: '/assets/moon_texture.jpg' },
  pluto:   { tilt: 122.5, speed: 0.006 },   // no texture file yet — procedural
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
const DT = 1000 / 12; // 12fps

function loop(t) {
  rafId = requestAnimationFrame(loop);
  if (t - lastT < DT) return;
  lastT = t;
  for (const p of active) {
    if (p.paused || p.disposed) continue;
    p.mesh.rotation.y += p.rotSpeed * (DT / 1000);
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

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.appendChild(renderer.domElement);

      // Scene & camera — same FOV/distance as moon3d.js
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 3.5;

      // Lighting — cinematic terminator (same as moon3d.js)
      const ambient  = new THREE.AmbientLight(0x101828, 0.12);
      const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
      keyLight.position.set(-1.8, 0.7, 1.5);
      const rimLight = new THREE.DirectionalLight(0x4040a0, 0.15);
      rimLight.position.set(5, 0, -5);
      scene.add(ambient, keyLight, rimLight);

      // Geometry
      const geo = new THREE.SphereGeometry(1, 64, 32);

      // Material — created after texture loads
      function buildSphere(texture) {
        const mat = new THREE.MeshStandardMaterial({
          map:       texture,
          roughness: 0.88,
          metalness: 0.04,
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
        const entry = { renderer, scene, camera, mesh, rotSpeed: cfg.speed, paused: false, disposed: false, observer: null };
        const io = new IntersectionObserver(([e]) => { entry.paused = !e.isIntersecting; }, { threshold: 0.05 });
        io.observe(container);
        entry.observer = io;
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
