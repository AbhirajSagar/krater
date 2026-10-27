/**
 * EnemyFactory.js
 * Centralized registry and factory for enemy vessel archetypes.
 * Supports registering custom blueprints and instantiating both AI-driven
 * entities (singleplayer/host) and remote network replicas (client multiplayer).
 */

import { EnemyEntity } from './EnemyEntity.js';
import { AIEnemy } from './AIEnemy.js';

export const BUILTIN_ARCHETYPES = {
  drone: {
    archetype: 'drone',
    name: 'ROGUE DRONE',
    shipIndex: 1,
    themeKey: 'Red',
    health: 60,
    shield: 40,
    radius: 3.2,
    scoreValue: 100,
    behavior: 'orbit',
    behaviorOptions: { radius: 75, speed: 0.25, wobbleAmp: 14, wobbleFreq: 0.45 },
    weapon: { enabled: false }
  },
  scout: {
    archetype: 'scout',
    name: 'RECON SCOUT',
    shipIndex: 0,
    themeKey: 'Yellow',
    health: 50,
    shield: 30,
    radius: 2.8,
    scoreValue: 150,
    behavior: 'drift',
    behaviorOptions: { driftSpeed: 32, jitterInterval: 2.5, maxRoamRadius: 180 },
    weapon: { enabled: false }
  },
  fighter: {
    archetype: 'fighter',
    name: 'PIRATE FIGHTER',
    shipIndex: 2,
    themeKey: 'Orange',
    health: 80,
    shield: 60,
    radius: 3.6,
    scoreValue: 250,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 40, combatDistance: 45, attackSpeed: 48, breakawayDistance: 16 },
    weapon: { enabled: true, fireInterval: 1.6, damage: 15, range: 140, color: '#ff6600' }
  },
  interceptor: {
    archetype: 'interceptor',
    name: 'VOID INTERCEPTOR',
    shipIndex: 3,
    themeKey: 'Cyan',
    health: 70,
    shield: 50,
    radius: 3.4,
    scoreValue: 300,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 52, combatDistance: 35, breakawayDistance: 16, attackSpeed: 58 },
    weapon: { enabled: true, fireInterval: 1.1, damage: 18, range: 160, color: '#00e5ff' }
  },
  bomber: {
    archetype: 'bomber',
    name: 'HEAVY BOMBER',
    shipIndex: 4,
    themeKey: 'Purple',
    health: 160,
    shield: 120,
    radius: 4.6,
    scoreValue: 500,
    behavior: 'patrol',
    behaviorOptions: { speed: 20 },
    weapon: { enabled: true, fireInterval: 2.8, damage: 35, range: 180, color: '#b026ff' }
  },
  sentinel: {
    archetype: 'sentinel',
    name: 'DEFENSE SENTINEL',
    shipIndex: 5,
    themeKey: 'Green',
    health: 130,
    shield: 90,
    radius: 4.0,
    scoreValue: 350,
    behavior: 'stationary',
    behaviorOptions: { faceTarget: true, turnSpeed: 2.5 },
    weapon: { enabled: true, fireInterval: 1.8, damage: 20, range: 200, color: '#39ff14' }
  }
};

export class EnemyFactory {
  constructor() {
    this.archetypes = new Map();
    // Preload defaults
    for (const [key, def] of Object.entries(BUILTIN_ARCHETYPES)) {
      this.archetypes.set(key.toLowerCase(), { ...def });
    }
  }

  /**
   * Register a new enemy archetype or override an existing one
   * @param {string} id
   * @param {object} definition
   */
  registerArchetype(id, definition) {
    const key = id.toLowerCase();
    this.archetypes.set(key, {
      archetype: key,
      ...definition
    });
  }

  /**
   * Get an archetype configuration by ID
   * @param {string} id
   * @returns {object|null}
   */
  getArchetype(id) {
    return this.archetypes.get(id.toLowerCase()) || null;
  }

  hasArchetype(id) {
    return this.archetypes.has(id.toLowerCase());
  }

  listArchetypes() {
    return Array.from(this.archetypes.keys());
  }

  /**
   * Instantiates an enemy vessel based on an archetype or custom config
   * @param {THREE.Scene} scene
   * @param {string|object} archetypeOrConfig
   * @param {object} [overrides]
   * @returns {AIEnemy|EnemyEntity}
   */
  createEnemy(scene, archetypeOrConfig, overrides = {}) {
    let baseConfig = {};

    if (typeof archetypeOrConfig === 'string') {
      const found = this.getArchetype(archetypeOrConfig);
      if (found) {
        baseConfig = JSON.parse(JSON.stringify(found));
      } else {
        console.warn(`[EnemyFactory] Unknown archetype '${archetypeOrConfig}', falling back to drone.`);
        baseConfig = JSON.parse(JSON.stringify(BUILTIN_ARCHETYPES.drone));
      }
    } else if (typeof archetypeOrConfig === 'object') {
      if (archetypeOrConfig.archetype && this.hasArchetype(archetypeOrConfig.archetype)) {
        baseConfig = JSON.parse(JSON.stringify(this.getArchetype(archetypeOrConfig.archetype)));
      }
      baseConfig = { ...baseConfig, ...archetypeOrConfig };
    }

    // Merge overrides
    const finalOptions = {
      ...baseConfig,
      ...overrides,
      behaviorOptions: {
        ...(baseConfig.behaviorOptions || {}),
        ...(overrides.behaviorOptions || {})
      },
      weapon: {
        ...(baseConfig.weapon || {}),
        ...(overrides.weapon || {})
      },
      userData: {
        ...(baseConfig.userData || {}),
        ...(overrides.userData || {})
      }
    };

    // If requested as pure remote replica (multiplayer client) or AI explicitly disabled
    if (finalOptions.isRemote === true || finalOptions.ai === false) {
      return new EnemyEntity(scene, finalOptions);
    }

    // Default: Autonomous AI enemy
    return new AIEnemy(scene, finalOptions);
  }
}

export const enemyFactory = new EnemyFactory();
