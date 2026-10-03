import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { createStarSparrowMaterial, SPARROW_THEMES, THEME_KEYS } from './StarSparrowMaterial.js';
import { SPACESHIP_CONFIGS, getSpaceshipConfig } from './spaceshipConfig.js';
import { ThrusterFlame, ThrusterSparkSystem } from './ThrusterVFX.js';

export class SpaceshipController {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   */
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    // Root container for spaceship physics and position
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Visual model container (child of root) - handles roll/banking tilt
    this.visualHolder = new THREE.Group();
    this.root.add(this.visualHolder);

    // Dynamic Thrusters Group (parented to visualHolder so thruster effects tilt/bank with the spaceship)
    this.thrusterGroup = new THREE.Group();
    this.visualHolder.add(this.thrusterGroup);
    this.activeThrusters = [];

    // Spaceship fleet configurations
    this.shipConfigs = SPACESHIP_CONFIGS;
    this.shipPresets = this.shipConfigs; // alias for backwards compatibility
    this.currentShipIndex = 0;
    this.currentConfig = this.shipConfigs[0];
    this.currentThemeIndex = 0;
    this.currentShipMesh = null;
    this.currentShipMaterial = null;
    this.loadedShipsCache = new Map();

    // Movement & physics parameters
    this.maxSpeed = 45.0; // Normal cruising speed
    this.boostSpeed = 100.0; // Boost speed
    this.reverseSpeed = -15.0;
    this.acceleration = 30.0;
    this.deceleration = 15.0;
    this.boostAcceleration = 60.0;
    this.damping = 0.98; // Space inertia decay

    this.currentSpeed = 0.0;
    this.targetSpeed = 0.0;
    this.velocity = new THREE.Vector3();

    // Boost energy
    this.maxBoostEnergy = 100.0;
    this.boostEnergy = 100.0;
    this.boostCostPerSecond = 35.0;
    this.boostRechargeRate = 20.0;
    this.isBoosting = false;

    // Rotation parameters (radians/sec) - calibrated for smooth, controllable flight
    this.pitchSpeed = 0.9;
    this.yawSpeed = 0.85;
    this.rollSpeed = 1.3;
    this.turnResponsiveness = 7.0;

    this.angularVelocity = new THREE.Vector3(); // x: pitch, y: yaw, z: roll
    this.bankAngle = 0.0;
    this.maxBankAngle = Math.PI / 6; // ~30 degrees

    // Camera modes: 0 = Chase, 1 = Cockpit, 2 = Orbit
    this.cameraMode = 0;
    this.baseFov = 60.0;
    this.boostFov = 75.0;
    this.cameraChaseOffset = new THREE.Vector3(0, 2.5, 7.5);
    this.cameraLookAhead = 15.0;
    this.cockpitOffset = new THREE.Vector3(0, 0.7, -0.2);

    // Orbit camera controls
    this.orbitRadius = 8.0;
    this.orbitTheta = 0.0;
    this.orbitPhi = Math.PI / 6;
    this.isDraggingMouse = false;
    this.prevMousePos = { x: 0, y: 0 };

    // Mouse steering
    this.mouseSteering = false;
    this.mouseCoords = { x: 0, y: 0 }; // Normalized -1 to 1

    // Input state
    this.keys = {};
    this.touchInput = {
      pitch: 0,
      yaw: 0,
      roll: 0,
      throttle: 0,
      boost: false
    };

    // Thruster supersonic afterburner sparks & embers
    this.sparkSystem = new ThrusterSparkSystem(this.scene, 280);

    // Laser weapon projectiles
    this.laserProjectiles = [];
    this.lastFireTime = 0;

    // Crosshair HUD & Aim Target
    this.crosshairContainer = typeof document !== 'undefined' ? document.getElementById('crosshair-container') : null;
    this.targetMeshes = [];
    this.aimTargetPoint = null;
    this._aimRaycaster = new THREE.Raycaster();
    this._aimRaycaster.far = 800;
    this._crosshairTimer = null;

    // Event listeners
    this.setupInputListeners();

    // Load initial StarSparrow ship
    this.selectShip(0);
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Enter or F fires laser weapons
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyF') {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
        }
        const now = performance.now();
        if (!this.lastFireTime || (now - this.lastFireTime) > 130) {
          this.lastFireTime = now;
          this.testFireWeapons();
        }
      }

      // Number keys 1-9 and 0 for quick ship switch
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        const idx = digit === 0 ? 9 : digit - 1;
        this.selectShip(idx);
      }

      // Tab cycles ship
      if (e.code === 'Tab') {
        e.preventDefault();
        this.cycleShip();
      }

      // V toggles camera view
      if (e.code === 'KeyV') {
        this.toggleCameraMode();
      }

      // M toggles mouse steering
      if (e.code === 'KeyM') {
        this.mouseSteering = !this.mouseSteering;
      }

      // X stabilizes / levels ship
      if (e.code === 'KeyX') {
        this.angularVelocity.set(0, 0, 0);
        this.bankAngle = 0;
      }

      // C cycles color themes (Red, Blue, Cyan, Orange, Green, Purple, etc.)
      if (e.code === 'KeyC') {
        this.cycleColorTheme();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      // Screen-space mouse coords [-1, 1]
      this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Mouse drag for orbit camera mode
      if (this.cameraMode === 2 && this.isDraggingMouse) {
        const dx = e.clientX - this.prevMousePos.x;
        const dy = e.clientY - this.prevMousePos.y;
        this.orbitTheta -= dx * 0.008;
        this.orbitPhi = Math.max(0.05, Math.min(Math.PI - 0.05, this.orbitPhi + dy * 0.008));
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('#touch-controls')) {
        return;
      }
      if (e.button === 0) {
        this.isDraggingMouse = true;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingMouse = false;
    });

    window.addEventListener('wheel', (e) => {
      if (this.cameraMode === 2) {
        this.orbitRadius = Math.max(2.5, Math.min(30.0, this.orbitRadius + e.deltaY * 0.01));
      }
    });
  }

  buildThrusters(thrusterConfigs = []) {
    // Clean up old thruster flames
    for (const thruster of this.activeThrusters) {
      this.thrusterGroup.remove(thruster.root);
      thruster.dispose();
    }
    this.activeThrusters = [];

    const configs = thrusterConfigs && thrusterConfigs.length > 0
      ? thrusterConfigs
      : [
          { position: { x: -0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#38bdf8' },
          { position: { x: 0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#38bdf8' }
        ];

    for (const tConfig of configs) {
      const radius = typeof tConfig.size === 'number'
        ? 0.2 * tConfig.size
        : (tConfig.size?.radius || 0.22);
      const length = typeof tConfig.size === 'number'
        ? 1.2 * tConfig.size
        : (tConfig.size?.length || 1.35);

      const thruster = new ThrusterFlame(tConfig, radius, length);
      this.thrusterGroup.add(thruster.root);
      this.activeThrusters.push(thruster);
    }

    this.engineLight = this.activeThrusters[0]?.pointLight || null;
    if (this.activeThrusters[0] && this.sparkSystem) {
      this.sparkSystem.setColor(this.activeThrusters[0].flameColor);
    }
  }

  async selectShip(index) {
    if (index < 0 || index >= this.shipConfigs.length) return;
    const config = this.shipConfigs[index];
    this.currentShipIndex = index;
    this.currentConfig = config;

    // Apply handling & physics parameters from spaceship config
    if (config.handling) {
      this.maxSpeed = config.handling.maxSpeed ?? this.maxSpeed;
      this.boostSpeed = config.handling.boostSpeed ?? this.boostSpeed;
      this.reverseSpeed = config.handling.reverseSpeed ?? this.reverseSpeed;
      this.acceleration = config.handling.acceleration ?? this.acceleration;
      this.deceleration = config.handling.deceleration ?? this.deceleration;
      this.boostAcceleration = config.handling.boostAcceleration ?? this.boostAcceleration;
      this.pitchSpeed = config.handling.pitchSpeed ?? this.pitchSpeed;
      this.yawSpeed = config.handling.yawSpeed ?? this.yawSpeed;
      this.rollSpeed = config.handling.rollSpeed ?? this.rollSpeed;
      this.maxBoostEnergy = config.handling.boostEnergy ?? this.maxBoostEnergy;
      this.boostCostPerSecond = config.handling.boostCostPerSecond ?? this.boostCostPerSecond;
      this.boostRechargeRate = config.handling.boostRechargeRate ?? this.boostRechargeRate;
    }

    // Check model cache
    let cached = this.loadedShipsCache.get(config.id);
    if (!cached) {
      const loader = new FBXLoader();
      const fbx = await loader.loadAsync(config.model);

      // Normalize size and center
      const initialBox = new THREE.Box3().setFromObject(fbx);
      const size = new THREE.Vector3();
      initialBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = (config.scale || 4.0) / maxDim;

      fbx.scale.setScalar(scale);
      fbx.rotation.y = Math.PI; // Face forward along -Z

      const container = new THREE.Group();
      container.add(fbx);
      container.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(fbx);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      fbx.position.sub(center);

      container.updateMatrixWorld(true);

      // Apply authentic StarSparrow shader material using full ship config (colors, textures, wearout)
      const sparrowMat = createStarSparrowMaterial(config);

      fbx.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = sparrowMat;
        }
      });

      cached = { model: container, material: sparrowMat };
      this.loadedShipsCache.set(config.id, cached);
    }

    // Replace active visual model
    if (this.currentShipMesh) {
      this.visualHolder.remove(this.currentShipMesh);
    }
    this.currentShipMesh = cached.model;
    this.currentShipMaterial = cached.material;
    this.visualHolder.add(this.currentShipMesh);

    // Build configured thrusters for this ship
    this.buildThrusters(config.thrusters);

    // Set spark color based on primary thruster
    if (config.thrusters && config.thrusters[0] && this.sparkSystem) {
      this.sparkSystem.setColor(config.thrusters[0].color);
    }
  }

  cycleShip() {
    const nextIdx = (this.currentShipIndex + 1) % this.shipConfigs.length;
    return this.selectShip(nextIdx);
  }

  cycleColorTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % THEME_KEYS.length;
    const themeKey = THEME_KEYS[this.currentThemeIndex];
    if (this.currentShipMaterial && this.currentShipMaterial.setTheme) {
      this.currentShipMaterial.setTheme(themeKey);
      const theme = SPARROW_THEMES[themeKey];
      if (theme) {
        for (const thruster of this.activeThrusters) {
          thruster.setColor(theme.flameColor);
        }
        if (this.sparkSystem) {
          this.sparkSystem.setColor(theme.flameColor);
        }
      }
    }
  }

  setTargetObjects(objects) {
    this.targetMeshes = objects || [];
  }

  updateCrosshairAim() {
    if (!this.crosshairContainer || this.cameraMode === 2) return;

    if (this.targetMeshes && this.targetMeshes.length > 0) {
      this._aimRaycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      const intersects = this._aimRaycaster.intersectObjects(this.targetMeshes, false);
      if (intersects.length > 0) {
        this.crosshairContainer.classList.add('target-locked');
        this.aimTargetPoint = intersects[0].point;
        return;
      }
    }

    this.crosshairContainer.classList.remove('target-locked');
    this.aimTargetPoint = null;
  }

  toggleCameraMode() {
    this.cameraMode = (this.cameraMode + 1) % 3;
    if (this.crosshairContainer) {
      this.crosshairContainer.style.display = this.cameraMode === 2 ? 'none' : 'flex';
    }
  }

  update(dt) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.1); // Guard against tab freeze spikes

    this.handleInput(dt);
    this.updatePhysics(dt);
    this.updateThrusters(dt);
    this.updateCamera(dt);
    this.updateCrosshairAim();
    if (this.sparkSystem) {
      this.sparkSystem.update(dt);
    }
    this.updateLaserProjectiles(dt);

    // Update dynamic shader flight effects (emission pulse, boost glow)
    if (this.currentShipMaterial && this.currentShipMaterial.updateFlightVFX) {
      const throttleVal = Math.abs(this.currentSpeed) / this.maxSpeed;
      this.currentShipMaterial.updateFlightVFX(dt, this.isBoosting, throttleVal);
    }
  }

  handleInput(dt) {
    const k = this.keys;

    // Boost: Shift or Space OR touch boost button
    const wantsBoost = (
      (k['ShiftLeft'] || k['ShiftRight'] || k['Space'] || this.touchInput.boost) &&
      this.boostEnergy > 5.0
    );

    if (wantsBoost) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - this.boostCostPerSecond * dt);
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + this.boostRechargeRate * dt);
    }

    // Forward / Reverse Throttle
    const accelRate = this.isBoosting ? this.boostAcceleration : this.acceleration;
    const topForwardSpeed = this.isBoosting ? this.boostSpeed : this.maxSpeed;

    let throttle = 0;
    if (k['KeyW'] || k['ArrowUp']) throttle += 1;
    if (k['KeyS'] || k['ArrowDown']) throttle -= 1;
    if (this.touchInput.throttle !== 0) throttle += this.touchInput.throttle;
    throttle = Math.max(-1, Math.min(1, throttle));

    if (throttle > 0) {
      this.currentSpeed = Math.min(topForwardSpeed, this.currentSpeed + accelRate * throttle * dt);
    } else if (throttle < 0) {
      this.currentSpeed = Math.max(this.reverseSpeed, this.currentSpeed + this.deceleration * throttle * dt);
    } else {
      // Natural space deceleration
      this.currentSpeed *= Math.pow(this.damping, dt * 60);
      if (Math.abs(this.currentSpeed) < 0.05) this.currentSpeed = 0;
    }

    // Pitch: Up/Down Arrow keys or Touch joystick
    let pitchInput = 0;
    if (k['ArrowDown']) pitchInput -= 1; // Pull back to pitch up
    if (k['ArrowUp']) pitchInput += 1;   // Push forward to pitch down
    if (this.touchInput.pitch !== 0) pitchInput += this.touchInput.pitch;

    // Yaw: Left/Right Arrow keys or A/D or Touch joystick
    let yawInput = 0;
    if (k['KeyA'] || k['ArrowLeft']) yawInput += 1; // Turn left
    if (k['KeyD'] || k['ArrowRight']) yawInput -= 1; // Turn right
    if (this.touchInput.yaw !== 0) yawInput += this.touchInput.yaw;

    // Roll: Q / E keys or Touch joystick
    let rollInput = 0;
    if (k['KeyQ']) rollInput += 1;
    if (k['KeyE']) rollInput -= 1;
    if (this.touchInput.roll !== 0) rollInput += this.touchInput.roll;

    pitchInput = Math.max(-1, Math.min(1, pitchInput));
    yawInput = Math.max(-1, Math.min(1, yawInput));
    rollInput = Math.max(-1, Math.min(1, rollInput));

    // Mouse Steering (optional, active when enabled or dragging)
    if (this.mouseSteering) {
      const deadzone = 0.08;
      if (Math.abs(this.mouseCoords.x) > deadzone) {
        const mouseX = Math.sign(this.mouseCoords.x) * (Math.abs(this.mouseCoords.x) - deadzone);
        yawInput -= mouseX * 1.0;
      }
      if (Math.abs(this.mouseCoords.y) > deadzone) {
        const mouseY = Math.sign(this.mouseCoords.y) * (Math.abs(this.mouseCoords.y) - deadzone);
        pitchInput += mouseY * 1.0;
      }
    }

    // Smoothly interpolate angular velocities toward target speeds
    const targetPitch = pitchInput * this.pitchSpeed;
    const targetYaw = yawInput * this.yawSpeed;
    const targetRoll = rollInput * this.rollSpeed;

    const turnLerp = 1 - Math.exp(-this.turnResponsiveness * dt);
    this.angularVelocity.x = THREE.MathUtils.lerp(this.angularVelocity.x, targetPitch, turnLerp);
    this.angularVelocity.y = THREE.MathUtils.lerp(this.angularVelocity.y, targetYaw, turnLerp);
    this.angularVelocity.z = THREE.MathUtils.lerp(this.angularVelocity.z, targetRoll, turnLerp);

    // Target banking roll based on yaw turn
    const targetBank = yawInput * this.maxBankAngle;
    this.bankAngle = THREE.MathUtils.lerp(this.bankAngle, targetBank, 1 - Math.exp(-6 * dt));
  }

  updatePhysics(dt) {
    // 1. Rotate ship root by angular velocity scaled by dt
    this.root.rotateX(this.angularVelocity.x * dt);
    this.root.rotateY(this.angularVelocity.y * dt);
    this.root.rotateZ(this.angularVelocity.z * dt);

    // 2. Visual banking roll on visualHolder
    this.visualHolder.rotation.z = this.bankAngle;

    // 3. Move forward along ship's local forward vector (-Z)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
    this.velocity.copy(forward).multiplyScalar(this.currentSpeed);

    // Optional lateral strafe
    let strafeX = 0;
    let strafeY = 0;
    if (this.keys['KeyC']) strafeY -= 12; // Strafe down
    if (this.keys['KeyR'] && !this.keys['KeyR_pressed']) {
      // (Reserved for skybox switch)
    }

    if (strafeY !== 0) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.root.quaternion);
      this.velocity.addScaledVector(up, strafeY);
    }

    this.root.position.addScaledVector(this.velocity, dt);
  }

  updateThrusters(dt) {
    const forwardRatio = Math.max(0, this.currentSpeed / this.maxSpeed);
    const targetThrottle = this.isBoosting ? 1.0 : Math.max(0.18, forwardRatio);

    const shipWorldQuat = this.visualHolder.getWorldQuaternion(new THREE.Quaternion());
    const shipDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipWorldQuat);
    const shouldSpawnSparks = (this.currentSpeed > 2.0 || this.isBoosting) && Math.random() < (this.isBoosting ? 0.9 : 0.45);

    for (const thruster of this.activeThrusters) {
      thruster.update(dt, targetThrottle, this.isBoosting);

      if (shouldSpawnSparks && this.sparkSystem) {
        const worldPos = new THREE.Vector3();
        thruster.root.getWorldPosition(worldPos);
        this.sparkSystem.spawnSparks(worldPos, shipDir, this.isBoosting);
      }
    }
  }

  updateCamera(dt) {
    // Dynamic FOV based on speed and boost
    const speedRatio = Math.min(1.0, Math.abs(this.currentSpeed) / this.boostSpeed);
    const targetFov = this.isBoosting ? this.boostFov : this.baseFov + speedRatio * 8.0;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 0) {
      // MODE 0: Third-person Chase Camera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.root.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.quaternion);

      // Position behind and slightly above
      const idealPos = new THREE.Vector3()
        .copy(this.root.position)
        .addScaledVector(forward, -this.cameraChaseOffset.z)
        .addScaledVector(up, this.cameraChaseOffset.y);

      // Subtle camera shake on boost
      if (this.isBoosting) {
        idealPos.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        ));
      }

      // Smooth camera interpolation
      const smoothFactor = 1 - Math.exp(-14 * dt);
      this.camera.position.lerp(idealPos, smoothFactor);

      // Look at a target ahead of the ship
      const lookTarget = new THREE.Vector3()
        .copy(this.root.position)
        .addScaledVector(forward, this.cameraLookAhead)
        .addScaledVector(up, 0.5);

      this.camera.lookAt(lookTarget);
      this.camera.up.copy(up);

    } else if (this.cameraMode === 1) {
      // MODE 1: Cockpit First-Person
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.root.quaternion);

      const cockpitPos = new THREE.Vector3()
        .copy(this.root.position)
        .addScaledVector(forward, this.cockpitOffset.z)
        .addScaledVector(up, this.cockpitOffset.y);

      this.camera.position.copy(cockpitPos);

      const lookTarget = new THREE.Vector3()
        .copy(cockpitPos)
        .addScaledVector(forward, 50.0);

      this.camera.lookAt(lookTarget);
      this.camera.up.copy(up);

    } else if (this.cameraMode === 2) {
      // MODE 2: Orbit Camera around Ship
      const cx = this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const cy = this.orbitRadius * Math.cos(this.orbitPhi);
      const cz = this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);

      this.camera.position.set(
        this.root.position.x + cx,
        this.root.position.y + cy,
        this.root.position.z + cz
      );
      this.camera.lookAt(this.root.position);
      this.camera.up.set(0, 1, 0);
    }
  }

  // State getters for HUD
  getState() {
    return {
      currentSpeed: Math.round(this.currentSpeed * 3.6), // km/h
      speedNormalized: Math.min(1.0, Math.abs(this.currentSpeed) / this.boostSpeed),
      boostPercent: Math.round((this.boostEnergy / this.maxBoostEnergy) * 100),
      isBoosting: this.isBoosting,
      shipName: this.shipPresets[this.currentShipIndex].name,
      shipIndex: this.currentShipIndex,
      ships: this.shipPresets,
      cameraMode: ['Chase (3rd Person)', 'Cockpit (1st Person)', 'Orbit'][this.cameraMode],
      mouseSteering: this.mouseSteering,
      position: this.root.position
    };
  }

  /**
   * Returns current active ship configuration
   */
  getCurrentConfig() {
    return this.currentConfig || this.shipConfigs[this.currentShipIndex];
  }

  /**
   * Live applies configuration changes (handling, thrusters, colors, wearout)
   * @param {object} config
   */
  applyConfig(config) {
    this.currentConfig = config;
    this.shipConfigs[this.currentShipIndex] = config;

    // Apply handling parameters
    if (config.handling) {
      this.maxSpeed = config.handling.maxSpeed ?? this.maxSpeed;
      this.boostSpeed = config.handling.boostSpeed ?? this.boostSpeed;
      this.reverseSpeed = config.handling.reverseSpeed ?? this.reverseSpeed;
      this.acceleration = config.handling.acceleration ?? this.acceleration;
      this.deceleration = config.handling.deceleration ?? this.deceleration;
      this.boostAcceleration = config.handling.boostAcceleration ?? this.boostAcceleration;
      this.pitchSpeed = config.handling.pitchSpeed ?? this.pitchSpeed;
      this.yawSpeed = config.handling.yawSpeed ?? this.yawSpeed;
      this.rollSpeed = config.handling.rollSpeed ?? this.rollSpeed;
      this.maxBoostEnergy = config.handling.boostEnergy ?? this.maxBoostEnergy;
      this.boostCostPerSecond = config.handling.boostCostPerSecond ?? this.boostCostPerSecond;
      this.boostRechargeRate = config.handling.boostRechargeRate ?? this.boostRechargeRate;
    }

    // Rebuild active thruster meshes & flares
    this.buildThrusters(config.thrusters);

    // Apply material uniforms (colors & surface wearout)
    if (this.currentShipMaterial && this.currentShipMaterial.userData && this.currentShipMaterial.userData.uniforms) {
      const u = this.currentShipMaterial.userData.uniforms;
      if (config.colors) {
        if (config.colors.color1 && u.uColor1) u.uColor1.value.set(...config.colors.color1);
        if (config.colors.color2 && u.uColor2) u.uColor2.value.set(...config.colors.color2);
        if (config.colors.color3 && u.uColor3) u.uColor3.value.set(...config.colors.color3);
        if (config.colors.logosColor && u.uLogosColor) u.uLogosColor.value.set(...config.colors.logosColor);
        if (config.colors.emission1 && u.uEmission1) u.uEmission1.value.set(...config.colors.emission1);
        if (config.colors.emission2 && u.uEmission2) u.uEmission2.value.set(...config.colors.emission2);
        if (config.colors.emission3 && u.uEmission3) u.uEmission3.value.set(...config.colors.emission3);
        if (config.colors.cockpit1 && u.uCockpit1) u.uCockpit1.value.set(...config.colors.cockpit1);
        if (config.colors.cockpit2 && u.uCockpit2) u.uCockpit2.value.set(...config.colors.cockpit2);
        if (config.colors.cockpit3 && u.uCockpit3) u.uCockpit3.value.set(...config.colors.cockpit3);
      }
      if (config.wearout) {
        if (config.wearout.dirty !== undefined && u.uDirty) u.uDirty.value = config.wearout.dirty;
        if (config.wearout.darken !== undefined && u.uDarken) u.uDarken.value = config.wearout.darken;
        if (config.wearout.logos !== undefined && u.uLogos) u.uLogos.value = config.wearout.logos;
        if (config.wearout.emissionMultiplier !== undefined && u.uEmissionMultiplier) {
          u.uEmissionMultiplier.value = config.wearout.emissionMultiplier;
          this.currentShipMaterial.userData.baseEmissionMultiplier = config.wearout.emissionMultiplier;
        }
        if (config.wearout.cockpitMultiplier !== undefined && u.uCockpitMultiplier) {
          u.uCockpitMultiplier.value = config.wearout.cockpitMultiplier;
        }
      }
    }

    // Update spark color to match primary thruster
    if (config.thrusters && config.thrusters[0] && this.sparkSystem) {
      this.sparkSystem.setColor(config.thrusters[0].color);
    }
  }

  testFireWeapons(customShootingPoints = null) {
    const points = customShootingPoints || this.currentConfig?.shootingPoints || [];
    if (!points || points.length === 0) return;

    this.visualHolder.updateMatrixWorld(true);
    const shipWorldQuat = this.visualHolder.getWorldQuaternion(new THREE.Quaternion());
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipWorldQuat);

    // Crosshair firing kick animation
    if (this.crosshairContainer) {
      this.crosshairContainer.classList.remove('firing');
      void this.crosshairContainer.offsetWidth; // force reflow
      this.crosshairContainer.classList.add('firing');
      if (this._crosshairTimer) clearTimeout(this._crosshairTimer);
      this._crosshairTimer = setTimeout(() => {
        if (this.crosshairContainer) this.crosshairContainer.classList.remove('firing');
      }, 90);
    }

    // Determine target point along crosshair line of sight
    let targetPoint = this.aimTargetPoint;
    if (!targetPoint) {
      this._aimRaycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      if (this.targetMeshes && this.targetMeshes.length > 0) {
        const hits = this._aimRaycaster.intersectObjects(this.targetMeshes, false);
        if (hits.length > 0) {
          targetPoint = hits[0].point;
        }
      }
      if (!targetPoint) {
        // Combat convergence distance along the camera crosshair ray
        const defaultConvergenceDist = 260.0;
        targetPoint = this._aimRaycaster.ray.origin.clone().addScaledVector(
          this._aimRaycaster.ray.direction,
          defaultConvergenceDist
        );
      }
    }

    for (const sp of points) {
      const pos = sp.position || { x: 0, y: 0, z: -1 };
      const localPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      const worldPos = localPos.clone().applyMatrix4(this.visualHolder.matrixWorld);

      // Compute trajectory towards crosshair target point
      let boltDir = new THREE.Vector3().subVectors(targetPoint, worldPos).normalize();
      if (targetPoint.distanceTo(worldPos) < 2.0) {
        boltDir.copy(forwardDir);
      }

      const colorHex = sp.color || '#ff2244';
      const boltColor = new THREE.Color(colorHex);
      const radius = Math.max(0.04, (sp.size || 0.12) * 0.8);
      const length = 2.4;

      const boltGroup = new THREE.Group();
      boltGroup.position.copy(worldPos);
      boltGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), boltDir);

      const geom = new THREE.CylinderGeometry(radius * 0.5, radius, length, 8);
      geom.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: boltColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      boltGroup.add(mesh);

      const coreGeom = new THREE.CylinderGeometry(radius * 0.22, radius * 0.3, length * 0.9, 6);
      coreGeom.rotateX(Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      boltGroup.add(coreMesh);

      const pLight = new THREE.PointLight(boltColor, 2.5, 9.0);
      boltGroup.add(pLight);

      this.scene.add(boltGroup);

      if (this.laserProjectiles.length >= 36) {
        const oldest = this.laserProjectiles.shift();
        this.scene.remove(oldest.group);
        oldest.geom.dispose();
        oldest.mat.dispose();
        oldest.coreGeom.dispose();
        oldest.coreMat.dispose();
      }

      this.laserProjectiles.push({
        group: boltGroup,
        dir: boltDir.clone(),
        speed: 150.0,
        life: 0.0,
        maxLife: 1.5,
        geom,
        mat,
        coreGeom,
        coreMat
      });
    }
  }

  updateLaserProjectiles(dt) {
    if (!this.laserProjectiles || this.laserProjectiles.length === 0) return;

    for (let i = this.laserProjectiles.length - 1; i >= 0; i--) {
      const p = this.laserProjectiles[i];
      p.life += dt;
      p.group.position.addScaledVector(p.dir, p.speed * dt);

      const progress = p.life / p.maxLife;
      if (progress > 0.65) {
        const fade = (1.0 - progress) / 0.35;
        p.mat.opacity = THREE.MathUtils.clamp(fade * 0.9, 0, 0.9);
        p.coreMat.opacity = THREE.MathUtils.clamp(fade * 0.95, 0, 0.95);
      }

      if (p.life >= p.maxLife) {
        this.scene.remove(p.group);
        p.geom.dispose();
        p.mat.dispose();
        p.coreGeom.dispose();
        p.coreMat.dispose();
        this.laserProjectiles.splice(i, 1);
      }
    }
  }
}