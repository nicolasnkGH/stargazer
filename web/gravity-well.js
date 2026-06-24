// gravity-well.js — Elegant Hero (unabyss-inspired)
// Three.js grid deformation + 2D canvas radial-gradient glow overlay
// Capped at 15fps, fully paused when off-screen / tab hidden

(function initGravityWell() {
  const canvas     = document.getElementById('gravity-well-canvas');
  const glowCanvas = document.getElementById('hero-glow-canvas');
  if (!canvas) return;

  const section = document.getElementById('hero-section');
  const w = section.clientWidth;
  const h = section.clientHeight;

  // ── 2D glow overlay ───────────────────────────────────────────────────────
  let glowCtx = null;
  if (glowCanvas) {
    glowCanvas.width  = w;
    glowCanvas.height = h;
    glowCtx = glowCanvas.getContext('2d');
  }

  // ── Three.js ──────────────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(0, 90, 160);
  camera.lookAt(0, -25, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));

  // ── Grid — ghostly faint, fewer segments ─────────────────────────────────
  const planeSize     = 520;
  const planeSegments = 18;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  geometry.rotateX(-Math.PI / 2);

  const positions   = geometry.attributes.position;
  const vertexCount = positions.count;
  const distances   = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    distances[i] = Math.sqrt(x * x + z * z);
  }

  const gridMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.09
  });
  const plane = new THREE.Mesh(geometry, gridMat);
  scene.add(plane);

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x101828, 1.0));
  const sunPointLight = new THREE.PointLight(0xffcc66, 4.0, 250);
  sunPointLight.position.set(0, 10, 0);
  scene.add(sunPointLight);

  // ── Sphere definitions ────────────────────────────────────────────────────
  const sphereDefs = [
    { r: 13, ox: 0,   oz: 0,   orbitSpeed: 0,      orbitRadius: 0,
      color: 0xffaa20, emissive: 0xdd6600, glowColor: [255,150,30],  glowSize: 100, isCenter: true },
    { r: 4,  ox: 55,  oz: 18,  orbitSpeed: 0.0038,  orbitRadius: 58,
      color: 0xc8d4e2, emissive: 0x080c18, glowColor: [140,170,210], glowSize: 42 },
    { r: 6,  ox: -68, oz: -14, orbitSpeed: 0.0022,  orbitRadius: 70,
      color: 0xb8c8d8, emissive: 0x060a14, glowColor: [110,150,200], glowSize: 56 },
    { r: 2.5, ox: 28, oz: -38, orbitSpeed: 0.0085, orbitRadius: 38,
      color: 0xd8e4f0, emissive: 0x0a0e1c, glowColor: [160,190,230], glowSize: 26 },
  ];

  const sphereObjects = sphereDefs.map(def => {
    const geo = new THREE.SphereGeometry(def.r, 16, 12);
    const mat = new THREE.MeshPhongMaterial({
      color:    def.color,
      emissive: def.emissive,
      shininess: def.isCenter ? 60 : 20,
      specular:  0x223344,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.ox, def.isCenter ? -30 : 0, def.oz);
    scene.add(mesh);
    return { mesh, angle: Math.random() * Math.PI * 2, ...def };
  });

  // ── Visibility guards ─────────────────────────────────────────────────────
  let heroVisible = true;
  new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(section);
  let pageVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

  // ── Project 3D → 2D for glow overlay ─────────────────────────────────────
  const _projVec = new THREE.Vector3();
  function toScreen(mesh) {
    _projVec.setFromMatrixPosition(mesh.matrixWorld);
    _projVec.project(camera);
    const cw = glowCanvas ? glowCanvas.width  : w;
    const ch = glowCanvas ? glowCanvas.height : h;
    return { x: (_projVec.x + 1) / 2 * cw, y: (-_projVec.y + 1) / 2 * ch };
  }

  function drawGlows() {
    if (!glowCtx || !glowCanvas) return;
    glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
    sphereObjects.forEach(s => {
      const p = toScreen(s.mesh);
      const r = s.glowSize;
      const [cr, cg, cb] = s.glowColor;
      const g = glowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      if (s.isCenter) {
        g.addColorStop(0.00, `rgba(${cr},${cg},${cb},1.00)`);
        g.addColorStop(0.18, `rgba(${cr},${cg},${cb},0.85)`);
        g.addColorStop(0.42, `rgba(${cr},${cg},${cb},0.40)`);
        g.addColorStop(0.68, `rgba(${cr},${cg},${cb},0.13)`);
        g.addColorStop(1.00, `rgba(${cr},${cg},${cb},0.00)`);
      } else {
        g.addColorStop(0.00, `rgba(${cr},${cg},${cb},0.95)`);
        g.addColorStop(0.28, `rgba(${cr},${cg},${cb},0.60)`);
        g.addColorStop(0.58, `rgba(${cr},${cg},${cb},0.20)`);
        g.addColorStop(1.00, `rgba(${cr},${cg},${cb},0.00)`);
      }
      glowCtx.fillStyle = g;
      glowCtx.beginPath();
      glowCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      glowCtx.fill();
    });
  }

  // ── Animation loop — 15fps ─────────────────────────────────────────────────
  let time = 0, lastRaf = 0;
  const FPS_INTERVAL = 1000 / 15;

  function animate(now) {
    requestAnimationFrame(animate);
    if (!pageVisible || !heroVisible) return;
    if (now - lastRaf < FPS_INTERVAL) return;
    lastRaf = now;
    time += 0.013;

    const pos = plane.geometry.attributes.position;
    for (let i = 0; i < vertexCount; i++) {
      const d = distances[i];
      let y = d < 130 ? -48 * Math.exp(-(d * d) / 1300) : 0;
      y += Math.sin(d * 0.038 - time * 1.4) * 1.4;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    plane.rotation.y = time * 0.035;

    sphereObjects.forEach(s => {
      if (s.orbitRadius > 0) {
        s.angle += s.orbitSpeed;
        s.mesh.position.x = Math.cos(s.angle) * s.orbitRadius;
        s.mesh.position.z = Math.sin(s.angle) * s.orbitRadius;
        const d2 = Math.sqrt(s.mesh.position.x ** 2 + s.mesh.position.z ** 2);
        s.mesh.position.y = (-48 * Math.exp(-(d2 * d2) / 1300)) + 8;
      } else {
        s.mesh.position.y = -30 + Math.sin(time * 0.7) * 2;
      }
    });

    const sun = sphereObjects[0];
    sunPointLight.position.set(sun.mesh.position.x, sun.mesh.position.y + 40, sun.mesh.position.z);

    renderer.render(scene, camera);
    drawGlows();
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (glowCanvas) { glowCanvas.width = width; glowCanvas.height = height; }
    }
  }).observe(section);

  animate(performance.now());
})();
