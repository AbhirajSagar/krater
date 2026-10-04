import * as THREE from 'three';
import './style.css';
import { LoadingScreen } from './LoadingScreen.js';
import { SkyboxManager } from './SkyboxManager.js';
import { SpaceshipController } from './SpaceshipController.js';
import { SpaceDust } from './SpaceDust.js';
import { AsteroidField } from './AsteroidField.js';
import { TouchControls } from './TouchControls.js';
import { OptionsMenu } from './OptionsMenu.js';
import { GameplayRecorder } from './GameplayRecorder.js';

// 1. Initialize Minimal Glassmorphic Loading Screen
const loadingScreen = new LoadingScreen();
loadingScreen.setProgress(5);

// Minimal Options Menu dialog & Fullscreen toggle
const optionsMenu = new OptionsMenu();

// 2. Canvas & Scene setup
const canvas = document.getElementById('app');
const scene = new THREE.Scene();

// 3. Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 10);

// 4. Renderer setup
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 9:16 High-Performance Gameplay Recorder (captures pure WebGL canvas without any UI in the recording)
const gameplayRecorder = new GameplayRecorder(canvas);

// 5. Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1e38, 0.4);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
sunLight.position.set(200, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 600;
const d = 50;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

loadingScreen.setProgress(12);

// 6. Asset Loading & Scene Setup Pipeline
async function initPipeline() {
  // Phase 1: Load Skybox Textures (12% -> 38%)
  const skyboxManager = new SkyboxManager(scene, renderer);

  await skyboxManager.loadRandomSkybox((progress) => {
    const pct = 12 + Math.round((progress.loaded / progress.total) * 26);
    loadingScreen.setProgress(pct);
  }).catch((err) => {
    console.warn('Initial skybox load fallback:', err);
  });

  // Phase 2: Spaceship Controller (38% -> 80%)
  const spaceship = new SpaceshipController(scene, camera, canvas, { autoLoad: false });
  optionsMenu.setSpaceship(spaceship);

  // Phase 3: Ship FBX Mesh & 2K PBR Textures
  await spaceship.selectShip(0, (progress) => {
    if (progress.phase === 'model_start') {
      loadingScreen.setProgress(42);
    } else if (progress.phase === 'model_loaded') {
      loadingScreen.setProgress(55);
    } else if (progress.phase === 'texture') {
      const pct = 55 + Math.round((progress.loaded / progress.total) * 26);
      loadingScreen.setProgress(pct);
    }
  });

  // Phase 4: Procedural Hazards & Space Dust (81% -> 92%)
  loadingScreen.setProgress(84);
  const asteroidField = new AsteroidField(scene, 140);
  spaceship.setAsteroidField(asteroidField);

  loadingScreen.setProgress(88);
  const spaceDust = new SpaceDust(scene, 1800, 160);

  // Touch Joystick Controls
  new TouchControls(spaceship, skyboxManager);

  // Phase 5: GPU Shader Pre-compilation & Warmup (92% -> 98%)
  loadingScreen.setProgress(94);
  await new Promise(r => setTimeout(r, 40));

  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  // Phase 6: Complete & Smooth Fade-Out (100%)
  loadingScreen.setProgress(100);
  await loadingScreen.finish();

  // Enable controls & unveil HUD, Options button, and Recorder button
  spaceship.enabled = true;
  optionsMenu.showToggleButton();
  gameplayRecorder.showToggleButton();

  const crosshairContainer = document.getElementById('crosshair-container');
  if (crosshairContainer) crosshairContainer.classList.add('visible');

  const touchControlsContainer = document.getElementById('touch-controls');
  if (touchControlsContainer) touchControlsContainer.classList.add('visible');

  return { spaceship, spaceDust, asteroidField };
}

// 7. Start Game Loop once scene pipeline completes
initPipeline().then(({ spaceship, spaceDust, asteroidField }) => {
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Update game components
    spaceship.update(dt);
    spaceDust.update(spaceship.root.position);
    asteroidField.update(dt);

    // Keep sunlight shadow camera focused near player
    sunLight.target.position.copy(spaceship.root.position);
    sunLight.target.updateMatrixWorld();

    renderer.render(scene, camera);

    // Record frame if recording is active (captures pure WebGL canvas without any UI)
    gameplayRecorder.recordFrame(canvas);
  }

  animate();
}).catch((err) => {
  console.error('Fatal initialization error:', err);
  if (loadingScreen) {
    loadingScreen.setProgress(100);
    loadingScreen.finish();
  }
});

// Responsive window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});