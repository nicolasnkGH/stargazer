// planets3d.js v14 — Each planet gets its own renderer + OrbitControls
// Identical behavior to moon3d.js: drag to rotate, scroll to zoom, 30fps, IntersectionObserver

(function () {
'use strict';

const CFG = {
  sun:     { tilt:  7.25 },
  mercury: { tilt:  0.03, tex: '/assets/mercury.jpg' },
  venus:   { tilt: 177.4, tex: '/assets/venus.jpg'   },
  earth:   { tilt:  23.4 },
  mars:    { tilt:  25.2, tex: '/assets/mars.jpg'    },
  jupiter: { tilt:   3.1, tex: '/assets/jupiter.jpg' },
  saturn:  { tilt:  26.7, tex: '/assets/saturn.jpg', hasRing: true, ringTex: '/assets/saturn_ring_color.jpg' },
  uranus:  { tilt:  97.8, tex: '/assets/uranus.jpg'  },
  neptune: { tilt:  28.3, tex: '/assets/neptune.jpg' },
  moon:    { tilt:   1.5, tex: '/assets/moon_texture.jpg' },
  pluto:   { tilt: 122.5 },
};

// Track all instances for cleanup
const instances = [];

/* ── Procedural fallbacks for planets without texture files ────────────── */

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
}

function drawSun(ctx, W, H) {
  const bg = ctx.createRadialGradient(W*0.42,H*0.42,0,W*0.5,H*0.5,W*0.55);
  bg.addColorStop(0,'#fff8d0'); bg.addColorStop(0.3,'#ffe060'); bg.addColorStop(0.7,'#ff8800'); bg.addColorStop(1,'#cc3300');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
}

function drawPluto(ctx, W, H) {
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#987860'); bg.addColorStop(0.5,'#a88870'); bg.addColorStop(1,'#886858');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#e8ddc0';
  ctx.beginPath(); ctx.ellipse(W*0.55,H*0.50,W*0.13,H*0.13,0.3,0,Math.PI*2); ctx.fill(); ctx.restore();
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

/* ── Saturn ring ──────────────────────────────────────────────────────── */
function makeSaturnRingGeo() {
  const ringGeo = new THREE.RingGeometry(1.26, 2.22, 128);
  const pos = ringGeo.attributes.position;
  const uv  = ringGeo.attributes.uv;
  const v3  = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    uv.setXY(i, (v3.length() - 1.26) / (2.22 - 1.26), 0.5);
  }
  uv.needsUpdate = true;
  return ringGeo;
}

/* ── Build one planet — mirrors initMoon3D() exactly ─────────────────── */
function buildPlanet(container) {
  const name = (container.dataset.planet || 'mercury').toLowerCase();
  const cfg  = CFG[name] || CFG.mercury;

  container.innerHTML = '';

  const width  = container.clientWidth  || 300;
  const height = container.clientHeight || 200;

  // ── Scene, camera, renderer — same as moon3d.js ──
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  container.appendChild(renderer.domElement);

  // ── OrbitControls — same as moon3d.js ──
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Pause auto-rotate on drag, resume after 2s — same as moon3d.js
  let _rotateTimer = null;
  renderer.domElement.addEventListener('pointerdown', () => {
    controls.autoRotate = false;
    clearTimeout(_rotateTimer);
  });
  renderer.domElement.addEventListener('pointerup', () => {
    _rotateTimer = setTimeout(() => { controls.autoRotate = true; }, 2000);
  });

  // ── Lighting — same as moon3d.js ──
  const ambientLight = new THREE.AmbientLight(0x101828, 0.12);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
  dirLight.position.set(-1.8, 0.7, 1.5);
  scene.add(dirLight);
  const rimLight = new THREE.DirectionalLight(0x4040a0, 0.20);
  rimLight.position.set(5, 0, -5);
  scene.add(rimLight);

  // ── Sphere ──
  const geometry = new THREE.SphereGeometry(1, 48, 48);
  const loader   = new THREE.TextureLoader();

  function finishSetup(texture) {
    const material = new THREE.MeshStandardMaterial({
      map:       texture,
      roughness: 0.88,
      metalness: 0.04,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.rotation.x = THREE.MathUtils.degToRad(cfg.tilt || 0);
    scene.add(planet);

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
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xc8b890, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
      const ring = new THREE.Mesh(makeSaturnRingGeo(), ringMat);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
    }

    // ── IntersectionObserver — same as moon3d.js ──
    let _visible = true;
    const io = new IntersectionObserver(([e]) => { _visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(container);

    // Page visibility — same as moon3d.js
    let _pageVisible = !document.hidden;
    document.addEventListener('visibilitychange', () => { _pageVisible = !document.hidden; });

    // ── 30fps animation loop — same as moon3d.js ──
    let lastTime = 0;
    function animate(time) {
      requestAnimationFrame(animate);
      if (!_visible || !_pageVisible) return;
      if (time - lastTime < 33) return; // 30fps cap
      lastTime = time;
      controls.update();
      renderer.render(scene, camera);
    }
    animate(performance.now());

    // ── ResizeObserver — same as moon3d.js ──
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Track for cleanup
    instances.push({ renderer, io, resizeObserver, container });
  }

  // Load texture or fallback
  if (cfg.tex) {
    loader.load(
      cfg.tex,
      tex => finishSetup(tex),
      undefined,
      () => {
        console.warn(`planets3d: failed to load ${cfg.tex}, using procedural`);
        finishSetup(makeProceduralTexture(name));
      }
    );
  } else {
    finishSetup(makeProceduralTexture(name));
  }
}

/* ── initPlanets3D ───────────────────────────────────────────────────── */
function initPlanets3D() {
  // Cleanup previous instances
  instances.forEach(inst => {
    if (inst.io) inst.io.disconnect();
    if (inst.resizeObserver) inst.resizeObserver.disconnect();
    try { inst.renderer.dispose(); } catch(_) {}
    inst.container.innerHTML = '';
  });
  instances.length = 0;

  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (!containers.length || typeof THREE === 'undefined') return;

  // Build each planet independently — same as moon gets built independently
  requestAnimationFrame(() => {
    containers.forEach(c => buildPlanet(c));
  });
}

window.initPlanets3D = initPlanets3D;

})();
