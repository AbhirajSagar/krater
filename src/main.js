import * as THREE from 'three';
import './style.css';
import { SkyboxManager } from './SkyboxManager.js';
import { SpaceshipController } from './SpaceshipController.js';
import { SpaceDust } from './SpaceDust.js';
import { AsteroidField } from './AsteroidField.js';
import { TouchControls } from './TouchControls.js';

// Canvas & Scene setup
const canvas = document.getElementById('app');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 10);

// Renderer setup
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1e38, 0.4);
scene.add(hemisphereLight);

// Distant sun / directional light
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

// Skybox Manager - randomly loads a space skybox from public/skyboxes
const skyboxManager = new SkyboxManager(scene, renderer);
skyboxManager.loadRandomSkybox().catch((err) => {
  console.warn('Initial skybox load fallback:', err);
});

// Spaceship Controller - handles ship loading, 6-DOF controls, camera chase, thrusters
const spaceship = new SpaceshipController(scene, camera, canvas);

// Space Dust - infinite floating stardust field around ship for speed sensation
const spaceDust = new SpaceDust(scene, 1800, 160);

// Asteroid Field - low-poly procedural rocks in space to fly around
const asteroidField = new AsteroidField(scene, 140);
spaceship.setAsteroidField(asteroidField);

// Touch Joystick Controls for mobile / small screen sizes
new TouchControls(spaceship, skyboxManager);

// Animation clock
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
}

// Pre-compile all scene shaders on startup to eliminate runtime stutters
renderer.compile(scene, camera);

animate();

// Responsive window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});