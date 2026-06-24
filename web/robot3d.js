document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("robot-3d-container");
  if (!container) return;

  // Set up scene, camera, and renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;

  // Group to hold the entire robot
  const robot = new THREE.Group();
  scene.add(robot);

  // Materials
  const purpleMat = new THREE.MeshStandardMaterial({
    color: 0x4c1d95,
    roughness: 0.2,
    metalness: 0.8,
  });
  
  const cyanGlowMat = new THREE.MeshBasicMaterial({
    color: 0x2dd4bf,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.5,
  });

  // Head
  const headGeo = new THREE.SphereGeometry(1.2, 32, 32);
  const head = new THREE.Mesh(headGeo, purpleMat);
  head.position.y = 1.5;
  robot.add(head);

  // Visor
  const visorGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.6, 32, 1, false, Math.PI / 4, Math.PI / 2);
  const visor = new THREE.Mesh(visorGeo, cyanGlowMat);
  visor.position.y = 1.6;
  robot.add(visor);

  // Antenna
  const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
  const antenna = new THREE.Mesh(antennaGeo, darkMat);
  antenna.position.y = 2.8;
  robot.add(antenna);

  const bulbGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const bulb = new THREE.Mesh(bulbGeo, cyanGlowMat);
  bulb.position.y = 3.2;
  robot.add(bulb);

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.8, 32);
  const body = new THREE.Mesh(bodyGeo, darkMat);
  body.position.y = 0;
  robot.add(body);

  // Core Light
  const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const core = new THREE.Mesh(coreGeo, cyanGlowMat);
  core.position.set(0, 0.2, 0.8);
  robot.add(core);

  // Floating Ring
  const ringGeo = new THREE.TorusGeometry(1.4, 0.05, 16, 64);
  const ring = new THREE.Mesh(ringGeo, purpleMat);
  ring.position.y = -1.2;
  ring.rotation.x = Math.PI / 2;
  robot.add(ring);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xa855f7, 2, 20);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x2dd4bf, 2, 20);
  pointLight2.position.set(-5, 0, 5);
  scene.add(pointLight2);

  // Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    
    // Floating effect
    time += 0.03;
    robot.position.y = Math.sin(time) * 0.2;
    ring.rotation.z -= 0.02;

    controls.update();
    renderer.render(scene, camera);
  }
  
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
});
