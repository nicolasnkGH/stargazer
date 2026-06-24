// moon3d.js - Interactive 3D Moon using Three.js

function initMoon3D() {
  const container = document.getElementById('moon-3d-container');
  if (!container) return;
  
  // Clear any existing canvas
  container.innerHTML = '';

  const width = container.clientWidth;
  const height = container.clientHeight || 200;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  const textureLoader = new THREE.TextureLoader();
  const diffuseMap = textureLoader.load('/assets/moon_texture.jpg');
  const bumpMap = textureLoader.load('/assets/moon_bump.jpg');

  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    map: diffuseMap,
    bumpMap: bumpMap,
    bumpScale: 0.02,
    roughness: 0.8,
    metalness: 0.1
  });

  const moon = new THREE.Mesh(geometry, material);
  scene.add(moon);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);
  
  // Add a faint blue rim light for aesthetics
  const rimLight = new THREE.DirectionalLight(0x8a2be2, 0.3);
  rimLight.position.set(-5, 0, -5);
  scene.add(rimLight);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Handle Resize
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
  resizeObserver.observe(container);
}

// Export for app.js
window.initMoon3D = initMoon3D;
