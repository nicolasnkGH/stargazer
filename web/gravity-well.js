// gravity-well.js
// 3D Gravity Well Hero Background — CPU-optimized

(function initGravityWell() {
  const canvas = document.getElementById('gravity-well-canvas');
  if (!canvas) return;

  const section = document.getElementById('hero-section');

  // Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.002);

  const camera = new THREE.PerspectiveCamera(45, section.clientWidth / section.clientHeight, 0.1, 1000);
  camera.position.set(0, 75, 140);
  camera.lookAt(0, -10, 0);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); // antialias off: big win
  renderer.setSize(section.clientWidth, section.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap retina

  // Reduced geometry: 25 segs instead of 40 (625 verts vs 1681)
  const planeSize = 400;
  const planeSegments = 25;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  geometry.rotateX(-Math.PI / 2);

  // Pre-compute distance lookup to avoid sqrt every frame
  const positions = geometry.attributes.position;
  const vertexCount = positions.count;
  const distances = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    distances[i] = Math.sqrt(x * x + z * z);
  }

  const material = new THREE.MeshBasicMaterial({
    color: 0x64748b,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Orbiting spheres — use low-poly (8 segs)
  const spheres = [];
  const sphereMaterial  = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xfde047 });

  function createSphere(radius, x, z, mat, orbitSpeed, orbitRadius) {
    const geo  = new THREE.SphereGeometry(radius, 8, 8); // was 32,32
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    spheres.push({ mesh, orbitSpeed, orbitRadius, angle: Math.random() * Math.PI * 2 });
  }

  createSphere(12, 0,    0,   highlightMaterial, 0,      0);
  createSphere(3,  40,   20,  sphereMaterial,    0.005,  40);
  createSphere(5,  -60,  -10, sphereMaterial,    0.003,  60);
  createSphere(2,  20,   -30, sphereMaterial,    0.01,   30);
  createSphere(4,  -80,  40,  sphereMaterial,    0.002,  80);

  // ── Intersection Observer: pause when hero is off-screen ──────────────────
  let heroVisible = true;
  const heroObserver = new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
  }, { threshold: 0.05 });
  heroObserver.observe(section);

  // ── Page Visibility: pause when tab is hidden ─────────────────────────────
  let pageVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
  });

  // ── Animation Loop — capped at 20fps (gravity well doesn't need 60fps) ────
  let time = 0;
  let lastTime = 0;
  const FPS_INTERVAL = 1000 / 20; // 20fps

  function animate(now) {
    requestAnimationFrame(animate);

    // Skip if tab hidden or section scrolled out of view
    if (!pageVisible || !heroVisible) return;
    if (now - lastTime < FPS_INTERVAL) return;
    lastTime = now;

    time += 0.01;

    // Deform grid using pre-computed distances (no sqrt per frame)
    const pos = plane.geometry.attributes.position;
    for (let i = 0; i < vertexCount; i++) {
      const d = distances[i];
      let y = d < 100 ? -40 * Math.exp(-(d * d) / 1000) : 0;
      y += Math.sin(d * 0.05 - time * 2) * 2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    plane.rotation.y = time * 0.05;

    spheres.forEach(s => {
      if (s.orbitRadius > 0) {
        s.angle += s.orbitSpeed;
        s.mesh.position.x = Math.cos(s.angle) * s.orbitRadius;
        s.mesh.position.z = Math.sin(s.angle) * s.orbitRadius;
        const d = Math.sqrt(s.mesh.position.x ** 2 + s.mesh.position.z ** 2);
        s.mesh.position.y = (-40 * Math.exp(-(d * d) / 1000)) + 5;
      } else {
        s.mesh.position.y = -35 + Math.sin(time) * 2;
      }
    });

    renderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (!camera || !renderer) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  });
  resizeObserver.observe(section);

  animate(performance.now());
})();
