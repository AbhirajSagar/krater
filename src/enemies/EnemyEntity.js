/**
 * EnemyEntity.js
 * Base physical & visual representation of an enemy spacecraft in the 3D battlefield.
 * Mode-agnostic: functions identically in singleplayer (driven by AI) or multiplayer (driven by network packets).
 * Conforms to the HUD and targeting interfaces expected by CombatHUD and SpaceshipController.
 */

import * as THREE from 'three';
import { shipLoader } from '../ShipLoader.js';
import { ThrusterFlame, ThrusterSparkSystem } from '../ThrusterVFX.js';
import { SPACESHIP_CONFIGS } from '../spaceshipConfig.js';
import { createStarSparrowMaterial, SPARROW_THEMES } from '../StarSparrowMaterial.js';

// Static scratch objects to eliminate per-frame GC allocations
const _shipQuat = new THREE.Quaternion();
const _shipDir = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _impactDir = new THREE.Vector3();
const _sparkNormal = new THREE.Vector3();

let _idCounter = 1;

export class EnemyEntity {
  /**
   * @param {THREE.Scene} scene
   * @param {object} options
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.id = options.id || `enemy_${Date.now()}_${_idCounter++}`;
    this.name = options.name || 'ENEMY VESSEL';
    this.archetype = options.archetype || 'generic';
    this.shipIndex = typeof options.shipIndex === 'number' ? options.shipIndex : 1;
    this.themeKey = options.themeKey || 'Red';
    this.config = SPACESHIP_CONFIGS[this.shipIndex] || SPACESHIP_CONFIGS[0];

    // Vitals
    this.maxHealth = options.maxHealth ?? options.health ?? 160;
    this.maxShield = options.maxShield ?? options.shield ?? 100;
    this.health = options.health ?? this.maxHealth;
    this.shield = options.shield ?? this.maxShield;
    this.scoreValue = options.scoreValue ?? 100;
    this.isDestroyed = false;

    // Physical & visual impact recoil (spring-damper shock)
    this.impactOffset = new THREE.Vector3();
    this.impactVelocity = new THREE.Vector3();
    this.impactRotation = new THREE.Vector3();
    this.impactRotVelocity = new THREE.Vector3();

    // Radius & Bounding Sphere
    this.radius = options.radius ?? 3.6;

    // Hierarchy
    this.root = new THREE.Group();
    this.root.name = `EnemyRoot_${this.id}`;
    this.visualHolder = new THREE.Group();
    this.thrusterGroup = new THREE.Group();
    this.root.add(this.visualHolder);
    this.visualHolder.add(this.thrusterGroup);
    this.scene.add(this.root);

    // Initial transform
    if (options.position) {
      if (Array.isArray(options.position)) {
        this.root.position.fromArray(options.position);
      } else if (options.position.isVector3) {
        this.root.position.copy(options.position);
      }
    }
    if (options.rotation) {
      if (options.rotation.isQuaternion) {
        this.root.quaternion.copy(options.rotation);
      } else if (options.rotation.isEuler) {
        this.root.rotation.copy(options.rotation);
      }
    }

    // Kinematics & interpolation
    this.velocity = new THREE.Vector3();
    this.targetPosition = this.root.position.clone();
    this.targetQuaternion = this.root.quaternion.clone();
    this.targetSpeed = 0;
    this.currentSpeed = 0;
    this.targetBank = 0;
    this.currentBank = 0;
    this.isBoosting = false;
    this.lastPacketTime = performance.now();

    // Bounding sphere
    this.boundingSphere = new THREE.Sphere(this.root.position, this.radius);

    // Thruster VFX & Spark system
    this.activeThrusters = [];
    this.sparkSystem = new ThrusterSparkSystem(this.scene, 120);

    // Shield Dome Mesh
    this.setupShieldDome();

    // Model and Material Loading
    this.modelInstance = null;
    this.currentMaterial = null;
    this._isLoadingModel = false;
    this._pendingShipIndex = null;
    this._pendingThemeKey = null;

    // Metadata
    this.userData = { ...(options.userData || {}) };

    // Event hooks
    this.onDamaged = options.onDamaged || null;
    this.onDestroyed = options.onDestroyed || null;

    // Initialize 3D ship mesh
    this.loadShipModel(this.themeKey);
  }

  async loadShipModel(themeKey = null) {
    if (this._isLoadingModel) {
      this._pendingShipIndex = this.shipIndex;
      this._pendingThemeKey = themeKey || this.themeKey;
      return;
    }
    this._isLoadingModel = true;
    const targetTheme = themeKey || this.themeKey || 'Red';

    try {
      const template = await shipLoader.getShipTemplate(this.shipIndex);
      if (this.isDestroyed || !this.root) {
        this._isLoadingModel = false;
        return;
      }

      if (this.modelInstance) {
        this.visualHolder.remove(this.modelInstance);
        this.modelInstance = null;
      }

      const instance = template.createInstance();

      // Independent StarSparrow material instance so this enemy has its own theme & flight shader uniforms
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

      // Build Thruster Flames matching this ship model's hardpoints
      this.buildThrusters(template.config.thrusters);

      // Apply theme color
      this.applyTheme(targetTheme);
    } catch (err) {
      console.warn(`[EnemyEntity] Failed to load model for ${this.name} (${this.id}):`, err);
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
          { position: { x: -0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#ff4422' },
          { position: { x: 0.65, y: 0.05, z: 1.95 }, size: { radius: 0.22, length: 1.35 }, color: '#ff4422' }
        ];

    for (const tConfig of configs) {
      const radius = typeof tConfig.size === 'number' ? 0.2 * tConfig.size : (tConfig.size?.radius || 0.22);
      const length = typeof tConfig.size === 'number' ? 1.2 * tConfig.size : (tConfig.size?.length || 1.35);
      const thruster = new ThrusterFlame({ ...tConfig, enablePointLight: false }, radius, length);
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
   * Applies damage to shield, then to health.
   * @param {number} amount
   * @param {string} [attackerId]
   * @param {THREE.Vector3} [hitPoint]
   * @returns {{ damage: number, shield: number, health: number, isDestroyed: boolean }}
   */
  takeDamage(amount, attackerId = null, hitPoint = null) {
    if (this.isDestroyed) {
      return { damage: 0, shield: 0, health: 0, isDestroyed: true };
    }

    // Visual hull hit flash
    if (this.currentMaterial && this.currentMaterial.triggerHitFlash) {
      this.currentMaterial.triggerHitFlash(1.0);
    }

    if (this.shield > 0) {
      this.flashShield(0.4);
    }

    // Physical kinetic recoil impulse & angular jolt
    if (hitPoint) {
      _impactDir.subVectors(this.root.position, hitPoint).normalize();
      if (_impactDir.lengthSq() < 0.001) {
        _impactDir.set(0, 0, 1).applyQuaternion(this.root.quaternion);
      }
    } else {
      _impactDir.set(0, 0, 1).applyQuaternion(this.root.quaternion);
    }

    const kickImpulse = Math.min(2.4, 0.8 + amount * 0.03);
    this.impactVelocity.addScaledVector(_impactDir, kickImpulse);

    // Subtle tactile angular flinch
    this.impactRotVelocity.x += (Math.random() - 0.5) * 1.4;
    this.impactRotVelocity.y += (Math.random() - 0.5) * 1.0;
    this.impactRotVelocity.z += (Math.random() - 0.5) * 1.6;

    // Localized sparks at hit point
    if (hitPoint && this.sparkSystem) {
      _sparkNormal.subVectors(hitPoint, this.root.position).normalize();
      this.sparkSystem.spawnSparks(hitPoint, _sparkNormal, true);
    }

    let damageRemaining = Math.max(0, amount);
    if (this.shield > 0) {
      if (damageRemaining <= this.shield) {
        this.shield -= damageRemaining;
        damageRemaining = 0;
      } else {
        damageRemaining -= this.shield;
        this.shield = 0;
      }
    }

    if (damageRemaining > 0) {
      this.health = Math.max(0, this.health - damageRemaining);
    }

    if (this.onDamaged) {
      this.onDamaged(amount, attackerId, hitPoint);
    }

    if (this.health <= 0 && !this.isDestroyed) {
      this.destroy(attackerId);
    }

    return {
      damage: amount,
      shield: this.shield,
      health: this.health,
      isDestroyed: this.isDestroyed
    };
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

  destroy(killerId = null) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.root.visible = false;

    if (this.onDestroyed) {
      this.onDestroyed(killerId);
    }
  }

  respawn(position = null, rotation = null) {
    this.isDestroyed = false;
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.root.visible = true;

    if (position) {
      if (Array.isArray(position)) {
        this.root.position.fromArray(position);
      } else if (position.isVector3) {
        this.root.position.copy(position);
      }
      this.targetPosition.copy(this.root.position);
    }
    if (rotation) {
      if (rotation.isQuaternion) {
        this.root.quaternion.copy(rotation);
      } else if (rotation.isEuler) {
        this.root.rotation.copy(rotation);
      }
      this.targetQuaternion.copy(this.root.quaternion);
    }

    this.velocity.set(0, 0, 0);
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.flashShield(2.5); // Respawn shield glow
  }

  setDestroyed(destroyed) {
    this.isDestroyed = destroyed;
    this.root.visible = !destroyed;
  }

  /**
   * Applies network transform packet (multiplayer sync)
   */
  applyTransform(packet) {
    if (this.isDestroyed || !packet) return;
    this.lastPacketTime = performance.now();

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
    if (packet.health !== undefined || packet.shield !== undefined) {
      this.setVitals(packet.health, packet.shield);
    }
    if (packet.isDestroyed !== undefined && packet.isDestroyed !== this.isDestroyed) {
      this.setDestroyed(packet.isDestroyed);
    }
  }

  /**
   * Serializes current transform and vitals for network transmission
   */
  getTransformPacket() {
    return {
      id: this.id,
      archetype: this.archetype,
      shipIndex: this.shipIndex,
      themeKey: this.themeKey,
      pos: [this.root.position.x, this.root.position.y, this.root.position.z],
      quat: [this.root.quaternion.x, this.root.quaternion.y, this.root.quaternion.z, this.root.quaternion.w],
      vel: [this.velocity.x, this.velocity.y, this.velocity.z],
      speed: this.currentSpeed,
      bankAngle: this.currentBank,
      isBoosting: this.isBoosting,
      health: this.health,
      shield: this.shield,
      isDestroyed: this.isDestroyed
    };
  }

  /**
   * Per-frame update for visuals, kinematics, thrusters, and shield
   * @param {number} dt
   * @param {THREE.Vector3} [cameraPosition]
   */
  update(dt, cameraPosition = null) {
    if (this.isDestroyed || !this.root.visible) return;

    // Smooth position and rotation interpolation (dead reckoning / smoothing)
    const lerpRate = 1 - Math.exp(-18 * dt);
    this.root.position.lerp(this.targetPosition, lerpRate);
    this.root.quaternion.slerp(this.targetQuaternion, lerpRate);

    // Damped spring recovery for tactile visual impact recoil
    const springK = 52.0;
    const damping = 12.0;
    this.impactVelocity.addScaledVector(this.impactOffset, -springK * dt);
    this.impactVelocity.multiplyScalar(Math.exp(-damping * dt));
    this.impactOffset.addScaledVector(this.impactVelocity, dt);

    this.impactRotVelocity.addScaledVector(this.impactRotation, -springK * dt);
    this.impactRotVelocity.multiplyScalar(Math.exp(-damping * dt));
    this.impactRotation.addScaledVector(this.impactRotVelocity, dt);

    // Visual banking tilt + impact shudder
    this.currentBank = THREE.MathUtils.lerp(this.currentBank, this.targetBank, 1 - Math.exp(-12 * dt));
    this.visualHolder.position.copy(this.impactOffset);
    this.visualHolder.rotation.set(
      this.impactRotation.x,
      this.impactRotation.y,
      this.currentBank + this.impactRotation.z
    );

    // Smooth speed
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.targetSpeed, 1 - Math.exp(-10 * dt));

    // Keep collision bounding sphere centered on current position
    this.boundingSphere.center.copy(this.root.position);

    // Update thruster VFX
    const forwardRatio = Math.max(0, Math.min(1, this.currentSpeed / 45.0));
    const targetThrottle = this.isBoosting ? 1.0 : Math.max(0.18, forwardRatio);

    if (this.currentMaterial && this.currentMaterial.updateFlightVFX) {
      const throttleVal = Math.min(1.0, Math.abs(this.currentSpeed) / 55.0);
      this.currentMaterial.updateFlightVFX(dt, this.isBoosting, throttleVal);
    }

    this.visualHolder.getWorldQuaternion(_shipQuat);
    _shipDir.set(0, 0, -1).applyQuaternion(_shipQuat);
    const shouldSpawnSparks = (this.currentSpeed > 3.0 || this.isBoosting) && Math.random() < (this.isBoosting ? 0.75 : 0.35);

    for (const thruster of this.activeThrusters) {
      thruster.update(dt, targetThrottle, this.isBoosting);

      if (shouldSpawnSparks && this.sparkSystem) {
        // Reuse static scratch vector
        thruster.root.getWorldPosition(_worldPos);
        this.sparkSystem.spawnSparks(_worldPos, _shipDir, this.isBoosting);
      }
    }

    if (this.sparkSystem) {
      this.sparkSystem.update(dt);
    }

    // Shield dome flash timer
    if (this.shieldFlashTimer > 0) {
      this.shieldFlashTimer -= dt;
      this.shieldMesh.material.opacity = Math.max(0, (this.shieldFlashTimer / 0.35) * 0.55);
      if (this.shieldFlashTimer <= 0) {
        this.shieldMesh.visible = false;
      }
    }
  }

  dispose() {
    if (this.root && this.root.parent) {
      this.root.parent.remove(this.root);
    }
    for (const t of this.activeThrusters) {
      t.dispose();
    }
    this.activeThrusters = [];

    if (this.sparkSystem) {
      this.sparkSystem.dispose();
      this.sparkSystem = null;
    }

    if (this.shieldMesh) {
      this.shieldMesh.geometry.dispose();
      this.shieldMesh.material.dispose();
      this.shieldMesh = null;
    }

    if (this.modelInstance) {
      this.visualHolder.remove(this.modelInstance);
      this.modelInstance = null;
    }
  }
}
