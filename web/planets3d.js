// planets3d.js - Interactive 3D Planets Gallery using Three.js

const renderers = [];
const controlsList = [];
let observer = null;
const activeScenes = new Set();

// Global pause when tab is hidden
let _planetsPageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  _planetsPageVisible = !document.hidden;
});

function initPlanets3D() {
  const containers = document.querySelectorAll('.planet-3d-canvas-container');
  if (containers.length === 0) return;

  // Cleanup old renderers if re-rendering
  renderers.forEach(r => r.dispose());
  controlsList.forEach(c => c.dispose());
  renderers.length = 0;
  controlsList.length = 0;
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeScenes.add(entry.target);
      } else {
        activeScenes.delete(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const textureLoader = new THREE.TextureLoader();
  
  containers.forEach(container => {
    container.innerHTML = ''; // Clear
    const planetName = container.dataset.planet.toLowerCase();
    
    const width = container.clientWidth;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    renderers.push(renderer);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;
    controls.autoRotate = false; // off by default — enabled on interaction
    controls.autoRotateSpeed = 0.5;
    controlsList.push(controls);

    // Re-enable auto-rotate briefly after user lets go
    let _rotateTimer = null;
    renderer.domElement.addEventListener('pointerdown', () => {
      controls.autoRotate = false;
      clearTimeout(_rotateTimer);
    });
    renderer.domElement.addEventListener('pointerup', () => {
      _rotateTimer = setTimeout(() => { controls.autoRotate = true; }, 2000);
    });

    // Default to mercury texture if not found
    const diffuseMap = textureLoader.load(`/assets/${planetName}.jpg`, undefined, undefined, () => {
        // Fallback if texture fails
        console.warn('Failed to load texture for ' + planetName);
    });

    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.6,
      metalness: 0.1
    });

    const planetMesh = new THREE.Mesh(geometry, material);
    scene.add(planetMesh);

    // Special Saturn Logic
    if (planetName === 'saturn') {
        const ringColor = textureLoader.load('/assets/saturn_ring_color.jpg');
        const ringAlpha = textureLoader.load('/assets/saturn_ring_pattern.gif');
        
        const ringGeo = new THREE.RingGeometry(1.4, 2.4, 64);
        
        // UV mapping for RingGeometry
        const pos = ringGeo.attributes.position;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++){
            v3.fromBufferAttribute(pos, i);
            // simple radial mapping
            ringGeo.attributes.uv.setXY(i, v3.length() < 1.9 ? 0 : 1, 1); 
        }
        
        const ringMat = new THREE.MeshStandardMaterial({
            map: ringColor,
            alphaMap: ringAlpha,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.5
        });
        
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2; // Flatten it
        
        // Tilt Saturn and its rings
        const saturnGroup = new THREE.Group();
        saturnGroup.add(planetMesh);
        saturnGroup.add(ringMesh);
        saturnGroup.rotation.x = 0.3; 
        saturnGroup.rotation.z = 0.2;
        scene.add(saturnGroup);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    
    const rimLight = new THREE.DirectionalLight(0x8a2be2, 0.4);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    container.sceneData = { scene, camera, renderer, controls };
    observer.observe(container);
  });

  // Handle Resize globally
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const container = entry.target;
      const data = container.sceneData;
      if (!data) continue;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) continue;
      data.camera.aspect = width / height;
      data.camera.updateProjectionMatrix();
      data.renderer.setSize(width, height);
    }
  });

  containers.forEach(container => resizeObserver.observe(container));
}

// Single animation loop for all visible planets
let lastTime = 0;
function animateAll(time) {
  requestAnimationFrame(animateAll);
  if (!_planetsPageVisible) return; // pause when tab hidden
  if (time - lastTime < 33) return; // Cap at ~30 FPS
  lastTime = time;

  activeScenes.forEach(container => {
    const data = container.sceneData;
    if (data) {
      data.controls.update();
      data.renderer.render(data.scene, data.camera);
    }
  });
}
animateAll(performance.now());

window.initPlanets3D = initPlanets3D;
