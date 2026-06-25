// planets3d.js — Photorealistic Planet Orbs v6
// Matches reference: large spheres, rich textures, warm atmospheric glow
// Pure CSS — no WebGL, no canvas

const PLANET_CSS = {

  // ── Sun ─────────────────────────────────────────────────────────────────
  sun: {
    layers: [
      // Brilliant specular hotspot
      'radial-gradient(ellipse 38% 32% at 28% 22%, rgba(255,255,200,1.0) 0%, rgba(255,230,100,0.70) 25%, transparent 60%)',
      // Bright limb
      'radial-gradient(ellipse 20% 55% at 90% 50%, rgba(255,180,50,0.30) 0%, transparent 55%)',
      // Body gradient — white core → orange → deep red rim
      'radial-gradient(circle at 42% 40%, #fffff0 0%, #ffe84a 8%, #ffaa00 22%, #ff7700 42%, #cc3a00 62%, #881800 80%, #420800 100%)',
    ],
    glow: '0 0 55px 25px rgba(255,150,0,0.70), 0 0 110px 55px rgba(255,90,0,0.32), 0 0 200px 100px rgba(255,60,0,0.12)',
    size: 185,
  },

  // ── Mercury ─────────────────────────────────────────────────────────────
  // Rocky gold-brown — mimics reference Mercury look
  mercury: {
    layers: [
      // Specular hotspot — offset top-left
      'radial-gradient(ellipse 32% 26% at 34% 27%, rgba(235,215,165,0.95) 0%, rgba(200,170,115,0.50) 38%, transparent 68%)',
      // Surface texture patches
      'radial-gradient(ellipse 55% 38% at 22% 65%, rgba(128,82,30,0.48) 0%, transparent 58%)',
      'radial-gradient(ellipse 42% 30% at 74% 40%, rgba(155,108,48,0.36) 0%, transparent 52%)',
      'radial-gradient(ellipse 38% 22% at 50% 80%, rgba(100,60,18,0.38) 0%, transparent 52%)',
      'radial-gradient(ellipse 30% 28% at 65% 20%, rgba(180,138,72,0.28) 0%, transparent 50%)',
      // Main body — warm gold → dark brown
      'radial-gradient(circle at 42% 40%, #eed48a 0%, #c8a050 12%, #a07838 28%, #785224 48%, #503212 68%, #2c1806 86%, #120800 100%)',
    ],
    glow: '0 0 36px 16px rgba(185,142,62,0.48), 0 0 72px 36px rgba(150,105,35,0.22)',
    size: 152,
  },

  // ── Venus ───────────────────────────────────────────────────────────────
  // Volcanic orange-russet — matches the warm rocky look in reference
  venus: {
    layers: [
      // Primary specular — warm cream
      'radial-gradient(ellipse 34% 28% at 34% 26%, rgba(255,215,140,0.96) 0%, rgba(240,165,70,0.52) 35%, transparent 65%)',
      // Cloud texture patches — layered orange-brown swirls
      'radial-gradient(ellipse 65% 42% at 20% 62%, rgba(168,72,12,0.52) 0%, transparent 58%)',
      'radial-gradient(ellipse 48% 32% at 72% 44%, rgba(200,108,24,0.42) 0%, transparent 54%)',
      'radial-gradient(ellipse 55% 28% at 52% 78%, rgba(145,58,8,0.46) 0%, transparent 56%)',
      'radial-gradient(ellipse 35% 30% at 68% 18%, rgba(215,135,45,0.30) 0%, transparent 50%)',
      'radial-gradient(ellipse 40% 22% at 30% 82%, rgba(120,45,5,0.38) 0%, transparent 50%)',
      // Base body — vivid amber-orange core → deep russet → charcoal rim
      'radial-gradient(circle at 40% 38%, #ffc068 0%, #e87828 12%, #c05018 28%, #963010 48%, #6a1c06 68%, #381000 86%, #180500 100%)',
    ],
    glow: '0 0 42px 20px rgba(225,120,28,0.58), 0 0 85px 42px rgba(180,78,10,0.26), 0 0 150px 75px rgba(140,50,5,0.10)',
    size: 172,
  },

  // ── Earth ───────────────────────────────────────────────────────────────
  earth: {
    layers: [
      // Polar ice specular
      'radial-gradient(ellipse 38% 30% at 32% 20%, rgba(225,242,255,0.98) 0%, rgba(145,205,255,0.52) 35%, transparent 65%)',
      // Cloud layer
      'radial-gradient(ellipse 60% 30% at 62% 52%, rgba(255,255,255,0.14) 0%, transparent 65%)',
      'radial-gradient(ellipse 42% 20% at 28% 68%, rgba(255,255,255,0.10) 0%, transparent 55%)',
      // Landmass hints (green-brown)
      'radial-gradient(ellipse 45% 28% at 58% 38%, rgba(38,120,40,0.22) 0%, transparent 55%)',
      // Ocean body
      'radial-gradient(circle at 42% 38%, #d0eeff 0%, #3898f0 14%, #1262d0 34%, #0844a0 56%, #042270 76%, #010e38 92%, #000410 100%)',
    ],
    glow: '0 0 38px 16px rgba(45,145,240,0.46), 0 0 76px 38px rgba(10,90,200,0.22)',
    size: 160,
  },

  // ── Mars ─────────────────────────────────────────────────────────────────
  mars: {
    layers: [
      'radial-gradient(ellipse 33% 27% at 33% 26%, rgba(255,185,145,0.94) 0%, rgba(220,118,78,0.48) 36%, transparent 66%)',
      'radial-gradient(ellipse 55% 35% at 24% 66%, rgba(155,52,18,0.44) 0%, transparent 58%)',
      'radial-gradient(ellipse 44% 28% at 70% 42%, rgba(185,80,32,0.36) 0%, transparent 52%)',
      'radial-gradient(ellipse 36% 22% at 52% 78%, rgba(128,38,10,0.38) 0%, transparent 50%)',
      'radial-gradient(circle at 42% 38%, #ffb08a 0%, #e06030 12%, #b83818 30%, #882010 50%, #5a1008 70%, #2e0602 88%, #130200 100%)',
    ],
    glow: '0 0 36px 16px rgba(210,78,34,0.46), 0 0 72px 36px rgba(165,45,12,0.22)',
    size: 158,
  },

  // ── Jupiter ─────────────────────────────────────────────────────────────
  // PROMINENT horizontal band system — the defining feature
  jupiter: {
    layers: [
      // Specular highlight — wide diffuse
      'radial-gradient(ellipse 44% 24% at 30% 18%, rgba(255,248,220,0.78) 0%, rgba(240,210,130,0.35) 42%, transparent 70%)',
      // Secondary limb highlight
      'radial-gradient(ellipse 18% 60% at 92% 48%, rgba(225,185,100,0.22) 0%, transparent 58%)',
      // ── Cloud band stripes ── repeating horizontal belts
      `repeating-linear-gradient(177deg,
        #bf9850  0%,  #cda458  2.5%,
        #edd898  5%,  #f8e8b0  8%,
        #a06830  10.5%, #8c5c28 13%,
        #cc9e4a  15.5%, #daa852 18%,
        #7e5020  20.5%, #6e4418 23%,
        #c89848  25.5%, #d4a250 28%,
        #f5e090  30.5%, #feeea8 33%,
        #9c6830  35.5%, #8a5c28 38%,
        #d0a24a  40.5%, #dcac52 43%,
        #886030  45.5%, #766030 48%,
        #e2c870  50.5%, #eed27a 53%,
        #9e7c38  55.5%, #8c6c30 58%,
        #c49840  60.5%, #cfa448 63%,
        #ecd88a  65.5%, #f8e89e 68%,
        #a06830  70.5%, #8c5a28 73%,
        #cca048  75.5%, #d8ac50 78%,
        #7e5020  80.5%, #6c4018 83%,
        #c09040  85.5%, #cca048 88%,
        #ecd88a  90.5%, #f8e89e 93%,
        #a46a32  95.5%, #c09848 98%,
        #edd898  100%)`,
      // Global spherical shadow overlay — dark rim + bright equator
      'radial-gradient(ellipse 110% 95% at 50% 50%, transparent 40%, rgba(40,18,0,0.45) 75%, rgba(15,6,0,0.75) 100%)',
    ],
    glow: '0 0 42px 18px rgba(198,155,65,0.52), 0 0 85px 42px rgba(155,112,38,0.25), 0 0 150px 75px rgba(120,80,20,0.10)',
    size: 178,
  },

  // ── Saturn ──────────────────────────────────────────────────────────────
  saturn: {
    layers: [
      'radial-gradient(ellipse 36% 28% at 32% 24%, rgba(255,248,215,0.90) 0%, rgba(232,192,100,0.50) 36%, transparent 65%)',
      `repeating-linear-gradient(178deg,
        #c8a858 0%, #d4b260 4%, #ecda90 8%, #f8eca8 12%,
        #a88440 15%, #b88e48 19%, #d8b860 23%,
        #785c28 26%, #886830 30%, #c0a050 34%,
        #e8d488 37%, #f4e098 41%, #a88440 45%,
        #c0a250 49%, #d0b058 53%, #8a7030 57%,
        #c0a850 61%, #ceb458 65%, #e8da88 69%,
        #f4e898 73%, #a88440 77%, #c0a450 81%,
        #d8b860 85%, #7e5c28 89%, #c0a050 93%, #e8d888 97%, #f6ec9e 100%)`,
      'radial-gradient(ellipse 110% 95% at 50% 50%, transparent 42%, rgba(35,18,0,0.42) 75%, rgba(12,6,0,0.72) 100%)',
    ],
    glow: '0 0 38px 16px rgba(196,162,68,0.48), 0 0 76px 38px rgba(155,120,42,0.22)',
    size: 158,
    hasRing: true,
  },

  // ── Uranus ──────────────────────────────────────────────────────────────
  uranus: {
    layers: [
      'radial-gradient(ellipse 36% 30% at 32% 24%, rgba(215,248,255,0.96) 0%, rgba(145,225,248,0.55) 35%, transparent 65%)',
      'radial-gradient(ellipse 55% 30% at 25% 62%, rgba(40,140,185,0.28) 0%, transparent 55%)',
      'radial-gradient(ellipse 42% 24% at 72% 45%, rgba(30,155,200,0.22) 0%, transparent 50%)',
      'radial-gradient(circle at 42% 40%, #d2f4ff 0%, #6cd0f0 16%, #32a8da 36%, #1878b0 58%, #0c4872 78%, #04202e 94%, #010810 100%)',
    ],
    glow: '0 0 34px 14px rgba(52,168,218,0.40), 0 0 68px 34px rgba(18,110,160,0.20)',
    size: 150,
  },

  // ── Neptune ─────────────────────────────────────────────────────────────
  neptune: {
    layers: [
      'radial-gradient(ellipse 34% 28% at 32% 24%, rgba(175,185,255,0.94) 0%, rgba(100,118,242,0.52) 35%, transparent 65%)',
      'radial-gradient(ellipse 50% 28% at 22% 60%, rgba(40,55,200,0.32) 0%, transparent 55%)',
      'radial-gradient(ellipse 40% 22% at 70% 42%, rgba(55,70,220,0.24) 0%, transparent 50%)',
      // Great dark spot hint
      'radial-gradient(ellipse 22% 18% at 58% 58%, rgba(5,8,60,0.50) 0%, transparent 60%)',
      'radial-gradient(circle at 42% 40%, #9898ff 0%, #3848e0 16%, #1c28cc 36%, #0c1498 58%, #060a58 78%, #020420 94%, #000108 100%)',
    ],
    glow: '0 0 34px 14px rgba(55,70,228,0.44), 0 0 68px 34px rgba(18,30,195,0.20)',
    size: 150,
  },

  // ── Moon ────────────────────────────────────────────────────────────────
  moon: {
    layers: [
      'radial-gradient(ellipse 34% 28% at 32% 24%, rgba(248,248,252,0.98) 0%, rgba(212,212,222,0.52) 38%, transparent 66%)',
      'radial-gradient(ellipse 48% 32% at 22% 65%, rgba(80,80,105,0.35) 0%, transparent 58%)',
      'radial-gradient(ellipse 38% 22% at 70% 38%, rgba(100,100,130,0.25) 0%, transparent 50%)',
      'radial-gradient(ellipse 28% 20% at 52% 75%, rgba(60,60,85,0.30) 0%, transparent 48%)',
      'radial-gradient(circle at 42% 40%, #f4f4f8 0%, #c8c8d4 16%, #989ab0 36%, #686878 56%, #3c3c50 76%, #1c1c28 92%, #080810 100%)',
    ],
    glow: '0 0 28px 10px rgba(175,175,200,0.30), 0 0 56px 28px rgba(120,120,155,0.14)',
    size: 140,
  },

  // ── Pluto ────────────────────────────────────────────────────────────────
  pluto: {
    layers: [
      'radial-gradient(ellipse 32% 26% at 32% 26%, rgba(215,205,192,0.90) 0%, rgba(175,160,142,0.46) 38%, transparent 66%)',
      'radial-gradient(ellipse 45% 30% at 24% 64%, rgba(105,82,55,0.38) 0%, transparent 55%)',
      'radial-gradient(ellipse 36% 22% at 68% 40%, rgba(130,108,80,0.28) 0%, transparent 48%)',
      'radial-gradient(circle at 42% 40%, #dccec0 0%, #a89080 20%, #7a6050 44%, #524038 66%, #2e2420 85%, #120e0a 100%)',
    ],
    glow: '0 0 22px 8px rgba(158,135,108,0.30), 0 0 45px 22px rgba(118,95,68,0.14)',
    size: 112,
  },
};

// ── Render all planet orbs ──────────────────────────────────────────────────
function initPlanets3D() {
  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (!containers.length) return;

  // Use rAF so layout is complete and container.offsetWidth is accurate
  requestAnimationFrame(() => {
    containers.forEach(container => {
      container.innerHTML = '';
      const planetName = (container.dataset.planet || 'mercury').toLowerCase();
      const cfg = PLANET_CSS[planetName] || PLANET_CSS.mercury;

      // ── Compute orb size to fit inside the rendered container ──
      const cw = container.offsetWidth  || 280;
      const ch = container.offsetHeight || 220;
      // Scale to 82% of width or 86% of height — whichever is smaller
      const maxByWidth  = Math.round(cw * 0.82);
      const maxByHeight = Math.round(ch * 0.86);
      const orbSize = Math.min(cfg.size, maxByWidth, maxByHeight);

      // ── Outer wrap — full container, centres all children ──
      const wrap = document.createElement('div');
      wrap.className = 'planet-orb-wrap';
      wrap.style.cssText = [
        'display:flex',
        'justify-content:center',
        'align-items:center',
        'position:relative',
        'width:100%',
        'height:100%',
        `animation:planetFloat ${6 + Math.random() * 2}s ease-in-out infinite`,
      ].join(';');

      // ── Atmospheric halo (absolute, behind orb via z-index:0) ──
      const halo = document.createElement('div');
      halo.style.cssText = [
        `width:${orbSize + 36}px`,
        `height:${orbSize + 36}px`,
        'border-radius:50%',
        'position:absolute',
        'top:50%',
        'left:50%',
        'transform:translate(-50%,-50%)',
        'background:transparent',
        `box-shadow:${cfg.glow}`,
        'pointer-events:none',
        'z-index:0',
      ].join(';');

      // ── Saturn ring ──
      if (cfg.hasRing) {
        const rw  = Math.round(orbSize * 2.55);
        const rh  = Math.round(orbSize * 0.58);
        const rth = Math.round(orbSize * 0.14);
        const ring = document.createElement('div');
        ring.style.cssText = [
          'position:absolute',
          'top:50%',
          'left:50%',
          `transform:translate(-50%,-50%) rotateX(68deg)`,
          `width:${rw}px`,
          `height:${rh}px`,
          'border-radius:50%',
          `border:${rth}px solid rgba(218,186,95,0.68)`,
          'box-shadow:0 0 18px rgba(210,178,80,0.35), inset 0 0 10px rgba(175,142,55,0.25)',
          'pointer-events:none',
          'z-index:1',
        ].join(';');
        wrap.appendChild(ring);
      }

      // ── Main orb div ──
      const orb = document.createElement('div');
      orb.className = `planet-orb planet-orb-${planetName}`;
      orb.style.cssText = [
        `width:${orbSize}px`,
        `height:${orbSize}px`,
        'border-radius:50%',
        `background:${cfg.layers.join(', ')}`,
        'position:relative',
        'z-index:2',
        'flex-shrink:0',
      ].join(';');

      // Terminator — dark shadow on night-side for 3D depth
      const term = document.createElement('div');
      term.style.cssText = [
        'position:absolute',
        'inset:0',
        'border-radius:50%',
        'background:radial-gradient(circle at 70% 65%, rgba(0,0,5,0.0) 22%, rgba(0,0,10,0.45) 58%, rgba(0,0,15,0.80) 100%)',
        'pointer-events:none',
      ].join(';');
      orb.appendChild(term);

      wrap.appendChild(halo);
      wrap.appendChild(orb);
      container.appendChild(wrap);
    });
  });
}

window.initPlanets3D = initPlanets3D;
