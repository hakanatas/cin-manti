import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PALETTE } from './config.js';
import { clamp } from './tween.js';

/** Renderer, camera, lights and the cream tabletop. */
export function createScene(canvas, { isMobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.cream);
  scene.fog = new THREE.Fog(PALETTE.cream, 16, 34);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const baseDistance = 8.4;
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.75, 0.42, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.5;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 1.28;
  controls.minAzimuthAngle = -0.85;
  controls.maxAzimuthAngle = 0.85;
  controls.minDistance = 5.5;
  controls.maxDistance = 12.5;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  camera.position.set(1.5, 4.0, 7.4).normalize().multiplyScalar(baseDistance).add(controls.target);
  controls.update();

  // Lights: warm key with soft shadows, hemisphere fill, cool rim.
  const key = new THREE.DirectionalLight('#fff0dc', 2.4);
  key.position.set(-3.2, 7.5, 4.8);
  key.castShadow = true;
  const shadowSize = isMobile ? 1024 : 2048;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -4.5;
  key.shadow.camera.right = 4.5;
  key.shadow.camera.top = 4.5;
  key.shadow.camera.bottom = -4.5;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 6;
  if ('intensity' in key.shadow) key.shadow.intensity = 0.72;
  scene.add(key, key.target);

  const fill = new THREE.HemisphereLight('#fff9ef', '#e2c4a2', 0.55);
  scene.add(fill);

  const rim = new THREE.DirectionalLight('#dde7ff', 0.8);
  rim.position.set(4.5, 4.5, -6);
  scene.add(rim);

  // Tabletop
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.96, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'table';
  scene.add(ground);

  const state = { square: false, width: 1, height: 1 };

  function applyFraming() {
    const aspect = state.square ? 1 : state.width / state.height;
    camera.aspect = aspect;
    // In portrait, pull back so the whole serving stays in view.
    const fit = state.square ? 1.02 : clamp(1.35 / aspect, 1, 2.6);
    const dir = camera.position.clone().sub(controls.target);
    controls.maxDistance = Math.max(12.5, baseDistance * fit + 1);
    const dist = clamp(baseDistance * fit, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(dist));
    if (!state.square && aspect > 1.35) {
      // leave breathing room for the headline on the left
      camera.setViewOffset(state.width, state.height, -state.width * 0.075, -state.height * 0.02, state.width, state.height);
    } else if (!state.square && aspect < 0.8) {
      camera.setViewOffset(state.width, state.height, -state.width * 0.02, -state.height * 0.04, state.width, state.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }

  function resize(width, height) {
    state.width = width;
    state.height = height;
    if (!state.square) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
      renderer.setSize(width, height, false);
    }
    applyFraming();
  }

  /** Switch the drawing buffer to a fixed square (used while recording). */
  function setSquare(on, size = 1080) {
    state.square = on;
    if (on) {
      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
      renderer.setSize(state.width, state.height, false);
    }
    applyFraming();
  }

  return { renderer, scene, camera, controls, key, ground, resize, setSquare, applyFraming };
}
