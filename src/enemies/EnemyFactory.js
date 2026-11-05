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
    health: 120,
    shield: 80,
    radius: 3.2,
    scoreValue: 100,
    behavior: 'orbit',
    behaviorOptions: { radius: 50, speed: 0.28, wobbleAmp: 4, wobbleFreq: 0.25, anchor: 'player' },
    weapon: { enabled: true, fireInterval: 2.2, burstCount: 1, damage: 5, range: 130, accuracy: 0.60, color: '#ff3344' }
  },
  scout: {
    archetype: 'scout',
    name: 'RECON SCOUT',
    shipIndex: 0,
    themeKey: 'Yellow',
    health: 140,
    shield: 100,
    radius: 3.0,
    scoreValue: 150,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 30, attackSpeed: 38, turnSpeed: 1.1, combatDistance: 45, breakawayDistance: 22 },
    weapon: { enabled: true, fireInterval: 1.8, burstCount: 2, burstInterval: 0.16, damage: 6, range: 140, accuracy: 0.65, color: '#ffcc00' }
  },
  fighter: {
    archetype: 'fighter',
    name: 'PIRATE FIGHTER',
    shipIndex: 2,
    themeKey: 'Orange',
    health: 240,
    shield: 160,
    radius: 3.8,
    scoreValue: 250,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 27, attackSpeed: 34, turnSpeed: 1.0, combatDistance: 42, breakawayDistance: 22 },
    weapon: { enabled: true, fireInterval: 2.0, burstCount: 2, burstInterval: 0.16, damage: 7, range: 150, accuracy: 0.68, color: '#ff6600' }
  },
  interceptor: {
    archetype: 'interceptor',
    name: 'VOID INTERCEPTOR',
    shipIndex: 3,
    themeKey: 'Cyan',
    health: 180,
    shield: 120,
    radius: 3.5,
    scoreValue: 300,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 33, attackSpeed: 40, turnSpeed: 1.2, combatDistance: 38, breakawayDistance: 20 },
    weapon: { enabled: true, fireInterval: 1.6, burstCount: 2, burstInterval: 0.14, damage: 6, range: 155, accuracy: 0.70, color: '#00e5ff' }
  },
  bomber: {
    archetype: 'bomber',
    name: 'HEAVY BOMBER',
    shipIndex: 4,
    themeKey: 'Purple',
    health: 450,
    shield: 250,
    radius: 4.8,
    scoreValue: 500,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 20, attackSpeed: 25, turnSpeed: 0.7, combatDistance: 65, breakawayDistance: 32 },
    weapon: { enabled: true, fireInterval: 2.8, burstCount: 1, damage: 16, range: 170, accuracy: 0.62, color: '#b026ff' }
  },
  sentinel: {
    archetype: 'sentinel',
    name: 'DEFENSE SENTINEL',
    shipIndex: 5,
    themeKey: 'Green',
    health: 320,
    shield: 200,
    radius: 4.2,
    scoreValue: 350,
    behavior: 'stationary',
    behaviorOptions: { faceTarget: true, turnSpeed: 1.4 },
    weapon: { enabled: true, fireInterval: 2.2, burstCount: 2, burstInterval: 0.18, damage: 9, range: 180, accuracy: 0.70, color: '#39ff14' }
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
