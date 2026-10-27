/**
 * EnemyBehaviors.js
 * Pluggable steering and AI decision behaviors for spacecraft entities.
 * Fully decoupled from specific game rules, allowing any enemy archetype
 * to use any steering behavior (or combination) in singleplayer or host-driven multiplayer.
 */

import * as THREE from 'three';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _vTarget = new THREE.Vector3();
const _fwd = new THREE.Vector3(0, 0, -1);
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

/**
 * Base Behavior interface
 */
export class BaseBehavior {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Called once when attached to an enemy
   * @param {import('./EnemyEntity.js').EnemyEntity} enemy
   */
  init(enemy) {}

  /**
   * Called every frame
   * @param {number} dt
   * @param {import('./EnemyEntity.js').EnemyEntity} enemy
   * @param {object} context - { playerPosition, playerVelocity, camera }
   */
  update(dt, enemy, context) {}

  /**
   * Called when enemy receives damage
   */
  onDamaged(enemy, amount, attackerId) {}

  dispose() {}
}

/**
 * Stationary / Turret Behavior:
 * Remains anchored at spawn position, optionally rotating to track targets.
 */
export class StationaryBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.faceTarget = options.faceTarget ?? true;
    this.turnSpeed = options.turnSpeed ?? 2.5;
    this.anchorPosition = null;
  }

  init(enemy) {
    this.anchorPosition = enemy.root.position.clone();
  }

  update(dt, enemy, context) {
    if (!this.anchorPosition) {
      this.anchorPosition = enemy.root.position.clone();
    }
    enemy.targetPosition.copy(this.anchorPosition);
    enemy.velocity.set(0, 0, 0);
    enemy.targetSpeed = 0;
    enemy.targetBank = 0;

    if (this.faceTarget && context.playerPosition) {
      _vTarget.copy(context.playerPosition).sub(enemy.root.position);
      if (_vTarget.lengthSq() > 0.1) {
        _vTarget.normalize();
        _quat.setFromUnitVectors(_fwd, _vTarget);
        enemy.targetQuaternion.slerp(_quat, 1 - Math.exp(-this.turnSpeed * dt));
      }
    }
  }
}

/**
 * Orbit Behavior:
 * Smooth circular/elliptical orbital trajectory around a point or player.
 */
export class OrbitBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.radius = options.radius ?? 75;
    this.height = options.height ?? 0;
    this.speed = options.speed ?? 0.25; // rad/s
    this.wobbleFreq = options.wobbleFreq ?? 0.45;
    this.wobbleAmp = options.wobbleAmp ?? 14;
    this.clockwise = options.clockwise ?? true;
    this.anchor = options.anchor ?? new THREE.Vector3(0, 0, 0);
    this.angle = options.initialAngle ?? (Math.random() * Math.PI * 2);
    this.time = Math.random() * 10;
  }

  init(enemy) {
    const pos = enemy.root.position;
    this.angle = Math.atan2(pos.z, pos.x);
    this.height = pos.y;
  }

  update(dt, enemy, context) {
    this.time += dt;
    const dirSign = this.clockwise ? -1 : 1;
    this.angle += this.speed * dirSign * dt;

    let center = this.anchor;
    if (this.anchor === 'player' && context.playerPosition) {
      center = context.playerPosition;
    }

    const cx = center.x || 0;
    const cy = (center.y || 0) + this.height;
    const cz = center.z || 0;

    const tx = cx + Math.cos(this.angle) * this.radius;
    const ty = cy + Math.sin(this.time * this.wobbleFreq) * this.wobbleAmp;
    const tz = cz + Math.sin(this.angle) * this.radius;

    const vx = -Math.sin(this.angle) * this.radius * this.speed * dirSign;
    const vy = Math.cos(this.time * this.wobbleFreq) * this.wobbleAmp * this.wobbleFreq;
    const vz = Math.cos(this.angle) * this.radius * this.speed * dirSign;

    enemy.targetPosition.set(tx, ty, tz);
    enemy.velocity.set(vx, vy, vz);
    enemy.targetSpeed = Math.hypot(vx, vy, vz);

    _v1.set(vx, vy, vz).normalize();
    if (_v1.lengthSq() > 0.01) {
      enemy.targetQuaternion.setFromUnitVectors(_fwd, _v1);
    }

    // Bank into orbit curve
    const bankMagnitude = 0.35 * (this.clockwise ? -1 : 1);
    enemy.targetBank = bankMagnitude;
  }
}

/**
 * Patrol Behavior:
 * Waypoint navigation along a closed loop or path with bank angles into turns.
 */
export class PatrolBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.speed = options.speed ?? 35;
    this.turnSpeed = options.turnSpeed ?? 2.5;
    this.waypointRadius = options.waypointRadius ?? 15;
    this.loop = options.loop ?? true;
    this.currentWaypointIndex = 0;

    this.waypoints = (options.waypoints || [
      new THREE.Vector3(-100, 10, -100),
      new THREE.Vector3(100, -10, -100),
      new THREE.Vector3(100, 20, 100),
      new THREE.Vector3(-100, -5, 100)
    ]).map(w => (w.isVector3 ? w.clone() : new THREE.Vector3(w[0], w[1], w[2])));
  }

  init(enemy) {
    if (this.waypoints.length > 0) {
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < this.waypoints.length; i++) {
        const d = enemy.root.position.distanceTo(this.waypoints[i]);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
      this.currentWaypointIndex = closestIdx;
    }
  }

  update(dt, enemy, context) {
    if (this.waypoints.length === 0) return;

    const wp = this.waypoints[this.currentWaypointIndex];
    const toWp = _v1.subVectors(wp, enemy.root.position);
    const dist = toWp.length();

    if (dist <= this.waypointRadius) {
      this.currentWaypointIndex++;
      if (this.currentWaypointIndex >= this.waypoints.length) {
        this.currentWaypointIndex = this.loop ? 0 : this.waypoints.length - 1;
      }
    }

    if (dist > 0.01) {
      toWp.normalize();
      _quat.setFromUnitVectors(_fwd, toWp);
      enemy.targetQuaternion.slerp(_quat, 1 - Math.exp(-this.turnSpeed * dt));

      const curFwd = _v2.set(0, 0, -1).applyQuaternion(enemy.targetQuaternion);
      enemy.velocity.copy(curFwd).multiplyScalar(this.speed);
      enemy.targetPosition.addScaledVector(enemy.velocity, dt);
      enemy.targetSpeed = this.speed;

      // Bank roll proportional to turning yaw
      const crossY = curFwd.x * toWp.z - curFwd.z * toWp.x;
      enemy.targetBank = THREE.MathUtils.clamp(crossY * 2.0, -0.65, 0.65);
    }
  }
}

/**
 * Chase / Dogfight Behavior:
 * Intelligent intercept steering, distance maintenance, and evasive break-away maneuvers.
 */
export class ChaseBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.maxSpeed = options.maxSpeed ?? 42;
    this.turnSpeed = options.turnSpeed ?? 2.8;
    this.combatDistance = options.combatDistance ?? 40;
    this.breakawayDistance = options.breakawayDistance ?? 16;
    this.attackSpeed = options.attackSpeed ?? 48;
    this.leadFactor = options.leadFactor ?? 0.65;

    this.state = 'APPROACH'; // 'APPROACH' | 'COMBAT' | 'BREAKAWAY'
    this.breakawayTimer = 0;
    this.breakawayDir = new THREE.Vector3();
  }

  update(dt, enemy, context) {
    const targetPos = context.playerPosition;
    if (!targetPos) return;

    const targetVel = context.playerVelocity || new THREE.Vector3();
    const toTarget = _v1.subVectors(targetPos, enemy.root.position);
    const dist = toTarget.length();

    // State Transitions
    if (this.state === 'BREAKAWAY') {
      this.breakawayTimer -= dt;
      if (this.breakawayTimer <= 0) {
        this.state = 'APPROACH';
      }
    } else {
      if (dist < this.breakawayDistance) {
        this.state = 'BREAKAWAY';
        this.breakawayTimer = 2.0 + Math.random() * 1.5;
        // Break away diagonally up or to the side
        const side = Math.random() > 0.5 ? 1 : -1;
        this.breakawayDir.set(side * 0.8, 0.5, 0.5).normalize();
        this.breakawayDir.applyQuaternion(enemy.root.quaternion);
      } else if (dist <= this.combatDistance) {
        this.state = 'COMBAT';
      } else {
        this.state = 'APPROACH';
      }
    }

    // Steering & Speed execution per state
    let desiredDir = _v2;
    let desiredSpeed = this.maxSpeed;

    if (this.state === 'BREAKAWAY') {
      desiredDir.copy(this.breakawayDir);
      desiredSpeed = this.attackSpeed;
      enemy.isBoosting = true;
    } else if (this.state === 'COMBAT') {
      // Predictive lead aim point
      const tLead = (dist / 160.0) * this.leadFactor;
      _vTarget.copy(targetPos).addScaledVector(targetVel, tLead);
      desiredDir.subVectors(_vTarget, enemy.root.position).normalize();
      desiredSpeed = THREE.MathUtils.lerp(this.maxSpeed * 0.6, this.maxSpeed, (dist - this.breakawayDistance) / (this.combatDistance - this.breakawayDistance));
      enemy.isBoosting = false;
    } else {
      // APPROACH: Pursue lead point aggressively
      const tLead = (dist / 160.0) * this.leadFactor;
      _vTarget.copy(targetPos).addScaledVector(targetVel, tLead);
      desiredDir.subVectors(_vTarget, enemy.root.position).normalize();
      desiredSpeed = this.attackSpeed;
      enemy.isBoosting = dist > 90;
    }

    if (desiredDir.lengthSq() > 0.001) {
      _quat.setFromUnitVectors(_fwd, desiredDir);
      enemy.targetQuaternion.slerp(_quat, 1 - Math.exp(-this.turnSpeed * dt));

      const curFwd = _vTarget.set(0, 0, -1).applyQuaternion(enemy.targetQuaternion);
      enemy.velocity.copy(curFwd).multiplyScalar(desiredSpeed);
      enemy.targetPosition.addScaledVector(enemy.velocity, dt);
      enemy.targetSpeed = desiredSpeed;

      // Bank roll based on angular deflection
      const crossY = curFwd.x * desiredDir.z - curFwd.z * desiredDir.x;
      enemy.targetBank = THREE.MathUtils.clamp(crossY * 2.5, -0.75, 0.75);
    }
  }

  onDamaged(enemy, amount, attackerId) {
    // If caught off-guard from behind, trigger quick evasive jink
    if (this.state !== 'BREAKAWAY' && Math.random() < 0.4) {
      this.state = 'BREAKAWAY';
      this.breakawayTimer = 1.4;
      this.breakawayDir.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, 0.8).normalize();
      this.breakawayDir.applyQuaternion(enemy.root.quaternion);
    }
  }
}

/**
 * Drift Behavior:
 * Newtonian inertia drifting with periodic directional thruster burns and soft boundary tethering.
 */
export class DriftBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.driftSpeed = options.driftSpeed ?? 24;
    this.jitterInterval = options.jitterInterval ?? 3.5;
    this.maxRoamRadius = options.maxRoamRadius ?? 180;
    this.center = (options.center?.isVector3) ? options.center.clone() : new THREE.Vector3(...(options.center || [0, 0, 0]));

    this.timer = Math.random() * this.jitterInterval;
    this.currentDriftDir = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2).normalize();
  }

  update(dt, enemy, context) {
    this.timer += dt;

    // Check boundary leash
    const distFromCenter = enemy.root.position.distanceTo(this.center);
    if (distFromCenter > this.maxRoamRadius) {
      // Steer back towards center
      this.currentDriftDir.subVectors(this.center, enemy.root.position).normalize();
      this.timer = 0;
    } else if (this.timer >= this.jitterInterval) {
      this.timer = 0;
      this.currentDriftDir.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 2
      ).normalize();
    }

    _quat.setFromUnitVectors(_fwd, this.currentDriftDir);
    enemy.targetQuaternion.slerp(_quat, 1 - Math.exp(-2.0 * dt));

    const curFwd = _v1.set(0, 0, -1).applyQuaternion(enemy.targetQuaternion);
    enemy.velocity.copy(curFwd).multiplyScalar(this.driftSpeed);
    enemy.targetPosition.addScaledVector(enemy.velocity, dt);
    enemy.targetSpeed = this.driftSpeed;
    enemy.targetBank = THREE.MathUtils.lerp(enemy.targetBank, 0, 1 - Math.exp(-2 * dt));
  }
}

/**
 * Custom Behavior:
 * Injects user-provided logic callbacks for future game modes or bosses.
 */
export class CustomBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.updateFn = options.updateFn || null;
    this.onDamagedFn = options.onDamagedFn || null;
    this.initFn = options.initFn || null;
  }

  init(enemy) {
    if (this.initFn) this.initFn(enemy);
  }

  update(dt, enemy, context) {
    if (this.updateFn) {
      this.updateFn(dt, enemy, context);
    }
  }

  onDamaged(enemy, amount, attackerId) {
    if (this.onDamagedFn) {
      this.onDamagedFn(enemy, amount, attackerId);
    }
  }
}

// Global Behavior Registry
export const BEHAVIOR_REGISTRY = {
  stationary: StationaryBehavior,
  orbit: OrbitBehavior,
  patrol: PatrolBehavior,
  chase: ChaseBehavior,
  drift: DriftBehavior,
  custom: CustomBehavior
};

export function registerBehavior(type, behaviorClass) {
  BEHAVIOR_REGISTRY[type.toLowerCase()] = behaviorClass;
}

/**
 * Creates behavior instance from type or config
 * @param {string|BaseBehavior|Function} typeOrInstance
 * @param {object} [options]
 * @returns {BaseBehavior}
 */
export function createBehavior(typeOrInstance, options = {}) {
  if (typeOrInstance instanceof BaseBehavior) {
    return typeOrInstance;
  }

  if (typeof typeOrInstance === 'function') {
    return new typeOrInstance(options);
  }

  const key = (typeof typeOrInstance === 'string') ? typeOrInstance.toLowerCase() : 'orbit';
  const BehaviorClass = BEHAVIOR_REGISTRY[key] || OrbitBehavior;
  return new BehaviorClass(options);
}
