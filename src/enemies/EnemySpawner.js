/**
 * EnemySpawner.js
 * Modular, mode-agnostic enemy spawning and wave management system.
 * Handles spatial geometric spawning patterns (coordinates, ring, sphere, relative near-target),
 * wave sequencing, auto-replenish spawning, and network synchronization hooks for multiplayer.
 */

import * as THREE from 'three';
import { enemyFactory } from './EnemyFactory.js';

let _spawnId = 1;

export class EnemySpawner {
  /**
   * @param {import('./EnemyManager.js').EnemyManager} enemyManager
   * @param {object} options
   */
  constructor(enemyManager, options = {}) {
    this.enemyManager = enemyManager;
    this.scene = enemyManager.scene;
    this.mode = options.mode || 'singleplayer'; // 'singleplayer' | 'multiplayer'
    this.isHost = options.isHost ?? true;

    // Network relay callback: (type, payload) => void
    this.networkRelay = options.networkRelay || null;

    // Auto-spawner state
    this.autoSpawnConfig = null;
    this.autoSpawnTimer = 0;

    // Wave state
    this.currentWave = null;
    this.activeWaveEnemyIds = new Set();

    // Respawn queue: Array<{ enemyId, archetype, respawnTime, options }>
    this.respawnQueue = [];

    // Listen to enemy destruction from EnemyManager
    this.enemyManager.on('enemyKilled', (data) => {
      this.handleEnemyKilled(data);
    });
  }

  setMode(mode, isHost = true) {
    this.mode = mode;
    this.isHost = isHost;
  }

  setNetworkRelay(relayFn) {
    this.networkRelay = relayFn;
  }

  /**
   * Spawns a single enemy at explicit coordinates
   * @param {string|object} archetype
   * @param {THREE.Vector3|number[]} position
   * @param {object} [options]
   * @returns {import('./EnemyEntity.js').EnemyEntity}
   */
  spawnAt(archetype, position, options = {}) {
    const id = options.id || `enemy_${Date.now()}_${_spawnId++}`;
    const pos = position?.isVector3 ? position.clone() : new THREE.Vector3(...(position || [0, 0, 0]));

    const enemy = enemyFactory.createEnemy(this.scene, archetype, {
      ...options,
      id,
      position: pos
    });

    this.enemyManager.addEnemy(enemy);

    // If multiplayer host, notify network peers
    if (this.mode === 'multiplayer' && this.isHost && this.networkRelay) {
      this.networkRelay('SPAWN_ENEMY', {
        id: enemy.id,
        archetype: enemy.archetype,
        name: enemy.name,
        shipIndex: enemy.shipIndex,
        themeKey: enemy.themeKey,
        pos: [pos.x, pos.y, pos.z],
        health: enemy.health,
        shield: enemy.shield
      });
    }

    return enemy;
  }

  /**
   * Spawns multiple enemies in a circular ring formation
   * @param {string} archetype
   * @param {number} count
   * @param {THREE.Vector3|number[]} center
   * @param {number} radius
   * @param {object} [options]
   * @returns {import('./EnemyEntity.js').EnemyEntity[]}
   */
  spawnRing(archetype, count = 3, center = [0, 0, 0], radius = 75, options = {}) {
    const c = center?.isVector3 ? center : new THREE.Vector3(...center);
    const spawned = [];
    const step = (Math.PI * 2) / Math.max(1, count);

    for (let i = 0; i < count; i++) {
      const angle = step * i;
      const x = c.x + Math.cos(angle) * radius;
      const y = c.y + (options.wobble ? Math.sin(angle * 2) * 8 : 0);
      const z = c.z + Math.sin(angle) * radius;

      const enemy = this.spawnAt(archetype, [x, y, z], {
        ...options,
        behaviorOptions: {
          radius,
          initialAngle: angle,
          anchor: c,
          ...(options.behaviorOptions || {})
        }
      });
      spawned.push(enemy);
    }

    return spawned;
  }

  /**
   * Spawns enemies scattered inside a spherical volume
   * @param {string} archetype
   * @param {number} count
   * @param {THREE.Vector3|number[]} center
   * @param {number} radius
   * @param {object} [options]
   * @returns {import('./EnemyEntity.js').EnemyEntity[]}
   */
  spawnSphere(archetype, count = 3, center = [0, 0, 0], radius = 80, options = {}) {
    const c = center?.isVector3 ? center : new THREE.Vector3(...center);
    const spawned = [];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * radius;

      const sinPhi = Math.sin(phi);
      const x = c.x + r * sinPhi * Math.cos(theta);
      const y = c.y + r * sinPhi * Math.sin(theta);
      const z = c.z + r * Math.cos(phi);

      const enemy = this.spawnAt(archetype, [x, y, z], options);
      spawned.push(enemy);
    }

    return spawned;
  }

  /**
   * Spawns an enemy relative to a target (e.g. player position)
   * @param {string} archetype
   * @param {THREE.Vector3} targetPos
   * @param {number} minDist
   * @param {number} maxDist
   * @param {object} [options]
   * @returns {import('./EnemyEntity.js').EnemyEntity}
   */
  spawnNear(archetype, targetPos, minDist = 65, maxDist = 110, options = {}) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const height = (Math.random() - 0.5) * 30;

    const tX = targetPos ? targetPos.x : 0;
    const tY = targetPos ? targetPos.y : 0;
    const tZ = targetPos ? targetPos.z : 0;

    const x = tX + Math.cos(angle) * dist;
    const y = tY + height;
    const z = tZ + Math.sin(angle) * dist;

    return this.spawnAt(archetype, [x, y, z], options);
  }

  /**
   * Spawns a structured tactical wave
   * @param {object} waveConfig
   * @param {string} waveConfig.id
   * @param {string} [waveConfig.name]
   * @param {Array<{ archetype: string, count: number, layout?: string, radius?: number, options?: object }>} waveConfig.entries
   * @param {THREE.Vector3} [centerPos]
   */
  spawnWave(waveConfig, centerPos = null) {
    this.currentWave = waveConfig;
    this.activeWaveEnemyIds.clear();

    const center = centerPos || new THREE.Vector3(0, 0, 0);

    for (const entry of waveConfig.entries || []) {
      const archetype = entry.archetype || 'drone';
      const count = entry.count || 1;
      const layout = entry.layout || 'ring';
      const radius = entry.radius || 75;

      let created = [];
      if (layout === 'ring') {
        created = this.spawnRing(archetype, count, center, radius, entry.options);
      } else if (layout === 'sphere') {
        created = this.spawnSphere(archetype, count, center, radius, entry.options);
      } else if (layout === 'near') {
        for (let i = 0; i < count; i++) {
          created.push(this.spawnNear(archetype, center, entry.minDist || 60, entry.maxDist || 110, entry.options));
        }
      } else {
        for (let i = 0; i < count; i++) {
          created.push(this.spawnAt(archetype, center, entry.options));
        }
      }

      for (const e of created) {
        this.activeWaveEnemyIds.add(e.id);
      }
    }

    if (this.mode === 'multiplayer' && this.isHost && this.networkRelay) {
      this.networkRelay('WAVE_STARTED', {
        waveId: waveConfig.id,
        waveName: waveConfig.name,
        enemyCount: this.activeWaveEnemyIds.size
      });
    }

    return this.activeWaveEnemyIds.size;
  }

  /**
   * Enables continuous dynamic replenishment of enemies
   * @param {object} config
   * @param {number} [config.maxEnemies]
   * @param {number} [config.interval]
   * @param {string[]} [config.archetypes]
   * @param {number} [config.minDist]
   * @param {number} [config.maxDist]
   */
  startAutoSpawn(config = {}) {
    this.autoSpawnConfig = {
      maxEnemies: config.maxEnemies ?? 4,
      interval: config.interval ?? 4.0,
      archetypes: config.archetypes ?? ['drone', 'scout', 'fighter'],
      minDist: config.minDist ?? 65,
      maxDist: config.maxDist ?? 120,
      autoRespawn: config.autoRespawn ?? true,
      respawnDelay: config.respawnDelay ?? 3.5
    };
    this.autoSpawnTimer = 0;
  }

  stopAutoSpawn() {
    this.autoSpawnConfig = null;
  }

  /**
   * Handles enemy death event from EnemyManager
   */
  handleEnemyKilled({ enemy, killerId }) {
    if (this.activeWaveEnemyIds.has(enemy.id)) {
      this.activeWaveEnemyIds.delete(enemy.id);
      if (this.activeWaveEnemyIds.size === 0 && this.currentWave) {
        const completedWave = this.currentWave;
        this.currentWave = null;
        this.enemyManager.emit('waveCompleted', { wave: completedWave });

        if (this.mode === 'multiplayer' && this.isHost && this.networkRelay) {
          this.networkRelay('WAVE_COMPLETED', { waveId: completedWave.id });
        }
      }
    }

    // Auto-respawn check
    if (this.autoSpawnConfig?.autoRespawn && (this.mode === 'singleplayer' || this.isHost)) {
      this.respawnQueue.push({
        archetype: enemy.archetype || 'drone',
        respawnTime: performance.now() + (this.autoSpawnConfig.respawnDelay * 1000),
        options: {
          name: enemy.name,
          shipIndex: enemy.shipIndex,
          themeKey: enemy.themeKey
        }
      });
    }
  }

  /**
   * Client-side multiplayer handler: spawns a remote enemy replica broadcast by host
   */
  handleNetworkSpawn(packet) {
    if (this.enemyManager.hasEnemy(packet.id)) {
      return this.enemyManager.getEnemy(packet.id);
    }

    const enemy = enemyFactory.createEnemy(this.scene, packet.archetype || 'drone', {
      id: packet.id,
      name: packet.name,
      shipIndex: packet.shipIndex,
      themeKey: packet.themeKey,
      position: packet.pos,
      health: packet.health,
      shield: packet.shield,
      isRemote: true, // Non-host clients receive transform updates
      ai: false
    });

    this.enemyManager.addEnemy(enemy);
    return enemy;
  }

  /**
   * Updates auto-spawner and respawn timers
   * @param {number} dt
   * @param {object} context
   */
  update(dt, context = {}) {
    if (this.mode === 'multiplayer' && !this.isHost) {
      return; // Remote client does not run autonomous spawner logic
    }

    const now = performance.now();

    // Process Respawn Queue
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const item = this.respawnQueue[i];
      if (now >= item.respawnTime) {
        this.respawnQueue.splice(i, 1);
        const playerPos = context.playerPosition || new THREE.Vector3(0, 0, 0);
        this.spawnNear(
          item.archetype,
          playerPos,
          this.autoSpawnConfig?.minDist || 70,
          this.autoSpawnConfig?.maxDist || 110,
          item.options
        );
      }
    }

    // Process Auto-spawner
    if (this.autoSpawnConfig) {
      this.autoSpawnTimer += dt;
      if (this.autoSpawnTimer >= this.autoSpawnConfig.interval) {
        this.autoSpawnTimer = 0;
        const currentCount = this.enemyManager.getActiveCount();
        if (currentCount < this.autoSpawnConfig.maxEnemies) {
          const list = this.autoSpawnConfig.archetypes;
          const archetype = list[Math.floor(Math.random() * list.length)];
          const playerPos = context.playerPosition || new THREE.Vector3(0, 0, 0);
          this.spawnNear(
            archetype,
            playerPos,
            this.autoSpawnConfig.minDist,
            this.autoSpawnConfig.maxDist
          );
        }
      }
    }
  }

  dispose() {
    this.stopAutoSpawn();
    this.respawnQueue = [];
    this.activeWaveEnemyIds.clear();
  }
}
