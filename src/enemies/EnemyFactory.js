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
    behaviorOptions: { radius: 55, speed: 0.36, wobbleAmp: 5, wobbleFreq: 0.3, anchor: 'player' },
    weapon: { enabled: true, fireInterval: 1.3, burstCount: 1, damage: 10, range: 140, accuracy: 0.85, color: '#ff3344' }
  },
  scout: {
    archetype: 'scout',
    name: 'RECON SCOUT',
    shipIndex: 0,
    themeKey: 'Yellow',
    health: 55,
    shield: 35,
    radius: 2.8,
    scoreValue: 150,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 46, attackSpeed: 52, turnSpeed: 1.8, combatDistance: 42, breakawayDistance: 20 },
    weapon: { enabled: true, fireInterval: 1.1, burstCount: 2, burstInterval: 0.12, damage: 12, range: 155, accuracy: 0.88, color: '#ffcc00' }
  },
  fighter: {
    archetype: 'fighter',
    name: 'PIRATE FIGHTER',
    shipIndex: 2,
    themeKey: 'Orange',
    health: 85,
    shield: 65,
    radius: 3.6,
    scoreValue: 250,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 42, attackSpeed: 50, turnSpeed: 1.5, combatDistance: 40, breakawayDistance: 20 },
    weapon: { enabled: true, fireInterval: 1.4, burstCount: 2, burstInterval: 0.14, damage: 16, range: 165, accuracy: 0.90, color: '#ff6600' }
  },
  interceptor: {
    archetype: 'interceptor',
    name: 'VOID INTERCEPTOR',
    shipIndex: 3,
    themeKey: 'Cyan',
    health: 75,
    shield: 55,
    radius: 3.4,
    scoreValue: 300,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 50, attackSpeed: 58, turnSpeed: 1.7, combatDistance: 36, breakawayDistance: 18 },
    weapon: { enabled: true, fireInterval: 0.95, burstCount: 3, burstInterval: 0.10, damage: 14, range: 175, accuracy: 0.92, color: '#00e5ff' }
  },
  bomber: {
    archetype: 'bomber',
    name: 'HEAVY BOMBER',
    shipIndex: 4,
    themeKey: 'Purple',
    health: 180,
    shield: 130,
    radius: 4.6,
    scoreValue: 500,
    behavior: 'chase',
    behaviorOptions: { maxSpeed: 28, attackSpeed: 34, turnSpeed: 1.1, combatDistance: 50, breakawayDistance: 24 },
    weapon: { enabled: true, fireInterval: 2.2, burstCount: 1, damage: 35, range: 190, accuracy: 0.86, color: '#b026ff' }
  },
  sentinel: {
    archetype: 'sentinel',
    name: 'DEFENSE SENTINEL',
    shipIndex: 5,
    themeKey: 'Green',
    health: 140,
    shield: 100,
    radius: 4.0,
    scoreValue: 350,
    behavior: 'stationary',
    behaviorOptions: { faceTarget: true, turnSpeed: 2.2 },
    weapon: { enabled: true, fireInterval: 1.6, burstCount: 2, burstInterval: 0.15, damage: 20, range: 210, accuracy: 0.92, color: '#39ff14' }
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
