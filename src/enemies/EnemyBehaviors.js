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
const _right = new THREE.Vector3(1, 0, 0);
const _quat = new THREE.Quaternion();
const _zeroVec = new THREE.Vector3(0, 0, 0);
const _playerFwd = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

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
 * Smooth circular orbital trajectory around a point or player.
 * In combat, dynamically anchors to the player's position, providing a
 * smooth, readable circular strafe path that is enjoyable to track, lead, and shoot.
 */
export class OrbitBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.radius = options.radius ?? 55;
    this.height = options.height ?? 0;
    this.speed = options.speed ?? 0.36; // rad/s (~20 m/s)
    this.wobbleFreq = options.wobbleFreq ?? 0.3;
    this.wobbleAmp = options.wobbleAmp ?? 5; // gentle, readable wobble
    this.clockwise = options.clockwise ?? true;
    this.anchor = options.anchor ?? 'player';
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
    if ((this.anchor === 'player' || !this.anchor) && context.playerPosition) {
      center = context.playerPosition;
    }

    const cx = (center && typeof center.x === 'number') ? center.x : (Array.isArray(center) ? center[0] : 0);
    const cy = (center && typeof center.y === 'number') ? center.y : (Array.isArray(center) ? center[1] : 0);
    const cz = (center && typeof center.z === 'number') ? center.z : (Array.isArray(center) ? center[2] : 0);

    const tx = cx + Math.cos(this.angle) * this.radius;
    const ty = cy + this.height + Math.sin(this.time * this.wobbleFreq) * this.wobbleAmp;
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
    const bankMagnitude = 0.42 * (this.clockwise ? -1 : 1);
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
 * Intelligent space combat flight AI supporting tactical tail pursuit,
 * off-axis flanking passes, high-G banking combat turns (readable and chasable!),
 * dynamic speed matching, and authentic S-turn evasive weaves when taking fire from behind.
 */
export class ChaseBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.maxSpeed = options.maxSpeed ?? 42;
    this.attackSpeed = options.attackSpeed ?? 50;
    this.turnSpeed = options.turnSpeed ?? 1.6;
    this.combatDistance = options.combatDistance ?? 40;
    this.breakawayDistance = options.breakawayDistance ?? 20;
    this.leadFactor = options.leadFactor ?? 0.7;

    // Tactical Dogfight States:
    // 'APPROACH'    - Sweeping, curved flanking approach towards the engagement zone
    // 'PURSUIT'     - Tailing the player's 6 o'clock: matches speed, stays locked behind, fires to kill
    // 'COMBAT_TURN' - High-G banking turn peeling off to reposition (smooth readable arc for player to chase!)
    // 'EVASIVE'     - S-turn weave / barrel roll when taking fire from behind
    // 'EXTEND'      - Brief forward boost burn to build separation before re-engaging
    this.state = options.initialState || 'APPROACH';

    this.stateTimer = 0;
    this.turnDirection = Math.random() > 0.5 ? 1 : -1; // 1 = bank right, -1 = bank left
    this.verticalBias = (Math.random() - 0.5) * 0.4;
    this.evasiveTimer = 0;
    this.evasiveDuration = 2.4;
    this.lastDamageTime = 0;
    this.damageStreak = 0;

    // Lateral flanking offset so the enemy doesn't charge straight into a head-on collision
    this.flankSign = Math.random() > 0.5 ? 1 : -1;
    this.flankOffset = new THREE.Vector3(
      this.flankSign * (20 + Math.random() * 12),
      (Math.random() - 0.5) * 14,
      0
    );
  }

  init(enemy) {
    this.stateTimer = Math.random() * 0.8;
  }

  update(dt, enemy, context) {
    const targetPos = context.playerPosition;
    if (!targetPos) return;

    const targetVel = context.playerVelocity || _zeroVec;
    const enemyPos = enemy.root.position;

    _toPlayer.subVectors(targetPos, enemyPos);
    const dist = _toPlayer.length();
    if (dist < 0.001) return;

    const playerSpeed = targetVel.length();
    if (playerSpeed > 1.0) {
      _playerFwd.copy(targetVel).normalize();
    } else if (context.camera) {
      context.camera.getWorldDirection(_playerFwd);
    } else {
      _playerFwd.set(0, 0, -1);
    }

    // Current forward direction of the enemy ship in world space
    const enemyQuat = enemy.targetQuaternion || enemy.root.quaternion;
    const enemyFwd = _v1.set(0, 0, -1).applyQuaternion(enemyQuat);

    // Tactical Geometry:
    // 1. Is enemy behind the player? (in player's rear hemisphere / 6 o'clock)
    const playerToEnemy = _v2.copy(enemyPos).sub(targetPos).normalize();
    const dotPlayerBehind = _playerFwd.dot(playerToEnemy);

    // 2. Is player behind the enemy? (Player is tailing the enemy)
    const toPlayerDir = _v2.copy(_toPlayer).normalize();
    const dotPlayerTailing = enemyFwd.dot(toPlayerDir);

    this.stateTimer += dt;
    this.evasiveTimer += dt;

    // State Transitions
    switch (this.state) {
      case 'EVASIVE':
        if (this.stateTimer >= this.evasiveDuration) {
          // Finished evasive weave, transition into a smooth combat turn to loop back
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = Math.random() > 0.5 ? 1 : -1;
          this.verticalBias = (Math.random() - 0.5) * 0.3;
        }
        break;

      case 'COMBAT_TURN':
        // Combat turn lasts 2.2 to 3.0 seconds, or ends when successfully positioned behind player
        if (this.stateTimer > 2.6 || (this.stateTimer > 1.2 && dotPlayerBehind < -0.2 && dist > 25)) {
          this.state = 'PURSUIT';
          this.stateTimer = 0;
          this.flankSign = -this.flankSign;
        }
        break;

      case 'EXTEND':
        if (this.stateTimer > 2.0 || dist > 85) {
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = Math.random() > 0.5 ? 1 : -1;
        }
        break;

      case 'PURSUIT':
        // If enemy gets too close or passes player
        if (dist < this.breakawayDistance) {
          // Initiate high-G combat turn: peel off into an arc rather than ramming!
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = Math.random() > 0.5 ? 1 : -1;
          this.verticalBias = (Math.random() - 0.5) * 0.4;
        } else if (dotPlayerBehind > 0.6 && dist > 60) {
          // Player managed to turn around and face us, switch to flanking approach
          this.state = 'APPROACH';
          this.stateTimer = 0;
        }
        break;

      case 'APPROACH':
      default:
        // If close to player, peel off into a combat turn
        if (dist < this.breakawayDistance) {
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = Math.random() > 0.5 ? 1 : -1;
          this.verticalBias = (Math.random() - 0.5) * 0.4;
        } else if (dotPlayerBehind < -0.2 && dist < 65) {
          // Successfully positioned in rear hemisphere, engage pursuit!
          this.state = 'PURSUIT';
          this.stateTimer = 0;
        }
        break;
    }

    // Steering & Speed execution per state
    let desiredDir = _v2;
    let desiredSpeed = this.maxSpeed;
    let desiredBank = null;

    if (this.state === 'PURSUIT') {
      // PURSUIT: Tail the player's 6 o'clock!
      // Ideal position: combatDistance behind the player
      const tailDist = THREE.MathUtils.clamp(this.combatDistance, 30, 48);
      _vTarget.copy(targetPos).addScaledVector(_playerFwd, -tailDist);

      // Add mild lead so it curves onto the player's flight vector
      const tLead = (dist / 160.0) * this.leadFactor;
      _vTarget.addScaledVector(targetVel, tLead * 0.6);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();

      // Speed matching: dynamically match player speed to maintain tail position!
      const distError = dist - tailDist;
      desiredSpeed = THREE.MathUtils.clamp(
        playerSpeed + distError * 0.55,
        this.maxSpeed * 0.6,
        this.attackSpeed
      );

      // Boost if player is boosting or dist is large
      enemy.isBoosting = playerSpeed > 60 || dist > tailDist + 22;

    } else if (this.state === 'COMBAT_TURN') {
      // COMBAT_TURN: High-G tactical banking arc
      // This is the signature chasable maneuver: the enemy banks heavily and turns
      // in a continuous circular arc right across the player's screen!
      _right.crossVectors(enemyFwd, _up).normalize();

      // Blend forward momentum with lateral banking turn
      desiredDir.copy(enemyFwd).multiplyScalar(0.65)
        .addScaledVector(_right, this.turnDirection * 0.75)
        .addScaledVector(_up, this.verticalBias)
        .normalize();

      // Moderate cruising speed through the turn so the player can chase and match
      desiredSpeed = this.maxSpeed * 0.85;
      enemy.isBoosting = false;

      // Heavy visual bank into the turn
      desiredBank = -this.turnDirection * 0.72; // ~41 deg banking tilt!

    } else if (this.state === 'EVASIVE') {
      // EVASIVE: S-Turn weave / barrel roll when taking fire from behind
      // Continuous sinusoidal S-weave: challenging aim, but smooth and chasable!
      const freq = 2.2;
      const wave = Math.sin(this.evasiveTimer * freq);
      const waveVert = Math.cos(this.evasiveTimer * 1.4) * 0.35;

      _right.crossVectors(enemyFwd, _up).normalize();
      desiredDir.copy(enemyFwd).multiplyScalar(0.75)
        .addScaledVector(_right, wave * 0.6)
        .addScaledVector(_up, waveVert)
        .normalize();

      desiredSpeed = this.attackSpeed * 0.95;
      enemy.isBoosting = Math.abs(wave) < 0.28; // Pulse boost on weave straightaways!
      desiredBank = -wave * 0.75; // Roll with the S-weave!

    } else if (this.state === 'EXTEND') {
      // EXTEND: High-speed separation burn
      _right.crossVectors(enemyFwd, _up).normalize();
      desiredDir.copy(enemyFwd).multiplyScalar(0.88)
        .addScaledVector(_right, this.turnDirection * 0.3)
        .normalize();

      desiredSpeed = this.attackSpeed;
      enemy.isBoosting = true;
      desiredBank = -this.turnDirection * 0.45;

    } else {
      // APPROACH: Sweeping flanking intercept curve
      const tLead = (dist / 160.0) * this.leadFactor;
      _vTarget.copy(targetPos).addScaledVector(targetVel, tLead);

      // Apply lateral flanking offset so it doesn't ram straight into the nose
      _right.crossVectors(_playerFwd, _up).normalize();
      _vTarget.addScaledVector(_right, this.flankOffset.x);
      _vTarget.addScaledVector(_up, this.flankOffset.y);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();
      desiredSpeed = this.maxSpeed;
      enemy.isBoosting = dist > 90;
    }

    // Apply orientation and velocity
    if (desiredDir.lengthSq() > 0.001) {
      _quat.setFromUnitVectors(_fwd, desiredDir);
      enemy.targetQuaternion.slerp(_quat, 1 - Math.exp(-this.turnSpeed * dt));

      const curFwd = _vTarget.set(0, 0, -1).applyQuaternion(enemy.targetQuaternion);
      enemy.velocity.copy(curFwd).multiplyScalar(desiredSpeed);
      enemy.targetPosition.addScaledVector(enemy.velocity, dt);
      enemy.targetSpeed = desiredSpeed;

      // Bank roll: use explicit maneuver bank if specified, otherwise aerodynamic yaw deflection
      if (desiredBank !== null) {
        enemy.targetBank = desiredBank;
      } else {
        const crossY = curFwd.x * desiredDir.z - curFwd.z * desiredDir.x;
        enemy.targetBank = THREE.MathUtils.clamp(crossY * 2.2, -0.72, 0.72);
      }
    }
  }

  onDamaged(enemy, amount, attackerId) {
    const now = performance.now() / 1000;
    if (now - this.lastDamageTime < 2.0) {
      this.damageStreak++;
    } else {
      this.damageStreak = 1;
    }
    this.lastDamageTime = now;

    // If taking repeated fire from behind, initiate defensive evasive S-turns!
    if (this.state !== 'EVASIVE' && this.state !== 'EXTEND') {
      if (this.damageStreak >= 2 || Math.random() < 0.65) {
        this.state = 'EVASIVE';
        this.stateTimer = 0;
        this.evasiveTimer = Math.random() * Math.PI;
        this.evasiveDuration = 2.2 + Math.random() * 1.0;
      }
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
  dogfight: ChaseBehavior,
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
