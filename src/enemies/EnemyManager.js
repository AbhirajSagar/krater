/**
 * EnemyManager.js
 * Central coordinator for active enemy vessels on the battlefield.
 * Manages AI execution, enemy laser projectiles, hit detection, crosshair lock-on acquisition,
 * visual death explosions, and transparent composition with RemotePlayerManager for hybrid multiplayer.
 */

import * as THREE from 'three';
import { sounds } from '../SoundManager.js';

// Static collision scratchpads to avoid per-frame GC allocations
const _seg = new THREE.Vector3();
const _v = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _pOldPos = new THREE.Vector3();
const _pNewPos = new THREE.Vector3();
const _camSpace = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _leadWorld = new THREE.Vector3();
const _leadScreenPos = new THREE.Vector3();
const _bestLeadPoint = new THREE.Vector3();
const _bestAimPoint = new THREE.Vector3();
const _staticTargetResult = {
  player: null,
  screenX: 0,
  screenY: 0,
  worldDistance: 0,
  leadPoint: _bestLeadPoint,
  aimPoint: _bestAimPoint
};

export class EnemyManager {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../AsteroidField.js').AsteroidField} [asteroidField]
   */
  constructor(scene, asteroidField = null) {
    this.scene = scene;
    this.asteroidField = asteroidField;
    this.enemies = new Map(); // id -> EnemyEntity | AIEnemy

    // Optional RemotePlayerManager for hybrid multiplayer target resolution
    this.remotePlayersManager = null;

    // Laser projectile pool for AI enemy fire
    this.setupEnemyLaserPool(48);

    // Event listeners: eventName -> Set<Function>
    this.eventListeners = new Map();
  }

  setAsteroidField(asteroidField) {
    this.asteroidField = asteroidField;
  }

  setRemotePlayerManager(rpm) {
    this.remotePlayersManager = rpm;
  }

  // --- Event Emitter ---
  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(fn);
  }

  off(event, fn) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(fn);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      for (const fn of this.eventListeners.get(event)) {
        try {
          fn(data);
        } catch (err) {
          console.error(`[EnemyManager] Error in listener for '${event}':`, err);
        }
      }
    }
  }

  // --- Enemy Registry ---
  addEnemy(enemy) {
    if (this.enemies.has(enemy.id)) {
      return this.enemies.get(enemy.id);
    }

    this.enemies.set(enemy.id, enemy);

    // Wire AI laser firing to EnemyManager's laser pool
    if (enemy.onFireLaser === null) {
      enemy.onFireLaser = (shotData) => {
        this.fireEnemyLaser(shotData);
      };
    }

    // Wire damage and destruction callbacks
    const originalOnDamaged = enemy.onDamaged;
    enemy.onDamaged = (amount, attackerId, hitPoint) => {
      if (originalOnDamaged) originalOnDamaged(amount, attackerId, hitPoint);
      this.emit('enemyDamaged', { enemy, amount, attackerId, hitPoint });
    };

    const originalOnDestroyed = enemy.onDestroyed;
    enemy.onDestroyed = (killerId) => {
      if (originalOnDestroyed) originalOnDestroyed(killerId);
      this.spawnShipExplosion(enemy.root.position);
      this.emit('enemyKilled', { enemy, killerId });
    };

    this.emit('enemySpawned', { enemy });
    return enemy;
  }

  removeEnemy(enemyId) {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.dispose();
      this.enemies.delete(enemyId);
      this.emit('enemyRemoved', { id: enemyId });
    }
  }

  getEnemy(enemyId) {
    return this.enemies.get(enemyId) || null;
  }

  hasEnemy(enemyId) {
    return this.enemies.has(enemyId);
  }

  getAllEnemies() {
    return Array.from(this.enemies.values());
  }

  getActiveCount() {
    let count = 0;
    for (const e of this.enemies.values()) {
      if (!e.isDestroyed) count++;
    }
    return count;
  }

  /**
   * Unified accessor conforming to CombatHUD and target queries.
   * If remotePlayersManager is composed, returns both AI enemies and remote human players.
   */
  getAllPlayers() {
    const enemies = Array.from(this.enemies.values());
    if (this.remotePlayersManager) {
      const remotes = this.remotePlayersManager.getAllPlayers();
      return enemies.concat(remotes);
    }
    return enemies;
  }

  // --- Hit Detection ---
  /**
   * Checks if player laser segment [oldPos, newPos] struck any active enemy
   * @param {THREE.Vector3} oldPos
   * @param {THREE.Vector3} newPos
   * @returns {{ player: import('./EnemyEntity.js').EnemyEntity, hitPoint: THREE.Vector3 } | null}
   */
  checkLaserHit(oldPos, newPos) {
    _seg.subVectors(newPos, oldPos);
    const segLenSq = _seg.lengthSq();
    if (segLenSq < 0.0001) return null;

    // 1. Check AI enemies first
    for (const enemy of this.enemies.values()) {
      if (enemy.isDestroyed || !enemy.root.visible) continue;

      const pPos = enemy.root.position;
      const r = enemy.radius;
      const hitRadius = r * 1.8 + 1.8; // Generous arcade bullet magnetism

      // Fast AABB rejection
      if (Math.abs(oldPos.x - pPos.x) > hitRadius + 10 && Math.abs(newPos.x - pPos.x) > hitRadius + 10) continue;
      if (Math.abs(oldPos.y - pPos.y) > hitRadius + 10 && Math.abs(newPos.y - pPos.y) > hitRadius + 10) continue;
      if (Math.abs(oldPos.z - pPos.z) > hitRadius + 10 && Math.abs(newPos.z - pPos.z) > hitRadius + 10) continue;

      _v.subVectors(pPos, oldPos);
      const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
      _closest.copy(oldPos).addScaledVector(_seg, t);

      const distSq = _closest.distanceToSquared(pPos);
      if (distSq <= hitRadius * hitRadius) {
        return {
          player: enemy,
          hitPoint: _closest.clone()
        };
      }
    }

    // 2. If composed with RemotePlayerManager, check remote players next
    if (this.remotePlayersManager) {
      return this.remotePlayersManager.checkLaserHit(oldPos, newPos);
    }

    return null;
  }

  /**
   * Acquires the best enemy target in line-of-sight / crosshair cone,
   * checking both direct ship position and predictive lead impact point.
   * @param {THREE.PerspectiveCamera} camera
   * @param {number} maxScreenDist Normalized distance from screen center (0..1)
   */
  getNearestTargetInAim(camera, maxScreenDist = 0.22) {
    let bestTarget = null;
    let minDistance = Infinity;

    // Check enemies
    for (const enemy of this.enemies.values()) {
      if (enemy.isDestroyed || !enemy.root.visible) continue;

      _camSpace.copy(enemy.root.position).applyMatrix4(camera.matrixWorldInverse);
      if (_camSpace.z >= -0.1) continue; // Behind camera

      _screenPos.copy(enemy.root.position).project(camera);
      const shipScreenDist = Math.hypot(_screenPos.x, _screenPos.y);

      // Predictive lead calculation (lasers travel at 280 m/s)
      const worldDist = enemy.root.position.distanceTo(camera.position);
      const tLead = worldDist / 280.0;
      _leadWorld.copy(enemy.root.position).addScaledVector(enemy.velocity, tLead);

      _leadScreenPos.copy(_leadWorld).project(camera);
      const leadScreenDist = Math.hypot(_leadScreenPos.x, _leadScreenPos.y);

      const effectiveScreenDist = Math.min(shipScreenDist, leadScreenDist);
      if (effectiveScreenDist <= maxScreenDist) {
        if (worldDist < minDistance) {
          minDistance = worldDist;
          const preferLead = leadScreenDist <= shipScreenDist && enemy.velocity.length() > 1.2;
          _bestLeadPoint.copy(_leadWorld);
          _bestAimPoint.copy(preferLead ? _leadWorld : enemy.root.position);
          _staticTargetResult.player = enemy;
          _staticTargetResult.screenX = preferLead ? _leadScreenPos.x : _screenPos.x;
          _staticTargetResult.screenY = preferLead ? _leadScreenPos.y : _screenPos.y;
          _staticTargetResult.worldDistance = worldDist;
          bestTarget = _staticTargetResult;
        }
      }
    }

    // If composed with RemotePlayerManager, check if a remote human player is closer
    if (this.remotePlayersManager) {
      const remoteTarget = this.remotePlayersManager.getNearestTargetInAim(camera, maxScreenDist);
      if (remoteTarget && remoteTarget.worldDistance < minDistance) {
        bestTarget = remoteTarget;
      }
    }

    return bestTarget;
  }

  // --- Visual Explosion ---
  spawnShipExplosion(pos) {
    if (this.asteroidField) {
      this.asteroidField.spawnExplosionSparks(pos, 5.5, true);
      if (this.asteroidField.spawnShipWreckage) {
        this.asteroidField.spawnShipWreckage(pos, 3.2, 10);
      }
      this.asteroidField.spawnShockwave(pos, 6.0);
    }
    sounds.playExplosion(1.4);
    this.emit('shipExplosion', { position: pos });
  }

  // --- Enemy Lasers Pool ---
  setupEnemyLaserPool(size = 48) {
    this.maxLasers = size;
    this.laserPool = [];
    this.activeLasers = [];
    this.laserMatCache = new Map();
    const commonColors = ['#ff3b30', '#ff2244', '#38bdf8', '#00e5ff', '#ffaa00'];
    for (const c of commonColors) {
      this.getLaserMaterial(c);
    }

    const geom = new THREE.CylinderGeometry(0.045, 0.08, 2.4, 8);
    geom.rotateX(Math.PI / 2);

    const coreGeom = new THREE.CylinderGeometry(0.018, 0.028, 2.1, 6);
    coreGeom.rotateX(Math.PI / 2);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < size; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const outerMat = this.getLaserMaterial('#ff3b30');
      const outerMesh = new THREE.Mesh(geom, outerMat);
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      group.add(outerMesh);
      group.add(coreMesh);

      this.scene.add(group);

      this.laserPool.push({
        group,
        outerMesh,
        dir: new THREE.Vector3(),
        speed: 160.0,
        damage: 15,
        life: 0.0,
        maxLife: 1.4,
        active: false,
        shooterId: null
      });
    }
  }

  getLaserMaterial(colorHex) {
    if (!this.laserMatCache.has(colorHex)) {
      this.laserMatCache.set(colorHex, new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
    }
    return this.laserMatCache.get(colorHex);
  }

  fireEnemyLaser(shotData) {
    if (!shotData) return;

    let p = null;
    for (let i = 0; i < this.maxLasers; i++) {
      if (!this.laserPool[i].active) {
        p = this.laserPool[i];
        break;
      }
    }
    if (!p) {
      p = this.activeLasers.shift();
    }

    p.group.position.set(shotData.origin[0], shotData.origin[1], shotData.origin[2]);
    p.dir.set(shotData.dir[0], shotData.dir[1], shotData.dir[2]).normalize();
    p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), p.dir);
    p.speed = shotData.speed || 160.0;
    p.damage = shotData.damage || 15;
    p.life = 0.0;
    p.maxLife = 1.4;
    p.shooterId = shotData.shooterId;
    p.active = true;
    p.group.visible = true;

    const colorHex = shotData.color || '#ff3b30';
    p.outerMesh.material = this.getLaserMaterial(colorHex);

    this.activeLasers.push(p);
  }

  // --- Network Synchronization Handlers ---
  handleEnemyTransform(enemyId, packet) {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.applyTransform(packet);
    }
  }

  handleEnemyDamaged(enemyId, shield, health) {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.setVitals(health, shield);
    }
  }

  handleEnemyKilled(enemyId, killerId = null) {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.destroy(killerId);
    }
  }

  handleEnemyRespawned(enemyId, pos = null) {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.respawn(pos);
    }
  }

  serializeAllTransforms() {
    const packets = [];
    for (const enemy of this.enemies.values()) {
      if (!enemy.isDestroyed) {
        packets.push(enemy.getTransformPacket());
      }
    }
    return packets;
  }

  // --- Per-frame Update ---
  update(dt, camera, localSpaceship = null) {
    // 1. Build context for AI decisions
    const context = {
      playerPosition: localSpaceship?.root?.position || null,
      playerVelocity: localSpaceship?.velocity || null,
      camera
    };

    // 2. Update active enemies
    for (const enemy of this.enemies.values()) {
      enemy.update(dt, context);
    }

    // 3. Update Enemy Lasers and test hits against localSpaceship
    if (this.activeLasers.length > 0) {
      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const p = this.activeLasers[i];
        p.life += dt;

        _pOldPos.copy(p.group.position);
        p.group.position.addScaledVector(p.dir, p.speed * dt);
        _pNewPos.copy(p.group.position);

        // Check collision against local spaceship
        if (localSpaceship && localSpaceship.enabled && !localSpaceship.isDestroyed && (localSpaceship.invulnerableTimer || 0) <= 0) {
          const shipPos = localSpaceship.root.position;
          const r = localSpaceship.radius || 2.4;

          _seg.subVectors(_pNewPos, _pOldPos);
          const segLenSq = _seg.lengthSq();
          if (segLenSq > 0.0001) {
            _v.subVectors(shipPos, _pOldPos);
            const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
            _closest.copy(_pOldPos).addScaledVector(_seg, t);

            if (_closest.distanceToSquared(shipPos) <= r * r) {
              p.active = false;
              p.group.visible = false;
              this.activeLasers.splice(i, 1);
              const shooter = this.getEnemy(p.shooterId);
              const sourcePos = shooter ? shooter.root.position : p.group.position;
              localSpaceship.takeDamage(p.damage, p.shooterId, _closest, sourcePos);
              if (this.asteroidField && this.asteroidField.spawnLaserHitEffect) {
                const hitNorm = new THREE.Vector3().subVectors(_closest, shipPos).normalize();
                this.asteroidField.spawnLaserHitEffect(_closest, hitNorm, '#ff3b30');
              }
              continue;
            }
          }
        }

        // Check collision against Asteroid Field
        if (this.asteroidField) {
          const hit = this.asteroidField.checkLaserHit(_pOldPos, _pNewPos, '#ff3b30');
          if (hit) {
            p.active = false;
            p.group.visible = false;
            this.activeLasers.splice(i, 1);
            continue;
          }
        }

        if (p.life >= p.maxLife) {
          p.active = false;
          p.group.visible = false;
          this.activeLasers.splice(i, 1);
        }
      }
    }
  }

  clear() {
    for (const enemy of this.enemies.values()) {
      enemy.dispose();
    }
    this.enemies.clear();

    for (const p of this.activeLasers) {
      p.active = false;
      p.group.visible = false;
    }
    this.activeLasers = [];
  }
}
