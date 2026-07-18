// moon3d.js — Three.js Moon renderer v6
// Uses actual moon_texture.jpg (238KB, confirmed OK)
// Procedural bump map — replaces the broken 14-byte moon_bump.jpg placeholder
// IntersectionObserver: pauses animation when moon card is scrolled off screen

function initMoon3D() {
  const container = document.getElementById('moon-3d-container');
  if (!container || typeof THREE === 'undefined') return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        obs.unobserve(container);
        setupMoon3D(container);
      }
    });
  }, { threshold: 0.05 });
  observer.observe(container);
}

function setupMoon3D(container) {
  const width  = container.clientWidth  || 300;
  const height = container.clientHeight || 200;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x050510, 1);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;

  let _moonRotateTimer = null;
  renderer.domElement.addEventListener('pointerdown', () => {
    controls.autoRotate = false;
    clearTimeout(_moonRotateTimer);
  });
  renderer.domElement.addEventListener('pointerup', () => {
    _moonRotateTimer = setTimeout(() => { controls.autoRotate = true; }, 2000);
  });

  // ── Procedural bump map — replaces the broken moon_bump.jpg file ──
  // Generates a 512×256 grayscale map using crater noise
  function makeMoonBump() {
    const W = 512, H = 256;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    // Base mid-gray
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    // Crater indentations (dark = lower)
    for (let i = 0; i < 80; i++) {
      const cx = Math.random() * W, cy = Math.random() * H;
      const r  = Math.random() * W * 0.04 + W * 0.005;
      // Dark floor
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   'rgba(20,20,20,0.55)');
      g.addColorStop(0.65,'rgba(20,20,20,0.35)');
      g.addColorStop(0.85,'rgba(200,200,200,0.30)'); // bright rim
      g.addColorStop(1,   'rgba(128,128,128,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    // Fine surface noise
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      imgData.data[i]   = Math.min(255, Math.max(0, imgData.data[i]   + n));
      imgData.data[i+1] = imgData.data[i];
      imgData.data[i+2] = imgData.data[i];
    }
    ctx.putImageData(imgData, 0, 0);
    return cv;
  }

  const bumpCanvas  = makeMoonBump();
  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);

  const textureLoader = new THREE.TextureLoader();
  const diffuseMap    = textureLoader.load('/assets/moon_texture.jpg');

  const geometry = new THREE.SphereGeometry(1, 48, 48);
  const material = new THREE.MeshStandardMaterial({
    map:       diffuseMap,
    bumpMap:   bumpTexture,
    bumpScale: 0.01,
    roughness: 0.95,
    metalness: 0.0,
  });

  const moon = new THREE.Mesh(geometry, material);
  scene.add(moon);

  // Lighting — soft, natural illumination
  const ambientLight = new THREE.AmbientLight(0x303050, 0.35);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
  dirLight.position.set(-2, 1, 2);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x8090b0, 0.25);
  fillLight.position.set(2, -0.5, 1);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x4040a0, 0.15);
  rimLight.position.set(5, 0, -5);
  scene.add(rimLight);

  // ── IntersectionObserver: pause rendering when moon card is off-screen ──
  let _visible = true;
  const io = new IntersectionObserver(([e]) => { _visible = e.isIntersecting; }, { threshold: 0.05 });
  io.observe(container);

  // Page visibility
  let _pageVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => { _pageVisible = !document.hidden; });

  // 30fps throttled loop
  let lastTime = 0;
  function animate(time) {
    requestAnimationFrame(animate);
    if (!_visible || !_pageVisible) return;
    if (time - lastTime < 33) return;
    lastTime = time;
    controls.update();
    renderer.render(scene, camera);
  }
  animate(performance.now());

  // Resize
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  });
  resizeObserver.observe(container);
}

window.initMoon3D = initMoon3D;
