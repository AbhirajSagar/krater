/**
 * RemotePlayer.js
 * Represents a network opponent spaceship in the 3D space battlefield.
 * Features smooth position/rotation interpolation, authentic StarSparrow visuals,
 * active thrusters & sparks, and shield bubble.
 */

import * as THREE from 'three';
import { shipLoader } from './ShipLoader.js';
import { ThrusterFlame, ThrusterSparkSystem } from './ThrusterVFX.js';
import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';
import { createStarSparrowMaterial, SPARROW_THEMES } from './StarSparrowMaterial.js';

export class RemotePlayer {
  /**
   * @param {THREE.Scene} scene
   * @param {object} playerData
   */
  constructor(scene, playerData) {
    this.scene = scene;
    this.id = playerData.id;
    this.name = playerData.name || 'Unknown Pilot';
    this.customData = playerData.customData || {};
    this.shipIndex = (typeof playerData.state?.shipIndex === 'number')
      ? playerData.state.shipIndex
      : (typeof playerData.customData?.shipIndex === 'number')
        ? playerData.customData.shipIndex
        : 0;
    this.themeKey = playerData.state?.themeKey || playerData.customData?.themeKey || 'Cyan';
    this.config = SPACESHIP_CONFIGS[this.shipIndex] || SPACESHIP_CONFIGS[0];
    this.currentMaterial = null;
    this._isLoadingModel = false;
    this._pendingShipIndex = null;
    this._pendingThemeKey = null;

    // Hierarchy
    this.root = new THREE.Group();
    this.visualHolder = new THREE.Group();
    this.thrusterGroup = new THREE.Group();
    this.root.add(this.visualHolder);
    this.visualHolder.add(this.thrusterGroup);
    this.scene.add(this.root);

    // Initial position
    if (playerData.state?.position) {
      this.root.position.fromArray(playerData.state.position);
    } else {
      this.root.position.set(0, 0, -20);
    }

    // Interpolation targets
    this.targetPosition = this.root.position.clone();
    this.targetQuaternion = this.root.quaternion.clone();
    this.velocity = new THREE.Vector3();
    this.targetSpeed = 0;
    this.currentSpeed = 0;
    this.targetBank = 0;
    this.currentBank = 0;
    this.isBoosting = false;
    this.lastPacketTime = performance.now();

    // Vitals
    this.health = playerData.state?.health ?? 100;
    this.shield = playerData.state?.shield ?? 100;
    this.maxHealth = 100;
    this.maxShield = 100;
    this.isDestroyed = false;
    this.kills = playerData.state?.kills ?? 0;
    this.deaths = playerData.state?.deaths ?? 0;
    this.score = playerData.state?.score ?? 0;
    this.ping = 0;

    // Collision Bounding Sphere
    this.radius = 3.6;
    this.boundingSphere = new THREE.Sphere(this.root.position, this.radius);

    // Active Thrusters
    this.activeThrusters = [];
    this.sparkSystem = new ThrusterSparkSystem(this.scene, 120);

    // Shield Dome Mesh (flashes on impact or respawn invulnerability)
    this.setupShieldDome();

    // Load Ship Mesh
    this.modelInstance = null;
    this.loadShipModel();
  }

  async loadShipModel(themeKey = null) {
    if (this._isLoadingModel) {
      this._pendingShipIndex = this.shipIndex;
      this._pendingThemeKey = themeKey || this.themeKey;
      return;
    }
    this._isLoadingModel = true;
    const targetTheme = themeKey || this.themeKey || 'Cyan';

    try {
      const template = await shipLoader.getShipTemplate(this.shipIndex);
      if (this.isDestroyed) {
        this._isLoadingModel = false;
        return;
      }

      if (this.modelInstance) {
        this.visualHolder.remove(this.modelInstance);
        this.modelInstance = null;
      }

      const instance = template.createInstance();

      // Create dedicated StarSparrow material instance so remote player's theme colors work independently
      const mat = createStarSparrowMaterial(template.config);
      if (mat && mat.setTheme) {
        mat.setTheme(targetTheme);
      }
      this.currentMaterial = mat;

      instance.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = mat;
        }
      });

      this.modelInstance = instance;
      this.visualHolder.add(this.modelInstance);

      // Setup Thrusters matching this ship model's hardpoints
      this.buildThrusters(template.config.thrusters);

      // Apply theme color to thruster flames & sparks
      this.applyTheme(targetTheme);
    } catch (err) {
      console.warn(`[RemotePlayer] Failed to load model for ${this.name}:`, err);
    } finally {
      this._isLoadingModel = false;
      if (this._pendingShipIndex !== null) {
        const nextIdx = this._pendingShipIndex;
        const nextTheme = this._pendingThemeKey;
        this._pendingShipIndex = null;
        this._pendingThemeKey = null;
        if (nextIdx !== this.shipIndex || (nextTheme && nextTheme !== this.themeKey)) {
          this.setShip(nextIdx, nextTheme);
        }
      }
    }
  }

  async setShip(shipIndex, themeKey = null) {
    if (typeof shipIndex !== 'number' || shipIndex < 0 || shipIndex >= SPACESHIP_CONFIGS.length) {
      return;
    }
    const shipChanged = shipIndex !== this.shipIndex;
    const themeChanged = Boolean(themeKey && themeKey !== this.themeKey);

    this.shipIndex = shipIndex;
    this.config = SPACESHIP_CONFIGS[shipIndex] || SPACESHIP_CONFIGS[0];
    if (themeKey) this.themeKey = themeKey;

    if (shipChanged || !this.modelInstance) {
      await this.loadShipModel(this.themeKey);
    } else if (themeChanged) {
      this.applyTheme(this.themeKey);
    }
  }

  applyTheme(themeKey) {
    if (!themeKey) return;
    this.themeKey = themeKey;
    if (this.currentMaterial && this.currentMaterial.setTheme) {
      this.currentMaterial.setTheme(themeKey);
    }
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

  buildThrusters(thrusterConfigs = []) {
    for (const t of this.activeThrusters) {
      this.thrusterGroup.remove(t.root);
      t.dispose();
    }
    this.activeThrusters = [];

    const configs = thrusterConfigs && thrusterConfigs.length > 0
      ? thrusterConfigs
      : [
          { position: { x: -0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#38bdf8' },
          { position: { x: 0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#38bdf8' }
        ];

    for (const tConfig of configs) {
      const radius = typeof tConfig.size === 'number' ? 0.2 * tConfig.size : (tConfig.size?.radius || 0.22);
      const length = typeof tConfig.size === 'number' ? 1.2 * tConfig.size : (tConfig.size?.length || 1.35);
      const thruster = new ThrusterFlame(tConfig, radius, length);
      this.thrusterGroup.add(thruster.root);
      this.activeThrusters.push(thruster);
    }

    if (this.activeThrusters[0] && this.sparkSystem) {
      this.sparkSystem.setColor(this.activeThrusters[0].flameColor);
    }
  }

  setupShieldDome() {
    const geom = new THREE.SphereGeometry(this.radius * 1.15, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.shieldMesh = new THREE.Mesh(geom, mat);
    this.shieldMesh.visible = false;
    this.root.add(this.shieldMesh);
    this.shieldFlashTimer = 0;
  }

  flashShield(duration = 0.35) {
    this.shieldFlashTimer = duration;
    this.shieldMesh.visible = true;
    this.shieldMesh.material.opacity = 0.55;
  }



  /**
   * Applies received network transform packet
   */
  applyTransform(packet) {
    if (this.isDestroyed) return;
    this.lastPacketTime = performance.now();

    // Dynamically sync ship model and theme from peer transform packets
    if (packet.shipIndex !== undefined && (packet.shipIndex !== this.shipIndex || (packet.themeKey && packet.themeKey !== this.themeKey))) {
      this.setShip(packet.shipIndex, packet.themeKey);
    }

    if (packet.pos) {
      this.targetPosition.set(packet.pos[0], packet.pos[1], packet.pos[2]);
    }
    if (packet.quat) {
      this.targetQuaternion.set(packet.quat[0], packet.quat[1], packet.quat[2], packet.quat[3]);
    }
    if (packet.vel) {
      this.velocity.set(packet.vel[0], packet.vel[1], packet.vel[2]);
    }
    if (typeof packet.speed === 'number') {
      this.targetSpeed = packet.speed;
    }
    if (typeof packet.isBoosting === 'boolean') {
      this.isBoosting = packet.isBoosting;
    }
    if (typeof packet.bankAngle === 'number') {
      this.targetBank = packet.bankAngle;
    }
  }

  setVitals(health, shield) {
    if (typeof shield === 'number') {
      if (shield < this.shield) this.flashShield();
      this.shield = Math.max(0, Math.min(this.maxShield, shield));
    }
    if (typeof health === 'number') {
      this.health = Math.max(0, Math.min(this.maxHealth, health));
    }
  }

  setDestroyed(destroyed) {
    this.isDestroyed = destroyed;
    this.root.visible = !destroyed;
  }

  update(dt, cameraPosition) {
    if (this.isDestroyed) return;

    // Smooth position interpolation with dead reckoning
    const lerpRate = 1 - Math.exp(-18 * dt);
    this.root.position.lerp(this.targetPosition, lerpRate);
    this.root.quaternion.slerp(this.targetQuaternion, lerpRate);

    // Visual banking tilt
    this.currentBank = THREE.MathUtils.lerp(this.currentBank, this.targetBank, 1 - Math.exp(-12 * dt));
    this.visualHolder.rotation.z = this.currentBank;

    // Smooth speed
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.targetSpeed, 1 - Math.exp(-10 * dt));

    // Update collision sphere position
    this.boundingSphere.center.copy(this.root.position);

    // Update thruster VFX
    const forwardRatio = Math.max(0, Math.min(1, this.currentSpeed / 45.0));
    const targetThrottle = this.isBoosting ? 1.0 : Math.max(0.18, forwardRatio);

    // Update dynamic shader flight effects (boost glow)
    if (this.currentMaterial && this.currentMaterial.updateFlightVFX) {
      const throttleVal = Math.min(1.0, Math.abs(this.currentSpeed) / 55.0);
      this.currentMaterial.updateFlightVFX(dt, this.isBoosting, throttleVal);
    }

    const shipWorldQuat = this.visualHolder.getWorldQuaternion(new THREE.Quaternion());
    const shipDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipWorldQuat);
    const shouldSpawnSparks = (this.currentSpeed > 3.0 || this.isBoosting) && Math.random() < (this.isBoosting ? 0.75 : 0.35);

    for (const thruster of this.activeThrusters) {
      thruster.update(dt, targetThrottle, this.isBoosting);

      if (shouldSpawnSparks && this.sparkSystem) {
        const worldPos = new THREE.Vector3();
        thruster.root.getWorldPosition(worldPos);
        this.sparkSystem.spawnSparks(worldPos, shipDir, this.isBoosting);
      }
    }

    // Shield dome flash timer
    if (this.shieldFlashTimer > 0) {
      this.shieldFlashTimer -= dt;
      this.shieldMesh.material.opacity = Math.max(0, this.shieldFlashTimer / 0.35 * 0.55);
      if (this.shieldFlashTimer <= 0) {
        this.shieldMesh.visible = false;
      }
    }

  }

  dispose() {
    this.scene.remove(this.root);
    for (const t of this.activeThrusters) {
      t.dispose();
    }
  }
}
