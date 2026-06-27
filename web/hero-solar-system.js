// hero-solar-system.js — Immersive 3D solar system hero
// Beautiful textured planets orbiting a glowing sun, viewed from a cinematic angle
// Text floats directly over the scene — no glass card needed
// Runs at 25fps, pauses when hero section is off-screen or tab hidden

(function initHeroSolarSystem() {
  const canvas = document.getElementById('solar-system-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const section = document.getElementById('hero-section');
  let w = section.clientWidth;
  let h = section.clientHeight;

  // ── Three.js scene ────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // Camera: cinematic low-angle perspective — planets feel large and close
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
  camera.position.set(0, 65, 95);  // Slightly higher and further back
  camera.lookAt(0, 15, 0);         // Look above the origin to shift the scene down on screen

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.setSize(w, h);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Starfield ─────────────────────────────────────────────────────────────
  (function () {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      sizes[i] = Math.random() * 0.5 + 0.15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.85,
    });
    scene.add(new THREE.Points(geo, mat));
  })();

  // ── Lighting — warm sunlight + subtle fill ────────────────────────────────
  scene.add(new THREE.AmbientLight(0x1a1a30, 1.0));
  const sunLight = new THREE.PointLight(0xffeecc, 5.0, 300, 1.2);
  sunLight.position.set(0, 5, 0);
  scene.add(sunLight);
  const hemiLight = new THREE.HemisphereLight(0x3344aa, 0x111122, 0.4);
  scene.add(hemiLight);
  const rimLight = new THREE.DirectionalLight(0x4466aa, 0.3);
  rimLight.position.set(40, 20, -40);
  scene.add(rimLight);

  // ── Planet definitions ────────────────────────────────────────────────────
  // Sizes tuned for visual impact at the camera distance
  const PLANETS = [
    { name: 'sun',     radius: 7,   orbit: 0,   speed: 0,       tex: '/assets/2k_sun.jpg',              isSun: true, color: 0xffaa00 },
    { name: 'mercury', radius: 1.2, orbit: 14,  speed: 0.022,   tex: '/assets/mercury.jpg',             tilt: 0.03,  color: 0x888888 },
    { name: 'venus',   radius: 2.4, orbit: 22,  speed: 0.010,   tex: '/assets/venus.jpg',               tilt: 177.4, color: 0xe3bb76 },
    { name: 'earth',   radius: 2.6, orbit: 32,  speed: 0.007,   tex: '/assets/2k_earth_daymap.jpg',     tilt: 23.4,  color: 0x2233ff },
    { name: 'mars',    radius: 1.8, orbit: 42,  speed: 0.005,   tex: '/assets/mars.jpg',                tilt: 25.2,  color: 0xff5522 },
    { name: 'jupiter', radius: 5.0, orbit: 58,  speed: 0.0016,  tex: '/assets/jupiter.jpg',             tilt: 3.1,   color: 0xc49b73 },
    { name: 'saturn',  radius: 4.0, orbit: 76,  speed: 0.0009,  tex: '/assets/saturn.jpg',              tilt: 26.7,  color: 0xeadaa5, hasRing: true, ringTex: '/assets/saturn_ring_color.jpg' },
    { name: 'uranus',  radius: 2.8, orbit: 92,  speed: 0.0004,  tex: '/assets/uranus.jpg',              tilt: 97.8,  color: 0x99ffff },
    { name: 'neptune', radius: 2.6, orbit: 106, speed: 0.0003,  tex: '/assets/neptune.jpg',             tilt: 28.3,  color: 0x3344ff },
  ];

  // ── Saturn ring geometry with proper UV mapping ───────────────────────────
  function makeSaturnRingGeo(inner, outer) {
    const geo = new THREE.RingGeometry(inner, outer, 128);
    const pos = geo.attributes.position;
    const uv  = geo.attributes.uv;
    const v3  = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const r = v3.length();
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }

  // ── Procedural sun texture (fallback) ─────────────────────────────────────
  function makeSunTexture() {
    const W = 512, H = 256, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const bg = ctx.createRadialGradient(W * 0.42, H * 0.42, 0, W * 0.5, H * 0.5, W * 0.55);
    bg.addColorStop(0, '#fff8d0'); bg.addColorStop(0.3, '#ffe060');
    bg.addColorStop(0.7, '#ff8800'); bg.addColorStop(1, '#cc3300');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.12;
    for (let i = 0; i < 250; i++) {
      ctx.fillStyle = 'rgba(255,195,50,0.85)';
      ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 6 + 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return new THREE.CanvasTexture(cv);
  }

  // ── Create planet meshes ──────────────────────────────────────────────────
  const loader = new THREE.TextureLoader();
  const planetObjects = [];

  PLANETS.forEach((def, idx) => {
    const geo = new THREE.SphereGeometry(def.radius, 64, 48);
    let mat;

    if (def.isSun) {
      // Sun: emissive glow material
      const sunTex = loader.load(
        def.tex,
        () => {
          mat.color.setHex(0xffffff); // reset color so texture shows normally
        },
        undefined,
        (err) => {
          console.error("Sun texture failed to load:", def.tex, err);
          mat.map = makeSunTexture();
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
        }
      );
      sunTex.encoding = THREE.sRGBEncoding;
      mat = new THREE.MeshBasicMaterial({ map: sunTex, color: def.color });
    } else {
      // Textured planets with realistic material
      const tex = loader.load(
        def.tex,
        () => {
          mat.color.setHex(0xffffff);
        },
        undefined,
        (err) => console.error("Planet texture failed to load:", def.tex, err)
      );
      tex.encoding = THREE.sRGBEncoding;
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: def.color,
        roughness: 0.82,
        metalness: 0.02,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);

    // Axial tilt
    if (def.tilt) {
      mesh.rotation.x = THREE.MathUtils.degToRad(def.tilt);
    }

    // Spread planets at visually balanced starting positions
    const angle = (idx / PLANETS.length) * Math.PI * 2 + idx * 0.8;

    if (def.orbit > 0) {
      mesh.position.set(Math.cos(angle) * def.orbit, 0, Math.sin(angle) * def.orbit);
    }

    scene.add(mesh);

    // ── Sun glow: layered sprite for realistic corona ──
    if (def.isSun) {
      // Inner warm glow
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 256; glowCanvas.height = 256;
      const gctx = glowCanvas.getContext('2d');
      const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0,    'rgba(255,230,140,0.50)');
      grad.addColorStop(0.15, 'rgba(255,200,80,0.30)');
      grad.addColorStop(0.35, 'rgba(255,140,30,0.12)');
      grad.addColorStop(0.6,  'rgba(255,100,10,0.04)');
      grad.addColorStop(1,    'rgba(255,60,0,0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 256, 256);
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
      });
      const glowSprite = new THREE.Sprite(glowMat);
      glowSprite.scale.set(28, 28, 1);
      mesh.add(glowSprite);

      // Outer diffuse halo
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 256; haloCanvas.height = 256;
      const hctx = haloCanvas.getContext('2d');
      const hgrad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      hgrad.addColorStop(0,   'rgba(255,200,100,0.08)');
      hgrad.addColorStop(0.4, 'rgba(255,150,50,0.03)');
      hgrad.addColorStop(1,   'rgba(255,80,0,0)');
      hctx.fillStyle = hgrad;
      hctx.fillRect(0, 0, 256, 256);
      const haloTex = new THREE.CanvasTexture(haloCanvas);
      const haloMat = new THREE.SpriteMaterial({
        map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      });
      const haloSprite = new THREE.Sprite(haloMat);
      haloSprite.scale.set(55, 55, 1);
      mesh.add(haloSprite);
    }

    const obj = {
      mesh,
      angle,
      orbitRadius: def.orbit,
      orbitSpeed: def.speed,
      selfRotation: def.isSun ? 0.002 : 0.005 + Math.random() * 0.003,
    };

    // Saturn ring
    if (def.hasRing) {
      const innerR = def.radius * 1.35;
      const outerR = def.radius * 2.3;
      const ringGeo = makeSaturnRingGeo(innerR, outerR);
      if (def.ringTex) {
        const ringTex = loader.load(
          def.ringTex, 
          () => {
            ringMat.color.setHex(0xffffff);
            ringMat.opacity = 0.85;
          },
          undefined,
          (err) => console.error("Saturn ring texture failed to load:", def.ringTex, err)
        );
        ringTex.encoding = THREE.sRGBEncoding;
        var ringMat = new THREE.MeshBasicMaterial({
          map: ringTex, color: 0xc8b890, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);
      } else {
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xc8b890, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);
      }
    }

    planetObjects.push(obj);
  });

  // ── Orbital path lines — very subtle ──────────────────────────────────────
  PLANETS.forEach(def => {
    if (def.orbit <= 0) return;
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * def.orbit, -0.15, Math.sin(a) * def.orbit));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x334477, transparent: true, opacity: 0.12,
    });
    scene.add(new THREE.Line(lineGeo, lineMat));
  });

  // ── Visibility guards ─────────────────────────────────────────────────────
  let heroVisible = true;
  new IntersectionObserver(
    e => { heroVisible = e[0].isIntersecting; }, { threshold: 0.05 }
  ).observe(section);
  let pageVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

  // ── Animation loop — 25fps ────────────────────────────────────────────────
  let lastRaf = 0, time = 0;
  const FPS_INTERVAL = 1000 / 25;

  function animate(now) {
    requestAnimationFrame(animate);
    if (!pageVisible || !heroVisible) return;
    if (now - lastRaf < FPS_INTERVAL) return;
    lastRaf = now;
    time += 0.013;

    planetObjects.forEach(p => {
      // Orbital motion
      if (p.orbitRadius > 0) {
        p.angle += p.orbitSpeed;
        p.mesh.position.x = Math.cos(p.angle) * p.orbitRadius;
        p.mesh.position.z = Math.sin(p.angle) * p.orbitRadius;
      }
      // Self-rotation
      p.mesh.rotation.y += p.selfRotation;
    });

    // Subtle sun pulse
    const sun = planetObjects[0];
    const pulse = 1.0 + Math.sin(time * 1.5) * 0.02;
    sun.mesh.scale.setScalar(pulse);
    sunLight.intensity = 5.0 * pulse;

    renderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      w = width; h = height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }).observe(section);

  animate(performance.now());
})();
