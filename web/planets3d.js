// planets3d.js — Photorealistic CSS Gradient Planet Orbs v5
// Each planet has: offset specular highlight, realistic color ramp, atmospheric rim glow
// Zero WebGL — pure CSS, no GPU overhead

const PLANET_CSS = {
  sun: {
    gradient: [
      // Bright specular hotspot at 28% 22%
      'radial-gradient(ellipse 35% 30% at 28% 22%, rgba(255,255,220,0.98) 0%, rgba(255,220,80,0.60) 30%, transparent 70%)',
      // Main color body
      'radial-gradient(circle at 45% 40%, #fff4a0 0%, #ffe04a 12%, #ffaa00 30%, #ff7700 52%, #cc4400 72%, #882200 88%, #4a0d00 100%)',
    ].join(', '),
    glow: '0 0 50px 20px rgba(255,160,0,0.65), 0 0 100px 50px rgba(255,100,0,0.30), 0 0 180px 90px rgba(255,60,0,0.12)',
    size: 148,
  },
  mercury: {
    gradient: [
      'radial-gradient(ellipse 32% 28% at 30% 24%, rgba(220,215,210,0.95) 0%, rgba(185,180,175,0.55) 35%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #ddd8d0 0%, #b0a898 20%, #807870 42%, #585050 65%, #342e2e 82%, #1a1616 100%)',
    ].join(', '),
    glow: '0 0 18px 6px rgba(160,150,140,0.30)',
    size: 96,
  },
  venus: {
    gradient: [
      'radial-gradient(ellipse 34% 30% at 30% 22%, rgba(255,250,210,0.96) 0%, rgba(240,200,100,0.55) 32%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #fffacc 0%, #f5d060 14%, #d49030 38%, #a86820 62%, #6e4010 82%, #3a200a 100%)',
    ].join(', '),
    glow: '0 0 22px 8px rgba(230,175,60,0.38)',
    size: 116,
  },
  earth: {
    gradient: [
      // Polar ice cap highlight
      'radial-gradient(ellipse 36% 32% at 30% 20%, rgba(220,240,255,0.96) 0%, rgba(120,200,255,0.50) 35%, transparent 65%)',
      // Ocean body
      'radial-gradient(circle at 42% 38%, #c8eaff 0%, #2888e8 16%, #1060c8 38%, #083888 62%, #051a48 80%, #020c22 100%)',
      // Cloud wisps overlay
      'radial-gradient(ellipse 50% 30% at 65% 55%, rgba(255,255,255,0.12) 0%, transparent 70%)',
    ].join(', '),
    glow: '0 0 24px 8px rgba(40,136,232,0.40)',
    size: 116,
  },
  mars: {
    gradient: [
      'radial-gradient(ellipse 32% 28% at 30% 22%, rgba(255,200,170,0.96) 0%, rgba(220,130,90,0.55) 32%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #ffb090 0%, #dd5530 18%, #aa3018 42%, #781800 65%, #4a0c00 82%, #260600 100%)',
    ].join(', '),
    glow: '0 0 20px 6px rgba(210,80,40,0.38)',
    size: 106,
  },
  jupiter: {
    // Banded giant — layered gradients simulate cloud belts
    gradient: [
      // Specular highlight
      'radial-gradient(ellipse 40% 20% at 28% 18%, rgba(255,250,230,0.70) 0%, transparent 60%)',
      // Belt stripes via repeating-linear
      'repeating-linear-gradient(175deg, #c8a060 0%, #e8d090 7%, #a07035 13%, #d4b060 20%, #886028 27%, #d0a850 35%, #907040 43%, #e0c878 51%, #a08040 59%, #c8a060 67%, #e8d090 75%, #a07035 83%, #c8a060 91%, #e8d090 100%)',
      // Global spherical shading
      'radial-gradient(circle at 45% 42%, rgba(255,240,180,0.50) 0%, transparent 55%), radial-gradient(circle at 55% 55%, rgba(80,40,0,0.45) 20%, transparent 70%)',
    ].join(', '),
    glow: '0 0 24px 8px rgba(200,160,70,0.38)',
    size: 138,
  },
  saturn: {
    gradient: [
      'radial-gradient(ellipse 34% 28% at 30% 22%, rgba(255,248,220,0.92) 0%, rgba(230,190,100,0.50) 35%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #fff8cc 0%, #e8c860 16%, #c09040 38%, #8a6420 62%, #543c08 82%, #2c1e00 100%)',
    ].join(', '),
    glow: '0 0 22px 7px rgba(200,170,70,0.34)',
    size: 120,
    hasRing: true,
  },
  uranus: {
    gradient: [
      'radial-gradient(ellipse 34% 30% at 30% 22%, rgba(220,248,255,0.94) 0%, rgba(150,225,245,0.55) 32%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #d8f4ff 0%, #78d4f0 18%, #38a8d8 42%, #1e7098 65%, #0c3848 82%, #041820 100%)',
    ].join(', '),
    glow: '0 0 20px 6px rgba(56,168,216,0.34)',
    size: 110,
  },
  neptune: {
    gradient: [
      'radial-gradient(ellipse 32% 28% at 30% 22%, rgba(180,190,255,0.94) 0%, rgba(100,120,240,0.50) 32%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #9898ff 0%, #3848e8 18%, #1c28c8 42%, #0c1490 65%, #060a50 82%, #02041e 100%)',
    ].join(', '),
    glow: '0 0 20px 6px rgba(60,72,232,0.36)',
    size: 110,
  },
  moon: {
    gradient: [
      'radial-gradient(ellipse 32% 28% at 30% 22%, rgba(248,248,252,0.96) 0%, rgba(210,210,220,0.50) 35%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #f0f0f4 0%, #c8c8d0 18%, #9898a8 42%, #686878 65%, #3a3a48 82%, #1c1c28 100%)',
    ].join(', '),
    glow: '0 0 18px 5px rgba(180,180,200,0.28)',
    size: 100,
  },
  pluto: {
    gradient: [
      'radial-gradient(ellipse 30% 26% at 30% 24%, rgba(210,200,190,0.92) 0%, rgba(170,158,145,0.45) 35%, transparent 65%)',
      'radial-gradient(circle at 42% 38%, #d8ccc0 0%, #a89080 22%, #786050 48%, #504038 70%, #2e2420 88%, #140e0a 100%)',
    ].join(', '),
    glow: '0 0 14px 4px rgba(160,140,120,0.24)',
    size: 82,
  },
};

function initPlanets3D() {
  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (containers.length === 0) return;

  containers.forEach(container => {
    container.innerHTML = '';
    const planetName = (container.dataset.planet || 'mercury').toLowerCase();
    const cfg = PLANET_CSS[planetName] || PLANET_CSS.mercury;

    const wrap = document.createElement('div');
    wrap.className = 'planet-orb-wrap';

    // Outer atmosphere halo (for planetary glow feel)
    const halo = document.createElement('div');
    halo.className = 'planet-halo';
    halo.style.cssText = [
      `width:${cfg.size + 32}px`,
      `height:${cfg.size + 32}px`,
      `border-radius:50%`,
      `position:absolute`,
      `background:transparent`,
      `box-shadow:${cfg.glow}`,
      `pointer-events:none`,
      `flex-shrink:0`,
    ].join(';');

    const orb = document.createElement('div');
    orb.className = `planet-orb planet-orb-${planetName}`;
    orb.style.cssText = [
      `width:${cfg.size}px`,
      `height:${cfg.size}px`,
      `border-radius:50%`,
      `background:${cfg.gradient}`,
      `position:relative`,
      `flex-shrink:0`,
      `z-index:1`,
    ].join(';');

    // Terminator shadow overlay — makes sphere feel 3D
    const terminator = document.createElement('div');
    terminator.className = 'planet-terminator';
    terminator.style.cssText = [
      `position:absolute`,
      `inset:0`,
      `border-radius:50%`,
      `background:radial-gradient(circle at 72% 62%, rgba(0,0,0,0.0) 25%, rgba(0,0,8,0.50) 65%, rgba(0,0,15,0.82) 100%)`,
      `pointer-events:none`,
    ].join(';');
    orb.appendChild(terminator);

    if (cfg.hasRing) {
      const rw = Math.round(cfg.size * 2.4);
      const rh = Math.round(cfg.size * 0.55);
      const ringThk = Math.round(cfg.size * 0.13);
      const ring = document.createElement('div');
      ring.className = 'planet-saturn-ring';
      ring.style.cssText = [
        `position:absolute`,
        `top:50%`,
        `left:50%`,
        `transform:translate(-50%,-50%) rotateX(70deg)`,
        `width:${rw}px`,
        `height:${rh}px`,
        `border-radius:50%`,
        `border:${ringThk}px solid rgba(220,190,100,0.65)`,
        `box-shadow:0 0 14px rgba(215,185,90,0.30), inset 0 0 8px rgba(180,150,60,0.22)`,
        `pointer-events:none`,
        `z-index:0`,
      ].join(';');
      wrap.appendChild(ring);
    }

    wrap.appendChild(halo);
    wrap.appendChild(orb);
    container.appendChild(wrap);
  });
}

window.initPlanets3D = initPlanets3D;
