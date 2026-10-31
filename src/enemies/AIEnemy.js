/**
 * AIEnemy.js
 * AI-driven enemy ship extending EnemyEntity with behavior-driven kinematics,
 * dynamic combat maneuvering, and optional laser cannon weapon firing.
 */

import * as THREE from 'three';
import { EnemyEntity } from './EnemyEntity.js';
import { createBehavior } from './EnemyBehaviors.js';

const _vToTarget = new THREE.Vector3();
const _shipFwd = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _shipWorldQuat = new THREE.Quaternion();
const _right = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _origin = new THREE.Vector3();

export class AIEnemy extends EnemyEntity {
  /**
   * @param {THREE.Scene} scene
   * @param {object} options
   */
  constructor(scene, options = {}) {
    super(scene, options);

    // Behavior attachment
    this.behavior = createBehavior(options.behavior || 'orbit', options.behaviorOptions || {});
    this.behavior.init(this);

    // Weapon system
    const wConfig = options.weapon || {};
    this.weapon = {
      enabled: wConfig.enabled ?? false,
      fireInterval: wConfig.fireInterval ?? 1.5,
      projectileSpeed: wConfig.projectileSpeed ?? 160.0,
      damage: wConfig.damage ?? 15,
      range: wConfig.range ?? 150.0,
      accuracy: wConfig.accuracy ?? 0.88,
      color: wConfig.color ?? '#ff3b30',
      cooldown: (wConfig.fireInterval ?? 1.5) * (0.5 + Math.random() * 0.8)
    };

    // Callback fired when this AI enemy shoots a laser
    this.onFireLaser = options.onFireLaser || null;
  }

  /**
   * Switches AI behavior dynamically at runtime
   * @param {string|import('./EnemyBehaviors.js').BaseBehavior} newBehavior
   * @param {object} [options]
   */
  setBehavior(newBehavior, options = {}) {
    if (this.behavior) {
      this.behavior.dispose();
    }
    this.behavior = createBehavior(newBehavior, options);
    this.behavior.init(this);
  }

  takeDamage(amount, attackerId = null, hitPoint = null) {
    const result = super.takeDamage(amount, attackerId, hitPoint);
    if (this.behavior && this.behavior.onDamaged) {
      this.behavior.onDamaged(this, amount, attackerId);
    }
    return result;
  }

  /**
   * Evaluates if enemy has clear line-of-sight and firing angle toward target
   * @param {THREE.Vector3} targetPos
   * @returns {boolean}
   */
  canFireAt(targetPos) {
    if (!this.weapon.enabled || this.weapon.cooldown > 0 || this.isDestroyed || !this.root.visible) {
      return false;
    }

    _vToTarget.subVectors(targetPos, this.root.position);
    const dist = _vToTarget.length();
    if (dist > this.weapon.range || dist < 4.0) {
      return false;
    }

    _vToTarget.normalize();
    this.visualHolder.getWorldQuaternion(_shipWorldQuat);
    _shipFwd.set(0, 0, -1).applyQuaternion(_shipWorldQuat);

    // Check if target is within a ~30-degree cone (cos(30 deg) ~= 0.866)
    const dot = _shipFwd.dot(_vToTarget);
    return dot >= 0.85;
  }

  /**
   * Fires laser projectile towards target position with accuracy jitter
   * @param {THREE.Vector3} targetPos
   */
  fireAt(targetPos) {
    if (!this.canFireAt(targetPos)) return;

    // Reset cooldown with a little jitter
    this.weapon.cooldown = this.weapon.fireInterval * (0.85 + Math.random() * 0.3);

    _vToTarget.subVectors(targetPos, this.root.position).normalize();

    // Inaccuracy spread
    const spread = (1.0 - this.weapon.accuracy) * 0.15;
    _shotDir.set(
      _vToTarget.x + (Math.random() - 0.5) * spread,
      _vToTarget.y + (Math.random() - 0.5) * spread,
      _vToTarget.z + (Math.random() - 0.5) * spread
    ).normalize();

    // Hardpoint offsets (twin cannons on ship wings)
    this.visualHolder.getWorldQuaternion(_shipWorldQuat);
    _right.set(1, 0, 0).applyQuaternion(_shipWorldQuat);
    _forward.set(0, 0, -1).applyQuaternion(_shipWorldQuat);

    const gunOffset = 1.1;
    const side = Math.random() > 0.5 ? 1 : -1;
    _origin.copy(this.root.position)
      .addScaledVector(_right, side * gunOffset)
      .addScaledVector(_forward, 1.8);

    const shotData = {
      shooterId: this.id,
      shooterName: this.name,
      origin: [_origin.x, _origin.y, _origin.z],
      dir: [_shotDir.x, _shotDir.y, _shotDir.z],
      speed: this.weapon.projectileSpeed,
      damage: this.weapon.damage,
      color: this.weapon.color
    };

    if (this.onFireLaser) {
      this.onFireLaser(shotData);
    }
  }

  /**
   * @param {number} dt
   * @param {object} context - { playerPosition, playerVelocity, camera }
   */
  update(dt, context = {}) {
    if (this.isDestroyed || !this.root.visible) return;

    // Execute behavior steering
    if (this.behavior) {
      this.behavior.update(dt, this, context);
    }

    // Weapon simulation
    if (this.weapon.enabled) {
      if (this.weapon.cooldown > 0) {
        this.weapon.cooldown -= dt;
      }

      if (context.playerPosition && this.canFireAt(context.playerPosition)) {
        this.fireAt(context.playerPosition);
      }
    }

    // Base visuals, banking, thruster sparks, and shield dome update
    super.update(dt, context.camera ? context.camera.position : null);
  }

  dispose() {
    if (this.behavior) {
      this.behavior.dispose();
      this.behavior = null;
    }
    super.dispose();
  }
}
