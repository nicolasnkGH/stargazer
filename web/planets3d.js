// planets3d.js — CSS Gradient Planet Orbs
// Replaces 7 separate WebGL renderers with pure CSS — zero GPU overhead,
// dramatically better visuals than unlit textured spheres.
// initPlanets3D() is still called by app.js after planet data loads.

const PLANET_CSS = {
  sun: {
    gradient: 'radial-gradient(circle at 36% 32%, #fffbcc 0%, #ffe566 10%, #ffaa00 32%, #ff6600 58%, #cc3300 80%, #7a1500 100%)',
    glow: '0 0 40px 16px rgba(255,180,0,0.60), 0 0 80px 35px rgba(255,100,0,0.28), 0 0 130px 60px rgba(255,50,0,0.10)',
    size: 140,
  },
  mercury: {
    gradient: 'radial-gradient(circle at 36% 30%, #ccccd8 0%, #9898aa 28%, #686878 60%, #3e3e4a 85%, #1e1e28 100%)',
    glow: '0 0 18px 5px rgba(130,130,155,0.28)',
    size: 90,
  },
  venus: {
    gradient: 'radial-gradient(circle at 36% 30%, #fff5cc 0%, #f0c050 22%, #d49030 50%, #a06015 78%, #5a3008 100%)',
    glow: '0 0 20px 6px rgba(230,170,60,0.32)',
    size: 110,
  },
  earth: {
    gradient: 'radial-gradient(circle at 36% 30%, #a0e8ff 0%, #2090e8 18%, #1060b8 42%, #0a3078 68%, #061840 100%), radial-gradient(circle at 62% 42%, rgba(255,255,255,0.18) 0%, transparent 30%)',
    glow: '0 0 22px 7px rgba(40,130,230,0.38)',
    size: 110,
  },
  mars: {
    gradient: 'radial-gradient(circle at 36% 30%, #ff9966 0%, #cc4020 26%, #993010 55%, #661500 80%, #3a0800 100%)',
    glow: '0 0 18px 5px rgba(210,70,30,0.32)',
    size: 100,
  },
  jupiter: {
    gradient: [
      'radial-gradient(circle at 36% 30%, rgba(240,225,185,0.95) 0%, transparent 55%)',
      'repeating-linear-gradient(175deg, #c8a060 0%, #e8d0a0 8%, #a07840 14%, #d4b878 20%, #886030 26%, #d0a860 34%, #906830 42%, #e0c888 50%, #a08040 58%, #d4b878 66%, #886030 74%, #c8a060 82%, #e8d0a0 90%, #a07840 100%)',
    ].join(', '),
    glow: '0 0 22px 7px rgba(190,150,70,0.32)',
    size: 130,
  },
  saturn: {
    gradient: 'radial-gradient(circle at 36% 30%, #f0e0b0 0%, #d4b870 24%, #b09040 54%, #806020 78%, #4a3808 100%)',
    glow: '0 0 20px 6px rgba(190,160,70,0.30)',
    size: 115,
    hasRing: true,
  },
  uranus: {
    gradient: 'radial-gradient(circle at 36% 30%, #d8f4ff 0%, #80d8f0 22%, #40b0d8 50%, #1e8098 76%, #0a3840 100%)',
    glow: '0 0 18px 5px rgba(60,180,225,0.30)',
    size: 108,
  },
  neptune: {
    gradient: 'radial-gradient(circle at 36% 30%, #9090ff 0%, #4050e0 24%, #2030b8 52%, #101880 76%, #080c42 100%)',
    glow: '0 0 18px 5px rgba(55,75,230,0.32)',
    size: 108,
  },
  moon: {
    gradient: 'radial-gradient(circle at 36% 30%, #f0f0f4 0%, #c4c4cc 24%, #9898a4 52%, #6a6a74 78%, #3a3a42 100%)',
    glow: '0 0 16px 4px rgba(180,180,200,0.26)',
    size: 100,
  },
};

function initPlanets3D() {
  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (containers.length === 0) return;

  containers.forEach(container => {
    container.innerHTML = '';
    const planetName = (container.dataset.planet || 'mercury').toLowerCase();
    const cfg = PLANET_CSS[planetName] || PLANET_CSS.mercury;

    // Wrapper keeps container flex-centering working
    const wrap = document.createElement('div');
    wrap.className = 'planet-orb-wrap';

    const orb = document.createElement('div');
    orb.className = `planet-orb planet-orb-${planetName}`;
    orb.style.cssText = [
      `width:${cfg.size}px`,
      `height:${cfg.size}px`,
      `border-radius:50%`,
      `background:${cfg.gradient}`,
      `box-shadow:${cfg.glow}`,
      `position:relative`,
      `flex-shrink:0`,
    ].join(';');

    if (cfg.hasRing) {
      const rw = Math.round(cfg.size * 2.3);
      const rh = Math.round(cfg.size * 0.55);
      const ring = document.createElement('div');
      ring.className = 'planet-saturn-ring';
      ring.style.cssText = [
        `position:absolute`,
        `top:50%`,
        `left:50%`,
        `transform:translate(-50%,-50%) rotateX(72deg)`,
        `width:${rw}px`,
        `height:${rh}px`,
        `border-radius:50%`,
        `border:${Math.round(cfg.size * 0.12)}px solid rgba(220,190,110,0.55)`,
        `box-shadow:0 0 12px rgba(210,180,100,0.25)`,
        `pointer-events:none`,
      ].join(';');
      orb.appendChild(ring);
    }

    wrap.appendChild(orb);
    container.appendChild(wrap);
  });
}

window.initPlanets3D = initPlanets3D;
