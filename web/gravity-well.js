// gravity-well.js
// 3D Gravity Well Hero Background inspired by Unabyss

(function initGravityWell() {
  const canvas = document.getElementById('gravity-well-canvas');
  if (!canvas) return;

  const section = document.getElementById('hero-section');
  
  // Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.002); // Fade into background

  const camera = new THREE.PerspectiveCamera(60, section.clientWidth / section.clientHeight, 0.1, 1000);
  camera.position.set(0, 50, 100);
  camera.lookAt(0, -20, 0);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(section.clientWidth, section.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // The Wireframe Grid (Gravity Well)
  const planeSize = 400;
  const planeSegments = 40;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  
  // Rotate plane to lay flat
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial({ 
    color: 0x64748b, // Slate 500
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Store original vertices for deformation
  const positions = plane.geometry.attributes.position;
  const originalYs = [];
  for (let i = 0; i < positions.count; i++) {
    originalYs.push(positions.getY(i));
  }

  // Glowing Spheres (Stars/Planets)
  const spheres = [];
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }); // Bright slate
  const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xfde047 }); // Yellow sun

  function createSphere(radius, x, z, mat, orbitSpeed, orbitRadius) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    
    spheres.push({
      mesh: mesh,
      orbitSpeed: orbitSpeed,
      orbitRadius: orbitRadius,
      angle: Math.random() * Math.PI * 2
    });
  }

  // Central massive star
  createSphere(12, 0, 0, highlightMaterial, 0, 0);
  // Orbiting planets
  createSphere(3, 40, 20, sphereMaterial, 0.005, 40);
  createSphere(5, -60, -10, sphereMaterial, 0.003, 60);
  createSphere(2, 20, -30, sphereMaterial, 0.01, 30);
  createSphere(4, -80, 40, sphereMaterial, 0.002, 80);

  // Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Deform grid (gravity well at center)
    const positions = plane.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      
      // Calculate distance to center
      const distance = Math.sqrt(x*x + z*z);
      
      // Deform: deep at center, ripples outwards
      let y = 0;
      if (distance < 100) {
        // Gaussian depression
        y = -40 * Math.exp(-(distance * distance) / 1000);
      }
      
      // Add slow wave ripple across the whole plane
      y += Math.sin(distance * 0.05 - time * 2) * 2;
      
      positions.setY(i, y);
    }
    plane.geometry.attributes.position.needsUpdate = true;

    // Rotate plane slowly
    plane.rotation.y = time * 0.05;

    // Orbit spheres
    spheres.forEach(s => {
      if (s.orbitRadius > 0) {
        s.angle += s.orbitSpeed;
        s.mesh.position.x = Math.cos(s.angle) * s.orbitRadius;
        s.mesh.position.z = Math.sin(s.angle) * s.orbitRadius;
        
        // Follow the dip of the gravity well loosely
        const dist = Math.sqrt(s.mesh.position.x*s.mesh.position.x + s.mesh.position.z*s.mesh.position.z);
        s.mesh.position.y = (-40 * Math.exp(-(dist * dist) / 1000)) + 5; // hover slightly above
      } else {
        // Central star bobbing
        s.mesh.position.y = (-40 * Math.exp(0)) + 5 + Math.sin(time) * 2;
      }
    });

    renderer.render(scene, camera);
  }

  // Handle Resize
  window.addEventListener('resize', () => {
    if (!section || !camera || !renderer) return;
    camera.aspect = section.clientWidth / section.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(section.clientWidth, section.clientHeight);
  });

  animate();
})();
