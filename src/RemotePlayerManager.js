/**
 * RemotePlayerManager.js
 * Coordinates all remote multiplayer pilots in the dogfight arena.
 * Handles remote projectile simulation, laser hit collisions against remote ships,
 * lock-on target acquisition, and visual death explosions.
 */

import * as THREE from 'three';
import { RemotePlayer } from './RemotePlayer.js';
import { sounds } from './SoundManager.js';

// Static collision scratchpad
const _seg = new THREE.Vector3();
const _v = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _pOldPos = new THREE.Vector3();
const _pNewPos = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _leadWorld = new THREE.Vector3();
const _leadScreenPos = new THREE.Vector3();
const _camSpace = new THREE.Vector3();
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

export class RemotePlayerManager {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./AsteroidField.js').AsteroidField} [asteroidField]
   */
  constructor(scene, asteroidField = null) {
    this.scene = scene;
    this.asteroidField = asteroidField;
    this.players = new Map(); // id -> RemotePlayer

    // Remote Laser Bolts Pool
    this.setupRemoteLaserPool(64);
  }

  setAsteroidField(asteroidField) {
    this.asteroidField = asteroidField;
  }

  addPlayer(playerData) {
    if (this.players.has(playerData.id)) {
      this.updatePlayer(playerData);
      return this.players.get(playerData.id);
    }
    const player = new RemotePlayer(this.scene, playerData);
    this.players.set(playerData.id, player);
    return player;
  }

  updatePlayer(playerData) {
    const player = this.players.get(playerData.id);
    if (!player) return;
    if (playerData.name && player.name !== playerData.name) {
      player.name = playerData.name;
    }

    const shipIdx = (typeof playerData.state?.shipIndex === 'number')
      ? playerData.state.shipIndex
      : (typeof playerData.customData?.shipIndex === 'number')
        ? playerData.customData.shipIndex
        : undefined;
    const themeKey = playerData.state?.themeKey || playerData.customData?.themeKey;

    if (shipIdx !== undefined) {
      player.setShip(shipIdx, themeKey);
    } else if (themeKey) {
      player.applyTheme(themeKey);
    }

    if (playerData.state) {
      if (playerData.state.health !== undefined || playerData.state.shield !== undefined) {
        player.setVitals(playerData.state.health, playerData.state.shield);
      }
      if (playerData.state.kills !== undefined) player.kills = playerData.state.kills;
      if (playerData.state.deaths !== undefined) player.deaths = playerData.state.deaths;
      if (playerData.state.score !== undefined) player.score = playerData.state.score;
      if (playerData.state.isDestroyed !== undefined) {
        player.setDestroyed(playerData.state.isDestroyed);
      }
    }
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.dispose();
      this.players.delete(playerId);
    }
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  handleTransform(playerId, data) {
    const player = this.players.get(playerId);
    if (player) {
      player.applyTransform(data);
    }
  }

  handlePlayerDamaged(playerId, shield, health) {
    const player = this.players.get(playerId);
    if (player) {
      player.setVitals(health, shield);
    }
  }

  handlePlayerKilled(victimId) {
    const player = this.players.get(victimId);
    if (player) {
      player.setDestroyed(true);
      this.spawnShipExplosion(player.root.position);
    }
  }

  handlePlayerRespawned(playerId, pos) {
    const player = this.players.get(playerId);
    if (player) {
      player.setDestroyed(false);
      player.setVitals(100, 100);
      if (pos) {
        player.root.position.fromArray(pos);
        player.targetPosition.fromArray(pos);
      }
      player.flashShield(3.0); // 3-second spawn invulnerability visual
    }
  }

  // --- Remote Lasers ---
  setupRemoteLaserPool(size = 64) {
    this.maxLasers = size;
    this.laserPool = [];
    this.activeLasers = [];

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

    this.laserMatCache = new Map();
    const commonColors = [
      '#ff3b30', '#ff2244', '#38bdf8', '#00e5ff', '#ffaa00',
      '#00ff88', '#c084fc', '#ffd700', '#f43f5e', '#67e8f9'
    ];
    for (const c of commonColors) {
      this.getLaserMaterial(c);
    }

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

  fireRemoteLasers(playerId, laserData) {
    const player = this.players.get(playerId);
    if (!laserData) return;

    const points = laserData.points || [{ position: { x: 0, y: 0, z: -1 }, color: '#38bdf8' }];
    const dir = new THREE.Vector3();
    if (laserData.dir) {
      dir.fromArray(laserData.dir);
    } else if (player) {
      const shipQuat = player.visualHolder.getWorldQuaternion(new THREE.Quaternion());
      dir.set(0, 0, -1).applyQuaternion(shipQuat);
    } else {
      dir.set(0, 0, -1);
    }

    const shipWorldMat = player ? player.visualHolder.matrixWorld : new THREE.Matrix4();

    for (const pt of points) {
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

      const localPos = new THREE.Vector3(pt.position?.x || 0, pt.position?.y || 0, pt.position?.z || -1);
      const worldPos = localPos.applyMatrix4(shipWorldMat);

      const colorHex = pt.color || '#ff3b30';
      p.outerMesh.material = this.getLaserMaterial(colorHex);

      p.group.position.copy(worldPos);
      p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
      p.dir.copy(dir);
      p.speed = laserData.speed || 160.0;
      p.life = 0.0;
      p.maxLife = 1.4;
      p.shooterId = playerId;
      p.active = true;
      p.group.visible = true;

      this.activeLasers.push(p);
    }
  }

  /**
   * Checks if local player's laser segment [oldPos, newPos] struck any remote player
   * @param {THREE.Vector3} oldPos
   * @param {THREE.Vector3} newPos
   * @returns {{ player: RemotePlayer, hitPoint: THREE.Vector3 } | null}
   */
  checkLaserHit(oldPos, newPos) {
    _seg.subVectors(newPos, oldPos);
    const segLenSq = _seg.lengthSq();
    if (segLenSq < 0.0001) return null;

    for (const player of this.players.values()) {
      if (player.isDestroyed || !player.root.visible) continue;

      const pPos = player.root.position;
      const r = player.radius;
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
          player,
          hitPoint: _closest.clone()
        };
      }
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

    for (const player of this.players.values()) {
      if (player.isDestroyed || !player.root.visible) continue;

      _camSpace.copy(player.root.position).applyMatrix4(camera.matrixWorldInverse);
      if (_camSpace.z >= -0.1) continue; // Behind camera

      _screenPos.copy(player.root.position).project(camera);
      const shipScreenDist = Math.hypot(_screenPos.x, _screenPos.y);

      // Predictive lead calculation (lasers travel at 160 m/s)
      const worldDist = player.root.position.distanceTo(camera.position);
      const tLead = worldDist / 160.0;
      _leadWorld.copy(player.root.position).addScaledVector(player.velocity, tLead);

      _leadScreenPos.copy(_leadWorld).project(camera);
      const leadScreenDist = Math.hypot(_leadScreenPos.x, _leadScreenPos.y);

      const effectiveScreenDist = Math.min(shipScreenDist, leadScreenDist);
      if (effectiveScreenDist <= maxScreenDist) {
        if (worldDist < minDistance) {
          minDistance = worldDist;
          const preferLead = leadScreenDist <= shipScreenDist && player.velocity.length() > 1.2;
          _bestLeadPoint.copy(_leadWorld);
          _bestAimPoint.copy(preferLead ? _leadWorld : player.root.position);
          _staticTargetResult.player = player;
          _staticTargetResult.screenX = preferLead ? _leadScreenPos.x : _screenPos.x;
          _staticTargetResult.screenY = preferLead ? _leadScreenPos.y : _screenPos.y;
          _staticTargetResult.worldDistance = worldDist;
          bestTarget = _staticTargetResult;
        }
      }
    }

    return bestTarget;
  }

  spawnShipExplosion(pos) {
    if (this.asteroidField) {
      this.asteroidField.spawnExplosionSparks(pos, 5.5, true);
      if (this.asteroidField.spawnShipWreckage) {
        this.asteroidField.spawnShipWreckage(pos, 3.2, 10);
      }
      this.asteroidField.spawnShockwave(pos, 6.0);
    }
    sounds.playExplosion(1.4);
  }

  update(dt, camera, localSpaceship = null) {
    const camPos = camera ? camera.position : null;

    // Update each remote player
    for (const player of this.players.values()) {
      player.update(dt, camPos);
    }

    // Update remote lasers & check collision against local player's spaceship
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
              const shooter = this.getPlayer(p.shooterId);
              const sourcePos = shooter ? shooter.root.position : p.group.position;
              localSpaceship.takeDamage(25, p.shooterId, _closest, sourcePos);
              continue;
            }
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
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    for (const l of this.activeLasers) {
      l.active = false;
      l.group.visible = false;
    }
    this.activeLasers = [];
  }
}
