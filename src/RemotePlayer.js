/**
 * RemotePlayer.js
 * Represents a network opponent spaceship in the 3D space battlefield.
 * Features smooth position/rotation interpolation, authentic StarSparrow visuals,
 * active thrusters & sparks, 3D dynamic overhead vitals nameplate, and shield bubble.
 */

import * as THREE from 'three';
import { shipLoader } from './ShipLoader.js';
import { ThrusterFlame, ThrusterSparkSystem } from './ThrusterVFX.js';
import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';

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
    this.shipIndex = playerData.customData?.shipIndex ?? 0;
    this.config = SPACESHIP_CONFIGS[this.shipIndex] || SPACESHIP_CONFIGS[0];

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

    // 3D Overhead Nameplate Billboard
    this.setupNameplate();

    // Load Ship Mesh
    this.modelInstance = null;
    this.loadShipModel();
  }

  async loadShipModel() {
    try {
      const template = await shipLoader.getShipTemplate(this.shipIndex);
      if (this.isDestroyed) return;

      if (this.modelInstance) {
        this.visualHolder.remove(this.modelInstance);
      }

      this.modelInstance = template.createInstance();
      this.visualHolder.add(this.modelInstance);

      // Setup Thrusters
      this.buildThrusters(template.config.thrusters);
    } catch (err) {
      console.warn(`[RemotePlayer] Failed to load model for ${this.name}:`, err);
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

  setupNameplate() {
    this.nameplateCanvas = document.createElement('canvas');
    this.nameplateCanvas.width = 384;
    this.nameplateCanvas.height = 128;
    this.nameplateCtx = this.nameplateCanvas.getContext('2d');

    this.nameplateTexture = new THREE.CanvasTexture(this.nameplateCanvas);
    this.nameplateTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.nameplateTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.position.set(0, 3.8, 0);
    this.nameplateSprite.scale.set(6.0, 2.0, 1.0);
    this.root.add(this.nameplateSprite);

    this.lastDrawnHealth = -1;
    this.lastDrawnShield = -1;
    this.lastDrawnDist = -1;
    this.updateNameplate(0);
  }

  updateNameplate(distance = 0) {
    const distMeters = Math.round(distance);
    // Draw only if values changed to minimize GPU texture uploads
    if (this.lastDrawnHealth === this.health &&
        this.lastDrawnShield === this.shield &&
        this.lastDrawnDist === distMeters) {
      return;
    }

    this.lastDrawnHealth = this.health;
    this.lastDrawnShield = this.shield;
    this.lastDrawnDist = distMeters;

    const ctx = this.nameplateCtx;
    const w = this.nameplateCanvas.width;
    const h = this.nameplateCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Semi-transparent sci-fi backing card
    ctx.fillStyle = 'rgba(6, 12, 24, 0.72)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 10);
    ctx.fill();
    ctx.stroke();

    // Callsign & Distance
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name.toUpperCase(), 24, 38);

    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(`${distMeters}m`, w - 24, 38);

    // Shield Bar (Cyan)
    const barX = 24;
    const barW = w - 48;
    const barH = 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, 64, barW, barH);
    const shieldPct = Math.max(0, Math.min(1, this.shield / this.maxShield));
    if (shieldPct > 0) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(barX, 64, barW * shieldPct, barH);
    }

    // Hull / Health Bar (Green -> Orange -> Red)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, 84, barW, barH);
    const healthPct = Math.max(0, Math.min(1, this.health / this.maxHealth));
    if (healthPct > 0) {
      ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, 84, barW * healthPct, barH);
    }

    this.nameplateTexture.needsUpdate = true;
  }

  /**
   * Applies received network transform packet
   */
  applyTransform(packet) {
    if (this.isDestroyed) return;
    this.lastPacketTime = performance.now();

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

    // Update billboard nameplate distance
    if (cameraPosition) {
      const dist = this.root.position.distanceTo(cameraPosition);
      this.updateNameplate(dist);

      // Scale nameplate slightly with distance so it remains legible
      const scaleFactor = Math.max(1.0, Math.min(3.5, dist / 40.0));
      this.nameplateSprite.scale.set(6.0 * scaleFactor, 2.0 * scaleFactor, 1.0);
      this.nameplateSprite.position.set(0, 3.8 * scaleFactor, 0);
    }
  }

  dispose() {
    this.scene.remove(this.root);
    for (const t of this.activeThrusters) {
      t.dispose();
    }
    if (this.nameplateTexture) {
      this.nameplateTexture.dispose();
    }
  }
}
