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

  onDamaged(enemy, amount, attackerId, hitPoint = null) {
    // Sharp defensive jink / dip when taking heavy fire
    if (this.anchorPosition) {
      const shiftX = (Math.random() - 0.5) * 6.0;
      const shiftY = -(4.0 + Math.random() * 5.0);
      const shiftZ = (Math.random() - 0.5) * 6.0;
      enemy.targetPosition.add(new THREE.Vector3(shiftX, shiftY, shiftZ));
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

    // Evasive duck break state on taking damage
    this.duckTimer = 0;
    this.duckAltitude = 0;
    this.duckRadiusOffset = 0;
    this.duckSpeedMult = 1.0;
    this.damageStreak = 0;
    this.lastDamageTime = 0;
  }

  init(enemy) {
    const pos = enemy.root.position;
    this.angle = Math.atan2(pos.z, pos.x);
    this.height = pos.y;
  }

  onDamaged(enemy, amount, attackerId, hitPoint = null) {
    const now = performance.now() / 1000;
    if (now - this.lastDamageTime < 2.5) {
      this.damageStreak++;
    } else {
      this.damageStreak = 1;
    }
    this.lastDamageTime = now;

    // Subtle impact nudge: brief minor shudder, no huge altitude plunge or speed boost
    this.duckTimer = 0.25;
    this.duckAltitude = -(0.5 + Math.random() * 0.4); // Subtle ~0.7m nudge
    this.duckRadiusOffset = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.4);
    this.duckSpeedMult = 1.0; // Maintain steady orbit speed, no boosting away

    // Invert orbit direction if taking heavy continuous fire
    if (this.damageStreak >= 5) {
      this.clockwise = !this.clockwise;
      this.damageStreak = 0;
    }
  }

  update(dt, enemy, context) {
    this.time += dt;

    // Impact nudge recovery
    if (this.duckTimer > 0) {
      this.duckTimer -= dt;
      const decay = 1 - Math.exp(-12 * dt);
      this.duckAltitude = THREE.MathUtils.lerp(this.duckAltitude, 0, decay);
      this.duckRadiusOffset = THREE.MathUtils.lerp(this.duckRadiusOffset, 0, decay);
      this.duckSpeedMult = THREE.MathUtils.lerp(this.duckSpeedMult, 1.0, decay);
    } else {
      this.duckAltitude = 0;
      this.duckRadiusOffset = 0;
      this.duckSpeedMult = 1.0;
    }

    const currentSpeed = this.speed * this.duckSpeedMult;
    const currentRadius = Math.max(25, this.radius + this.duckRadiusOffset);
    const dirSign = this.clockwise ? -1 : 1;
    this.angle += currentSpeed * dirSign * dt;

    let center = this.anchor;
    if ((this.anchor === 'player' || !this.anchor) && context.playerPosition) {
      center = context.playerPosition;
    }

    const cx = (center && typeof center.x === 'number') ? center.x : (Array.isArray(center) ? center[0] : 0);
    const cy = (center && typeof center.y === 'number') ? center.y : (Array.isArray(center) ? center[1] : 0);
    const cz = (center && typeof center.z === 'number') ? center.z : (Array.isArray(center) ? center[2] : 0);

    const tx = cx + Math.cos(this.angle) * currentRadius;
    const ty = cy + this.height + this.duckAltitude + Math.sin(this.time * this.wobbleFreq) * this.wobbleAmp;
    const tz = cz + Math.sin(this.angle) * currentRadius;

    const vx = -Math.sin(this.angle) * currentRadius * currentSpeed * dirSign;
    const vy = Math.cos(this.time * this.wobbleFreq) * this.wobbleAmp * this.wobbleFreq;
    const vz = Math.cos(this.angle) * currentRadius * currentSpeed * dirSign;

    enemy.targetPosition.set(tx, ty, tz);
    enemy.velocity.set(vx, vy, vz);
    enemy.targetSpeed = Math.hypot(vx, vy, vz);

    _v1.set(vx, vy, vz).normalize();
    if (_v1.lengthSq() > 0.01) {
      enemy.targetQuaternion.setFromUnitVectors(_fwd, _v1);
    }

    // Bank into orbit curve (subtle banking during impact nudge)
    const duckBankExtra = this.duckTimer > 0 ? 0.05 : 0;
    const bankMagnitude = (0.42 + duckBankExtra) * (this.clockwise ? -1 : 1);
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

  onDamaged(enemy, amount, attackerId, hitPoint = null) {
    // Evasive speed burst and bank
    this.speed = Math.min(60, this.speed * 1.4);
    enemy.isBoosting = true;
    enemy.targetBank = (Math.random() > 0.5 ? 1 : -1) * 0.8;
  }
}

/**
 * Chase / Dogfight Behavior:
 * Intelligent space combat flight AI supporting tactical strafing passes,
 * high-G banking combat turns across the player's windshield (chasable & readable!),
 * overshoot runs that fly ahead into the player's crosshairs, and authentic S-turn weaves.
 * Strictly prevents enemies from permanently hovering or trailing at the player's 6 o'clock!
 */
export class ChaseBehavior extends BaseBehavior {
  constructor(options = {}) {
    super(options);
    this.maxSpeed = options.maxSpeed ?? 42;
    this.attackSpeed = options.attackSpeed ?? 50;
    this.turnSpeed = options.turnSpeed ?? 1.6;
    this.combatDistance = options.combatDistance ?? 40;
    this.breakawayDistance = options.breakawayDistance ?? 22;
    this.leadFactor = options.leadFactor ?? 0.7;

    // Tactical Dogfight States:
    // 'APPROACH'    - Sweeping flanking intercept cutting across the player's forward/side view
    // 'STRAFE_PASS' - Fast diving gun run that streaks past the player into their front view
    // 'OVERSHOOT'   - Surges ahead of the player, presenting engines in front of the player's crosshairs!
    // 'COMBAT_TURN' - Wide, high-G banking turn across the player's screen (chasable lead target!)
    // 'PURSUIT'     - Strict short tailing burst (MAX 1.8s), then forcibly breaks away into OVERSHOOT
    // 'EVASIVE'     - S-turn weave / barrel roll ahead of the player when taking damage
    this.state = options.initialState || 'APPROACH';

    this.stateTimer = 0;
    this.tailCooldown = 8.0 + Math.random() * 5.0; // Cooldown so enemies don't glue to tail!
    this.maxPursuitTime = 0.8; // Strictly max 0.8 seconds of rear pursuit!
    this.turnDirection = Math.random() > 0.5 ? 1 : -1;
    this.verticalBias = (Math.random() - 0.5) * 0.4;
    this.evasiveTimer = 0;
    this.evasiveDuration = 2.2;
    this.lastDamageTime = 0;
    this.damageStreak = 0;

    // Lateral flanking offset so the enemy flies in the player's view
    this.flankSign = Math.random() > 0.5 ? 1 : -1;
    this.flankOffset = new THREE.Vector3(
      this.flankSign * (26 + Math.random() * 14),
      (Math.random() - 0.5) * 14,
      16 + Math.random() * 14
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
    if (this.tailCooldown > 0) {
      this.tailCooldown -= dt;
    }

    // State Transitions
    switch (this.state) {
      case 'DUCK_BREAK':
        if (this.stateTimer >= (this.duckDuration || 1.4)) {
          // Finished high-G duck break dive, transition into combat turn
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = this.flankSign;
          this.verticalBias = (Math.random() - 0.5) * 0.35;
        }
        break;

      case 'EVASIVE':
        if (this.stateTimer >= this.evasiveDuration) {
          // Finished evasive weave, transition into a smooth combat turn to loop back
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = Math.random() > 0.5 ? 1 : -1;
          this.verticalBias = (Math.random() - 0.5) * 0.3;
        }
        break;

      case 'PURSUIT':
        // STRICT PURSUIT TIMEOUT:
        // Enemies are NEVER allowed to stay on the player's tail for more than maxPursuitTime (0.8s)!
        // If close, or after 0.8 seconds, OVERSHOOT into the player's view!
        if (this.stateTimer >= this.maxPursuitTime || dist < this.breakawayDistance) {
          this.state = 'OVERSHOOT';
          this.stateTimer = 0;
          this.tailCooldown = 12.0 + Math.random() * 6.0; // 12-18s cooldown before any tailing is permitted
          this.flankSign = Math.random() > 0.5 ? 1 : -1;
        }
        break;

      case 'OVERSHOOT':
        // Flying ahead of the player in plain view: generous 4-second window for player to chase and shoot!
        if (this.stateTimer > 4.0 || dist > 80) {
          this.state = 'COMBAT_TURN';
          this.stateTimer = 0;
          this.turnDirection = this.flankSign;
          this.verticalBias = (Math.random() - 0.5) * 0.35;
        }
        break;

      case 'STRAFE_PASS':
        // High speed pass across/past the player. Once past the player or after 1.8s, overshoot!
        if (this.stateTimer > 1.8 || (dotPlayerBehind > 0.15 && dist > 18)) {
          this.state = 'OVERSHOOT';
          this.stateTimer = 0;
          this.tailCooldown = 10.0 + Math.random() * 5.0;
        }
        break;

      case 'COMBAT_TURN':
        // Arcs across the screen for 2.6 to 3.2s
        if (this.stateTimer > 2.8) {
          this.state = Math.random() < 0.65 ? 'APPROACH' : 'STRAFE_PASS';
          this.stateTimer = 0;
          this.flankSign = -this.flankSign;
          this.flankOffset.x = this.flankSign * (24 + Math.random() * 14);
        }
        break;

      case 'APPROACH':
      default:
        // Sweeping flanking approach toward engagement zone
        if (dist < this.combatDistance + 8) {
          // Only allow brief pursuit if tail cooldown has fully expired AND already in rear cone
          if (this.tailCooldown <= 0 && dotPlayerBehind < -0.45) {
            this.state = 'PURSUIT';
            this.stateTimer = 0;
          } else {
            // Otherwise, execute a strafe pass or combat turn right across the front view!
            this.state = Math.random() > 0.4 ? 'STRAFE_PASS' : 'COMBAT_TURN';
            this.stateTimer = 0;
            this.turnDirection = this.flankSign;
          }
        }
        break;
    }

    // Steering & Speed execution per state
    let desiredDir = _v2;
    let desiredSpeed = this.maxSpeed;
    let desiredBank = null;

    if (this.state === 'OVERSHOOT') {
      // OVERSHOOT: Fly AHEAD of the player in plain view!
      // Position target: 35 to 55m in FRONT of the player, offset slightly laterally
      _right.crossVectors(_playerFwd, _up).normalize();
      _vTarget.copy(targetPos)
        .addScaledVector(_playerFwd, 40)
        .addScaledVector(_right, this.flankSign * 16)
        .addScaledVector(_up, this.verticalBias * 10);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();

      // Cruising speed (not boosting) so the player can chase, lead, and hit!
      desiredSpeed = THREE.MathUtils.clamp(playerSpeed * 0.95 + 4, this.maxSpeed * 0.72, this.maxSpeed * 0.90);
      enemy.isBoosting = false;

      // Gentle banking roll so the ship silhouette tilts into view
      desiredBank = -this.flankSign * 0.45;

    } else if (this.state === 'PURSUIT') {
      // Brief pursuit (MAX 1.8 seconds):
      // Offset slightly to flank rather than dead-center 6 o'clock
      _right.crossVectors(_playerFwd, _up).normalize();
      const tailDist = THREE.MathUtils.clamp(this.combatDistance, 28, 40);
      _vTarget.copy(targetPos)
        .addScaledVector(_playerFwd, -tailDist)
        .addScaledVector(_right, this.flankSign * 14);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();
      desiredSpeed = THREE.MathUtils.clamp(playerSpeed + 3, this.maxSpeed * 0.7, this.attackSpeed);
      enemy.isBoosting = playerSpeed > 60;

    } else if (this.state === 'STRAFE_PASS') {
      // High speed diving pass that slices past the player into their front view
      _right.crossVectors(_playerFwd, _up).normalize();
      _vTarget.copy(targetPos)
        .addScaledVector(_playerFwd, 28) // Aims past the player into front airspace!
        .addScaledVector(_right, this.flankSign * 18);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();
      desiredSpeed = this.attackSpeed;
      enemy.isBoosting = true;
      desiredBank = -this.flankSign * 0.55;

    } else if (this.state === 'COMBAT_TURN') {
      // Wide circular banking arc across the player's screen
      _right.crossVectors(enemyFwd, _up).normalize();
      desiredDir.copy(enemyFwd).multiplyScalar(0.68)
        .addScaledVector(_right, this.turnDirection * 0.72)
        .addScaledVector(_up, this.verticalBias)
        .normalize();

      desiredSpeed = this.maxSpeed * 0.82;
      enemy.isBoosting = false;
      desiredBank = -this.turnDirection * 0.68; // ~39 deg bank!

    } else if (this.state === 'DUCK_BREAK') {
      // DUCK & BREAK: Aggressive defensive dive beneath the player's sights with hard roll
      _right.crossVectors(enemyFwd, _up).normalize();
      desiredDir.copy(enemyFwd).multiplyScalar(0.35)
        .addScaledVector(_right, this.turnDirection * 0.75)
        .addScaledVector(_up, this.verticalBias * 0.9)
        .normalize();

      desiredSpeed = this.attackSpeed * 1.15;
      enemy.isBoosting = true;
      desiredBank = -this.turnDirection * 1.05; // ~60° high-G defensive roll!

    } else if (this.state === 'EVASIVE') {
      // S-turn weave ahead of the player
      const freq = 2.0;
      const wave = Math.sin(this.evasiveTimer * freq);
      const waveVert = Math.cos(this.evasiveTimer * 1.3) * 0.3;

      _right.crossVectors(enemyFwd, _up).normalize();
      desiredDir.copy(enemyFwd).multiplyScalar(0.78)
        .addScaledVector(_right, wave * 0.55)
        .addScaledVector(_up, waveVert)
        .normalize();

      desiredSpeed = this.maxSpeed * 0.9;
      enemy.isBoosting = false;
      desiredBank = -wave * 0.7;

    } else {
      // APPROACH: Wide flanking intercept that brings the enemy into the player's front/side view
      _right.crossVectors(_playerFwd, _up).normalize();
      const tLead = (dist / 160.0) * this.leadFactor;
      _vTarget.copy(targetPos)
        .addScaledVector(targetVel, tLead)
        .addScaledVector(_playerFwd, 15) // Bias toward player's front view!
        .addScaledVector(_right, this.flankOffset.x)
        .addScaledVector(_up, this.flankOffset.y);

      desiredDir.subVectors(_vTarget, enemyPos).normalize();
      desiredSpeed = this.maxSpeed;
      enemy.isBoosting = dist > 95;
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

  onDamaged(enemy, amount, attackerId, hitPoint = null) {
    const now = performance.now() / 1000;
    if (now - this.lastDamageTime < 2.0) {
      this.damageStreak++;
    } else {
      this.damageStreak = 1;
    }
    this.lastDamageTime = now;

    // Maintain dogfight engagement: do NOT dive beneath the player's nose on hit.
    // If under sustained barrage (5+ hits), execute a smooth combat turn rather than an extreme dive.
    if (this.damageStreak >= 5 && this.state !== 'COMBAT_TURN' && this.state !== 'EVASIVE') {
      this.state = 'COMBAT_TURN';
      this.stateTimer = 0;
      this.turnDirection = Math.random() > 0.5 ? 1 : -1;
      this.verticalBias = (Math.random() - 0.5) * 0.2;
      this.tailCooldown = 6.0;
      this.damageStreak = 0;
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

  onDamaged(enemy, amount, attackerId, hitPoint = null) {
    this.timer = 0;
    // Subtle deflection, no downward dive or boost
    this.currentDriftDir.set(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.8
    ).normalize();
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
