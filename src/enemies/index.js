/**
 * src/enemies/index.js
 * Public API for the modular enemy creation and spawning system.
 */

export { EnemyEntity } from './EnemyEntity.js';
export { AIEnemy } from './AIEnemy.js';
export {
  BaseBehavior,
  StationaryBehavior,
  OrbitBehavior,
  PatrolBehavior,
  ChaseBehavior,
  DriftBehavior,
  CustomBehavior,
  BEHAVIOR_REGISTRY,
  registerBehavior,
  createBehavior
} from './EnemyBehaviors.js';
export { EnemyFactory, enemyFactory, BUILTIN_ARCHETYPES } from './EnemyFactory.js';
export { EnemySpawner } from './EnemySpawner.js';
export { EnemyManager } from './EnemyManager.js';
