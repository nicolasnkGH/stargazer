// planets3d.js — Three.js textured planets v8
// Procedural canvas textures + 12fps shared render loop + IntersectionObserver
// No external assets — all textures generated locally on canvas

(function () {
'use strict';

/* ── Planet rotation configs ─────────────────────────────────────────────── */
const CFG = {
  sun:     { tilt:  7.25, speed: 0.48 },
  mercury: { tilt:  0.03, speed: 0.017 },
  venus:   { tilt: 177.4, speed: 0.004 },
  earth:   { tilt:  23.4, speed: 0.50  },
  mars:    { tilt:  25.2, speed: 0.24  },
  jupiter: { tilt:   3.1, speed: 0.45  },
  saturn:  { tilt:  26.7, speed: 0.38, hasRing: true },
  uranus:  { tilt:  97.8, speed: 0.23  },
  neptune: { tilt:  28.3, speed: 0.15  },
  moon:    { tilt:   1.5, speed: 0.036 },
  pluto:   { tilt: 122.5, speed: 0.006 },
};

/* ── Texture: Jupiter ──────────────────────────────────────────────────────
   Accurate cloud-belt system: NEB, EZ, SEB, Great Red Spot               */
function drawJupiter(ctx, W, H) {
  const belts = [
    // [y_frac, h_frac, mid_color, edge_color]
    [0.000, 0.045, '#c0a070', '#a08050'],  // N polar region
    [0.045, 0.030, '#d8c080', '#b8a060'],  // NNTBs
    [0.075, 0.030, '#906030', '#703810'],  // NNTB dark
    [0.105, 0.060, '#dcc888', '#bcaa70'],  // NTZ bright
    [0.165, 0.040, '#9a6838', '#7a4820'],  // NTB dark
    [0.205, 0.060, '#e4d090', '#c4b078'],  // NTeZ
    [0.265, 0.085, '#8c5428', '#6c3410'],  // NEB  ← prominent dark belt
    [0.350, 0.105, '#f2e2a8', '#d8c888'],  // EZ   ← bright equatorial zone
    [0.455, 0.095, '#905228', '#702810'],  // SEB  ← prominent dark belt
    [0.550, 0.060, '#d8c080', '#b8a060'],  // STeZ
    [0.610, 0.040, '#806030', '#604010'],  // STB dark
    [0.650, 0.075, '#c8b078', '#a89058'],  // STZ
    [0.725, 0.055, '#907040', '#706020'],  // SSTB
    [0.780, 0.100, '#c0a068', '#a08050'],  // S polar region
    [0.880, 0.120, '#a89060', '#887040'],  // SPZ
  ];

  belts.forEach(([y, h, c1, c2]) => {
    const py = y * H, ph = h * H;
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, c2); g.addColorStop(0.35, c1);
    g.addColorStop(0.65, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, py, W, ph);
  });

  // Belt-edge turbulence — slight wave at major belt boundaries
  ctx.save();
  ctx.globalAlpha = 0.22;
  [[0.265, '#f0e0a0'], [0.350, '#5a3010'], [0.455, '#f0e0a0'], [0.550, '#5a3010']].forEach(([yf, col]) => {
    const ey = yf * H;
    ctx.beginPath(); ctx.moveTo(0, ey);
    for (let x = 0; x <= W; x += 6)
      ctx.lineTo(x, ey + Math.sin(x * 0.06 + yf * 10) * 3.5);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  });
  ctx.restore();

  // Great Red Spot — elliptical storm in SEB
  ctx.save();
  ctx.translate(W * 0.62, H * 0.495);
  const grs = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.062);
  grs.addColorStop(0,    '#b03820');
  grs.addColorStop(0.40, '#c04828');
  grs.addColorStop(0.75, 'rgba(180,70,28,0.45)');
  grs.addColorStop(1,    'rgba(150,55,18,0)');
  ctx.fillStyle = grs;
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.060, H * 0.046, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner bright swirl
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#e06040';
  ctx.beginPath();
  ctx.ellipse(-2, -1, W * 0.026, H * 0.018, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Fine horizontal streaking
  ctx.save(); ctx.globalAlpha = 0.07;
  for (let y = 0; y < H; y += 3) {
    if (Math.random() > 0.65) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fff0c0' : '#4a2800';
      ctx.fillRect(Math.random() * W * 0.4, y, Math.random() * W * 0.45 + 20, 1);
    }
  }
  ctx.restore();
}

/* ── Texture: Saturn ───────────────────────────────────────────────────── */
function drawSaturn(ctx, W, H) {
  const belts = [
    [0.000, 0.060, '#c8b078', '#a89060'],
    [0.060, 0.040, '#d8c888', '#b8a870'],
    [0.100, 0.035, '#907850', '#706030'],
    [0.135, 0.070, '#e0cc90', '#c0ac78'],
    [0.205, 0.055, '#a08848', '#806828'],
    [0.260, 0.120, '#e8d898', '#ccc080'],  // bright equatorial
    [0.380, 0.090, '#a89050', '#887030'],
    [0.470, 0.070, '#d8c888', '#b8a868'],
    [0.540, 0.060, '#908848', '#706828'],
    [0.600, 0.110, '#ccc080', '#aca060'],
    [0.710, 0.080, '#a08848', '#806030'],
    [0.790, 0.120, '#c0a870', '#a08850'],
    [0.910, 0.090, '#b09868', '#907850'],
  ];
  belts.forEach(([y, h, c1, c2]) => {
    const py = y * H, ph = h * H;
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, c2); g.addColorStop(0.4, c1); g.addColorStop(0.6, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, py, W, ph);
  });
}

/* ── Texture: Saturn Ring ─────────────────────────────────────────────── */
function drawSaturnRing(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0,    'rgba(0,0,0,0)');
  g.addColorStop(0.05, 'rgba(175,150,95,0.28)');   // C ring faint
  g.addColorStop(0.20, 'rgba(210,180,118,0.70)');  // B ring inner
  g.addColorStop(0.38, 'rgba(230,200,138,0.90)');  // B ring bright
  g.addColorStop(0.54, 'rgba(195,168,108,0.58)');  // transitional
  g.addColorStop(0.60, 'rgba(95,80,50,0.18)');     // Cassini division
  g.addColorStop(0.65, 'rgba(200,174,118,0.75)');  // A ring
  g.addColorStop(0.82, 'rgba(214,188,128,0.85)');  // A ring bright
  g.addColorStop(0.90, 'rgba(178,152,98,0.48)');   // A ring outer
  g.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ── Texture: Venus ─────────────────────────────────────────────────────── */
function drawVenus(ctx, W, H) {
  // Base warm amber
  ctx.fillStyle = '#c07028'; ctx.fillRect(0, 0, W, H);
  // Banded cloud system
  const bands = [
    [0.00, 0.08, '#d08838', '#a86020'],
    [0.08, 0.06, '#b86020', '#963808'],
    [0.14, 0.11, '#dda040', '#bb7828'],
    [0.25, 0.09, '#c07020', '#a05010'],
    [0.34, 0.13, '#e0a848', '#c08030'],
    [0.47, 0.10, '#b87020', '#985010'],
    [0.57, 0.09, '#d89040', '#b87030'],
    [0.66, 0.12, '#be6820', '#9c4808'],
    [0.78, 0.11, '#daa040', '#b87828'],
    [0.89, 0.11, '#b46828', '#924e18'],
  ];
  bands.forEach(([y, h, c1, c2]) => {
    const py = y * H, ph = h * H;
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, c2); g.addColorStop(0.4, c1); g.addColorStop(0.6, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, py, W, ph);
  });
  // Swirling cloud streaks
  ctx.save(); ctx.globalAlpha = 0.22;
  for (let i = 0; i < 20; i++) {
    const cy = (i / 20) * H;
    const bright = i % 3 === 0;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let x = 0; x <= W; x += 8)
      ctx.lineTo(x, cy + Math.sin(x * 0.022 + i * 1.4) * 14 + Math.cos(x * 0.008 + i) * 8);
    ctx.lineTo(W, cy + 22); ctx.lineTo(0, cy + 22); ctx.closePath();
    ctx.fillStyle = bright ? 'rgba(240,155,55,0.65)' : 'rgba(72,26,0,0.55)';
    ctx.fill();
  }
  ctx.restore();
  // Polar darkening
  ['top', 'bottom'].forEach(pos => {
    const g = ctx.createLinearGradient(0, pos === 'top' ? 0 : H * 0.84, 0, pos === 'top' ? H * 0.14 : H);
    g.addColorStop(pos === 'top' ? 0 : 1, 'rgba(55,22,4,0.55)');
    g.addColorStop(pos === 'top' ? 1 : 0, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, pos === 'top' ? 0 : H * 0.84, W, H);
  });
}

/* ── Texture: Earth ─────────────────────────────────────────────────────── */
function drawEarth(ctx, W, H) {
  // Ocean
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, '#0e3870'); og.addColorStop(0.5, '#1a6ab8'); og.addColorStop(1, '#0e3870');
  ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
  // Landmasses (simplified)
  ctx.fillStyle = '#4a8a3a';
  // Eurasia
  ctx.beginPath(); ctx.ellipse(W*0.60, H*0.28, W*0.20, H*0.14, -0.15, 0, Math.PI*2); ctx.fill();
  // Africa
  ctx.beginPath(); ctx.ellipse(W*0.55, H*0.52, W*0.07, H*0.22, 0, 0, Math.PI*2); ctx.fill();
  // N America
  ctx.beginPath(); ctx.ellipse(W*0.19, H*0.32, W*0.09, H*0.20, 0.1, 0, Math.PI*2); ctx.fill();
  // S America
  ctx.fillStyle = '#3a7a2a';
  ctx.beginPath(); ctx.ellipse(W*0.24, H*0.62, W*0.06, H*0.18, -0.1, 0, Math.PI*2); ctx.fill();
  // Australia
  ctx.fillStyle = '#8a7a40';
  ctx.beginPath(); ctx.ellipse(W*0.79, H*0.66, W*0.066, H*0.09, 0.2, 0, Math.PI*2); ctx.fill();
  // Polar ice
  ctx.fillStyle = 'rgba(220,235,255,0.88)';
  ctx.fillRect(0, 0, W, H * 0.06); ctx.fillRect(0, H * 0.92, W, H);
  // Clouds
  ctx.save(); ctx.globalAlpha = 0.44;
  for (let i = 0; i < 14; i++) {
    const cy = Math.random() * H;
    const cg = ctx.createLinearGradient(0, cy - 10, 0, cy + 10);
    cg.addColorStop(0, 'rgba(255,255,255,0)');
    cg.addColorStop(0.5, 'rgba(255,255,255,0.65)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, cy + Math.sin(x * 0.02 + i) * 11);
    ctx.lineTo(W, cy + 22); ctx.lineTo(0, cy + 22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/* ── Texture: Mars ───────────────────────────────────────────────────────── */
function drawMars(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#b03c10'); bg.addColorStop(0.5, '#c4481a'); bg.addColorStop(1, '#9a3008');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Dark albedo features
  [[0.27, 0.55, 0.20, 0.11, '#8a2808', 0.55],   // Syrtis Major
   [0.57, 0.40, 0.11, 0.07, '#7a2008', 0.48],
   [0.72, 0.65, 0.13, 0.07, '#922808', 0.42]].forEach(([x, y, rx, ry, c, a]) => {
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x*W, y*H, rx*W, ry*H, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
  // Polar ice caps
  [['top', 0, H*0.10], ['bottom', H*0.90, H]].forEach(([pos, y0, y1]) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    if (pos === 'top') { g.addColorStop(0, 'rgba(240,230,215,0.90)'); g.addColorStop(1, 'rgba(240,225,205,0)'); }
    else               { g.addColorStop(0, 'rgba(238,222,202,0)');    g.addColorStop(1, 'rgba(232,218,205,0.88)'); }
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  });
}

/* ── Texture: Mercury ────────────────────────────────────────────────────── */
function drawMercury(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#9a8870'); bg.addColorStop(0.5, '#a89878'); bg.addColorStop(1, '#887860');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Large impact basins
  for (let i = 0; i < 7; i++) {
    const bx = Math.random()*W, by = Math.random()*H, br = W*0.04 + Math.random()*W*0.045;
    ctx.save(); ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#5a4838';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  // Smaller craters
  for (let i = 0; i < 55; i++) {
    const cx = Math.random()*W, cy = Math.random()*H, r = Math.random()*W*0.025 + W*0.006;
    ctx.save(); ctx.globalAlpha = 0.22 + Math.random()*0.28;
    ctx.fillStyle = Math.random() > 0.5 ? '#6a5848' : '#c8b898';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* ── Texture: Uranus ─────────────────────────────────────────────────────── */
function drawUranus(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#52b4c4'); bg.addColorStop(0.5, '#6acce0'); bg.addColorStop(1, '#52b4c4');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  [[0.20,0.10,'#5ec4d4',0.32],[0.38,0.14,'#80e0f0',0.28],[0.58,0.10,'#5ec0d0',0.28],[0.73,0.08,'#4cb0c0',0.30]]
    .forEach(([y,h,c,a]) => { ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=c; ctx.fillRect(0,y*H,W,h*H); ctx.restore(); });
  // Polar haze
  ctx.save(); ctx.globalAlpha = 0.38;
  const pg = ctx.createLinearGradient(0,0,0,H*0.22);
  pg.addColorStop(0,'#a2e8f8'); pg.addColorStop(1,'rgba(162,232,248,0)');
  ctx.fillStyle = pg; ctx.fillRect(0,0,W,H*0.22); ctx.restore();
}

/* ── Texture: Neptune ────────────────────────────────────────────────────── */
function drawNeptune(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1830c0'); bg.addColorStop(0.5, '#2040d8'); bg.addColorStop(1, '#1428b0');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  [[0.15,0.08,'#3252e8',0.35],[0.35,0.10,'#1832c0',0.30],[0.55,0.08,'#2842d0',0.32],[0.70,0.07,'#1022a8',0.28]]
    .forEach(([y,h,c,a]) => { ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=c; ctx.fillRect(0,y*H,W,h*H); ctx.restore(); });
  // Great Dark Spot
  ctx.save(); ctx.globalAlpha = 0.50;
  ctx.fillStyle = 'rgba(5,10,60,0.60)';
  ctx.beginPath(); ctx.ellipse(W*0.55,H*0.45,W*0.08,H*0.055,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // Polar glow
  ctx.save(); ctx.globalAlpha = 0.38;
  const pg = ctx.createLinearGradient(0,0,0,H*0.20);
  pg.addColorStop(0,'#5070ff'); pg.addColorStop(1,'rgba(80,112,255,0)');
  ctx.fillStyle = pg; ctx.fillRect(0,0,W,H*0.20); ctx.restore();
}

/* ── Texture: Moon ───────────────────────────────────────────────────────── */
function drawMoon(ctx, W, H) {
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#909090'); bg.addColorStop(0.5,'#a0a0a0'); bg.addColorStop(1,'#808080');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // Mare (dark plains)
  [[0.50,0.40,0.16,0.10,'#606060',0.60],[0.70,0.35,0.10,0.07,'#686868',0.55],[0.34,0.50,0.08,0.06,'#646464',0.52]]
    .forEach(([x,y,rx,ry,c,a])=>{
      ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=c;
      ctx.beginPath(); ctx.ellipse(x*W,y*H,rx*W,ry*H,0.3,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
  // Craters
  for(let i=0;i<55;i++){
    const cx=Math.random()*W, cy=Math.random()*H, r=Math.random()*W*0.022+W*0.005;
    ctx.save(); ctx.globalAlpha=0.28+Math.random()*0.28;
    ctx.fillStyle=Math.random()>0.5?'#787878':'#c8c8c8';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

/* ── Texture: Sun ────────────────────────────────────────────────────────── */
function drawSun(ctx, W, H) {
  const bg = ctx.createRadialGradient(W*0.42,H*0.42,0,W*0.5,H*0.5,W*0.55);
  bg.addColorStop(0,'#fff8d0'); bg.addColorStop(0.3,'#ffe060'); bg.addColorStop(0.7,'#ff8800'); bg.addColorStop(1,'#cc3300');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.12;
  for(let i=0;i<280;i++){
    const gx=Math.random()*W, gy=Math.random()*H, gr=Math.random()*8+3;
    ctx.fillStyle='rgba(255,195,50,0.85)';
    ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

/* ── Texture: Pluto ──────────────────────────────────────────────────────── */
function drawPluto(ctx, W, H) {
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#987860'); bg.addColorStop(0.5,'#a88870'); bg.addColorStop(1,'#886858');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // Tombaugh Regio (heart-shaped nitrogen ice plain)
  ctx.save(); ctx.globalAlpha=0.55;
  ctx.fillStyle='#e8ddc0';
  ctx.beginPath(); ctx.ellipse(W*0.55,H*0.50,W*0.13,H*0.13,0.3,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // Craters
  for(let i=0;i<30;i++){
    ctx.save(); ctx.globalAlpha=0.22+Math.random()*0.22;
    ctx.fillStyle=Math.random()>0.5?'#6a5848':'#ccc0a8';
    ctx.beginPath(); ctx.arc(Math.random()*W,Math.random()*H,Math.random()*W*0.022+W*0.005,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* ── Texture dispatcher ───────────────────────────────────────────────────── */
const DRAWERS = { jupiter:drawJupiter, saturn:drawSaturn, venus:drawVenus, earth:drawEarth,
  mars:drawMars, mercury:drawMercury, uranus:drawUranus, neptune:drawNeptune,
  moon:drawMoon, sun:drawSun, pluto:drawPluto };

function makeTexture(name) {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  (DRAWERS[name] || DRAWERS.mercury)(ctx, W, H);
  return cv;
}

function makeSaturnRingCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 1;
  const ctx = cv.getContext('2d');
  drawSaturnRing(ctx, 256, 1);
  return cv;
}

/* ── Shared 12fps animation loop ─────────────────────────────────────────── */
const active = [];
let rafId = null, lastT = 0;
const TARGET_FPS = 12, DT = 1000 / TARGET_FPS;

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

  requestAnimationFrame(() => {
    containers.forEach(container => {
      const name = (container.dataset.planet || 'mercury').toLowerCase();
      const cfg  = CFG[name] || CFG.mercury;

      container.innerHTML = '';

      // Compute display size from actual rendered container
      const cw   = container.offsetWidth  || 280;
      const ch   = container.offsetHeight || 220;
      const size = Math.round(Math.min(cw * 0.84, ch * 0.88));
      const dpr  = Math.min(window.devicePixelRatio || 1, 2);

      // ── Canvas element ──
      const cv = document.createElement('canvas');
      cv.style.cssText = `width:${size}px;height:${size}px;display:block;margin:0 auto;`;
      container.appendChild(cv);

      // ── Three.js renderer ──
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size);
      renderer.setClearColor(0x000000, 0);

      // ── Scene & camera ──
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 2.6;

      // ── Lighting: key light from top-left, soft ambient ──
      const ambient  = new THREE.AmbientLight(0x283040, 0.38);
      const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.52);
      keyLight.position.set(-2, 0.8, 2);
      scene.add(ambient, keyLight);

      // ── Sphere with canvas texture ──
      const texCanvas = makeTexture(name);
      const texture   = new THREE.CanvasTexture(texCanvas);

      const geo  = new THREE.SphereGeometry(1, 64, 32);
      const mat  = new THREE.MeshPhongMaterial({
        map:       texture,
        specular:  new THREE.Color(0x0d0d1a),
        shininess: 14,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = THREE.MathUtils.degToRad(cfg.tilt || 0);
      scene.add(mesh);

      // ── Saturn ring system ──
      if (cfg.hasRing) {
        const ringGeo = new THREE.RingGeometry(1.26, 2.22, 128);
        // Remap UVs so texture maps radially
        const pos = ringGeo.attributes.position;
        const uv  = ringGeo.attributes.uv;
        const v3  = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const r = v3.length();
          uv.setXY(i, (r - 1.26) / (2.22 - 1.26), 0.5);
        }
        uv.needsUpdate = true;
        const ringCanvas = makeSaturnRingCanvas();
        const ringTex = new THREE.CanvasTexture(ringCanvas);
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.90,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
      }

      // First render — show immediately without waiting for loop tick
      renderer.render(scene, camera);

      // ── IntersectionObserver: pause off-screen planets ──
      const entry = { renderer, scene, camera, mesh, rotSpeed: cfg.speed, paused: false, disposed: false, observer: null };
      const io = new IntersectionObserver(([e]) => { entry.paused = !e.isIntersecting; }, { threshold: 0.05 });
      io.observe(container);
      entry.observer = io;
      active.push(entry);
    });

    if (active.length) rafId = requestAnimationFrame(loop);
  });
}

window.initPlanets3D = initPlanets3D;

})(); // end IIFE
