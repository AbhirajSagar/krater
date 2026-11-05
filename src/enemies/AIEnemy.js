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
const _aimPoint = new THREE.Vector3();

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
      fireInterval: wConfig.fireInterval ?? 1.4,
      burstCount: wConfig.burstCount ?? 1,
      burstInterval: wConfig.burstInterval ?? 0.12,
      projectileSpeed: wConfig.projectileSpeed ?? 160.0,
      damage: wConfig.damage ?? 15,
      range: wConfig.range ?? 160.0,
      accuracy: wConfig.accuracy ?? 0.88,
      aimCone: wConfig.aimCone ?? 0.82,
      color: wConfig.color ?? '#ff3b30',
      cooldown: (wConfig.fireInterval ?? 1.4) * (0.5 + Math.random() * 0.8),
      burstRemaining: 0,
      burstTimer: 0,
      hardpointIndex: 0
    };

    // Callback fired when this AI enemy shoots a laser
    this.onFireLaser = options.onFireLaser || null;

    // Evasive duck & jink maneuver state
    this.isDucking = false;
    this.duckTimer = 0;
    this.duckDuration = 0;
    this.duckOffset = new THREE.Vector3();
    this.duckTargetOffset = new THREE.Vector3();
    this.duckBank = 0;
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

  /**
   * Applies a brief, tactile micro-nudge on taking laser damage.
   * Gives instant physical impact feedback without ducking or diving out of sight.
   */
  triggerDuck(hitPoint = null) {
    this.isDucking = true;
    this.duckDuration = 0.22; // Brief micro-nudge (~220ms)
    this.duckTimer = this.duckDuration;

    // Subtle nudge displacement away from hit point or along ship's local axes
    const breakSide = Math.random() > 0.5 ? 1 : -1;
    this.visualHolder.getWorldQuaternion(_shipWorldQuat);
    _right.set(1, 0, 0).applyQuaternion(_shipWorldQuat);
    _shipFwd.set(0, 0, -1).applyQuaternion(_shipWorldQuat);
    const upLocal = new THREE.Vector3(0, 1, 0).applyQuaternion(_shipWorldQuat);

    // Gentle micro-nudge (~0.6 - 1.0m flinch), no huge altitude plunge
    const diveDepth = -(0.4 + Math.random() * 0.4);
    const lateralShift = breakSide * (0.5 + Math.random() * 0.4);
    const forwardSurge = -(0.3 + Math.random() * 0.3); // Slight pushback from laser impact

    this.duckTargetOffset.set(0, 0, 0)
      .addScaledVector(upLocal, diveDepth)
      .addScaledVector(_right, lateralShift)
      .addScaledVector(_shipFwd, forwardSurge);

    // Very subtle flinch bank (~5°), not an aggressive high-G roll
    this.duckBank = breakSide * 0.08;
  }

  takeDamage(amount, attackerId = null, hitPoint = null) {
    const result = super.takeDamage(amount, attackerId, hitPoint);

    // Trigger immediate evasive duck reaction
    this.triggerDuck(hitPoint);

    if (this.behavior && this.behavior.onDamaged) {
      this.behavior.onDamaged(this, amount, attackerId, hitPoint);
    }
    return result;
  }

  /**
   * Evaluates if enemy has clear line-of-sight and firing angle toward target
   * using predictive lead calculation for moving targets.
   * @param {THREE.Vector3} targetPos
   * @param {THREE.Vector3} [targetVel]
   * @returns {boolean}
   */
  canFireAt(targetPos, targetVel = null) {
    if (!this.weapon.enabled || this.isDestroyed || !this.root.visible) {
      return false;
    }
    if (this.weapon.cooldown > 0 && this.weapon.burstRemaining <= 0) {
      return false;
    }

    _vToTarget.subVectors(targetPos, this.root.position);
    const dist = _vToTarget.length();
    if (dist > this.weapon.range || dist < 4.0) {
      return false;
    }

    // Predictive lead calculation (lasers travel at projectileSpeed)
    const tLead = dist / this.weapon.projectileSpeed;
    _aimPoint.copy(targetPos);
    if (targetVel) {
      _aimPoint.addScaledVector(targetVel, tLead);
    }

    _vToTarget.subVectors(_aimPoint, this.root.position).normalize();
    this.visualHolder.getWorldQuaternion(_shipWorldQuat);
    _shipFwd.set(0, 0, -1).applyQuaternion(_shipWorldQuat);

    // Check if target lead point is within firing cone
    const dot = _shipFwd.dot(_vToTarget);
    return dot >= this.weapon.aimCone;
  }

  /**
   * Fires laser projectile towards target position with lead prediction and accuracy jitter
   * @param {THREE.Vector3} targetPos
   * @param {THREE.Vector3} [targetVel]
   */
  fireAt(targetPos, targetVel = null) {
    // Predictive lead calculation
    const dist = this.root.position.distanceTo(targetPos);
    const tLead = dist / this.weapon.projectileSpeed;
    _aimPoint.copy(targetPos);
    if (targetVel) {
      _aimPoint.addScaledVector(targetVel, tLead);
    }

    _vToTarget.subVectors(_aimPoint, this.root.position).normalize();

    // Inaccuracy spread
    const spread = (1.0 - this.weapon.accuracy) * 0.12;
    _shotDir.set(
      _vToTarget.x + (Math.random() - 0.5) * spread,
      _vToTarget.y + (Math.random() - 0.5) * spread,
      _vToTarget.z + (Math.random() - 0.5) * spread
    ).normalize();

    // Alternating twin cannons on ship wings
    this.weapon.hardpointIndex = 1 - this.weapon.hardpointIndex;
    const side = this.weapon.hardpointIndex === 1 ? 1 : -1;

    this.visualHolder.getWorldQuaternion(_shipWorldQuat);
    _right.set(1, 0, 0).applyQuaternion(_shipWorldQuat);
    _forward.set(0, 0, -1).applyQuaternion(_shipWorldQuat);

    const gunOffset = 1.15;
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

    // Dynamic impact micro-nudge kinematics
    if (this.isDucking) {
      this.duckTimer -= dt;
      if (this.duckTimer <= 0) {
        this.isDucking = false;
        this.duckTargetOffset.set(0, 0, 0);
        this.duckBank = 0;
      }

      // Snappy spring recovery for the nudge
      const duckBlend = 1 - Math.exp(-14 * dt);
      this.duckOffset.lerp(this.duckTargetOffset, duckBlend);
      this.targetPosition.addScaledVector(this.duckOffset, dt * 1.4);
      this.targetBank = THREE.MathUtils.lerp(this.targetBank, this.duckBank, 1 - Math.exp(-14 * dt));
    }

    // Weapon simulation with burst fire and lead tracking
    if (this.weapon.enabled) {
      if (this.weapon.cooldown > 0) {
        this.weapon.cooldown -= dt;
      }
      if (this.weapon.burstTimer > 0) {
        this.weapon.burstTimer -= dt;
      }

      const pPos = context.playerPosition;
      const pVel = context.playerVelocity;

      if (this.weapon.burstRemaining > 0 && this.weapon.burstTimer <= 0) {
        if (pPos) {
          this.fireAt(pPos, pVel);
          this.weapon.burstRemaining--;
          this.weapon.burstTimer = this.weapon.burstInterval;
          if (this.weapon.burstRemaining <= 0) {
            this.weapon.cooldown = this.weapon.fireInterval * (0.85 + Math.random() * 0.3);
          }
        } else {
          this.weapon.burstRemaining = 0;
        }
      } else if (this.weapon.cooldown <= 0 && this.weapon.burstRemaining <= 0) {
        if (pPos && this.canFireAt(pPos, pVel)) {
          this.fireAt(pPos, pVel);
          this.weapon.burstRemaining = Math.max(0, (this.weapon.burstCount || 1) - 1);
          this.weapon.burstTimer = this.weapon.burstInterval;
          if (this.weapon.burstRemaining <= 0) {
            this.weapon.cooldown = this.weapon.fireInterval * (0.85 + Math.random() * 0.3);
          }
        }
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
