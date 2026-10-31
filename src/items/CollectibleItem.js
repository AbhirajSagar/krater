/**
 * CollectibleItem.js
 * Abstract base class for collectible space items (ammo, health, shield, power-ups).
 *
 * Defines the core contract, physical bounds, touch/collision detection against ships,
 * smooth bobbing/rotation animations, collection preconditions, and lifecycle hooks.
 *
 * Concrete subclasses (e.g., AmmoItem, HealthItem, ShieldItem) extend this class
 * and implement `createVisuals()` and `onCollect(ship)`.
 */

import * as THREE from 'three';

let _idCounter = 1;

// Reusable scratchpad vectors to eliminate per-frame GC allocations in touch loops
const _shipPos = new THREE.Vector3();
const _itemPos = new THREE.Vector3();
const _diff = new THREE.Vector3();

export class CollectibleItem {
  /**
   * @param {THREE.Scene} scene The Three.js scene
   * @param {object} [options] Configuration options
   * @param {string} [options.id] Unique item identifier
   * @param {string} [options.type='abstract_item'] Item type identifier (e.g. 'ammo', 'health', 'shield')
   * @param {string} [options.name='Collectible Item'] Human-readable item name
   * @param {THREE.Vector3|number[]|object} [options.position] Spawn position coordinates
   * @param {number} [options.radius=3.0] Touch collection sphere radius
   * @param {number} [options.lifetime=Infinity] Duration in seconds before despawning (Infinity = persistent)
   * @param {boolean} [options.autoRotate=true] Whether the item continuously rotates in space
   * @param {THREE.Vector3|{x:number, y:number, z:number}} [options.rotationSpeed] Axis rotation speeds (rad/s)
   * @param {boolean} [options.bobbing=true] Whether the item floats sinusoidally
   * @param {number} [options.bobFrequency=1.8] Frequency of vertical bobbing oscillation
   * @param {number} [options.bobAmplitude=0.45] Amplitude of vertical bobbing oscillation
   * @param {boolean} [options.magnetic=false] Whether item glides toward approaching ships
   * @param {number} [options.magneticRadius=0] Distance within which magnetic attraction activates
   * @param {number} [options.magneticSpeed=20.0] Glide speed when pulled magnetically
   * @param {string|number} [options.color='#00f0ff'] Theme accent color
   * @param {object} [options.customData] Arbitrary subclass/extensible data
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.id = options.id || `item_${Date.now()}_${_idCounter++}`;
    this.type = options.type || 'abstract_item';
    this.name = options.name || 'Collectible Item';
    this.radius = typeof options.radius === 'number' ? options.radius : 3.0;
    this.lifetime = options.lifetime ?? Infinity;
    this.age = 0;
    this.isCollected = false;
    this.isDisposed = false;
    this.customData = options.customData || {};
    this.color = options.color || '#00f0ff';

    // Animation & physics parameters
    this.autoRotate = options.autoRotate !== false;
    this.rotationSpeed = options.rotationSpeed || { x: 0.4, y: 1.2, z: 0.3 };
    this.bobbing = options.bobbing !== false;
    this.bobFrequency = options.bobFrequency ?? 1.8;
    this.bobAmplitude = options.bobAmplitude ?? 0.45;

    // Optional magnetic attraction
    this.magnetic = !!options.magnetic;
    this.magneticRadius = options.magneticRadius ?? 0;
    this.magneticSpeed = options.magneticSpeed ?? 20.0;

    // Three.js Hierarchy
    this.root = new THREE.Group();
    this.root.name = `CollectibleItem_${this.type}_${this.id}`;
    this.visualHolder = new THREE.Group();
    this.visualHolder.name = `VisualHolder_${this.id}`;
    this.root.add(this.visualHolder);

    // Initial position setup
    this.basePosition = new THREE.Vector3();
    if (options.position) {
      if (Array.isArray(options.position)) {
        this.basePosition.fromArray(options.position);
      } else if (options.position.isVector3) {
        this.basePosition.copy(options.position);
      } else if (typeof options.position === 'object') {
        this.basePosition.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
      }
    }
    this.root.position.copy(this.basePosition);

    // Collision Bounding Sphere
    this.boundingSphere = new THREE.Sphere(this.root.position, this.radius);

    // Attach to scene
    if (this.scene) {
      this.scene.add(this.root);
    }

    // Build visual representation (subclasses override this)
    this.createVisuals();
  }

  // =========================================================================
  // ABSTRACT HOOKS TO BE OVERRIDDEN BY CONCRETE SUBCLASSES
  // =========================================================================

  /**
   * Abstract method: builds the 3D visual geometry, materials, and hierarchy.
   * Concrete subclasses (AmmoItem, HealthItem, ShieldItem) should override this method.
   * A default holographic wireframe beacon is created if not overridden.
   */
  createVisuals() {
    const colorHex = typeof this.color === 'string'
      ? parseInt(this.color.replace('#', '0x'), 16)
      : this.color;

    // Outer spinning cage (wireframe octahedron)
    const geom = new THREE.OctahedronGeometry(1.2, 0);
    const wireGeom = new THREE.WireframeGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.wireMesh = new THREE.LineSegments(wireGeom, lineMat);
    this.visualHolder.add(this.wireMesh);

    // Inner glowing energy core
    const coreGeom = new THREE.OctahedronGeometry(0.5, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.visualHolder.add(this.coreMesh);
  }

  /**
   * Precondition hook: evaluates if a ship is currently eligible to pick up this item when touched.
   * Concrete subclasses can override this to impose specific conditions (e.g. ship.currentAmmo < ship.maxAmmo).
   *
   * @param {import('../SpaceshipController.js').SpaceshipController|object} ship
   * @returns {boolean} True if the ship is allowed to collect this item
   */
  canCollect(ship) {
    if (this.isCollected || this.isDisposed) return false;
    if (!ship) return false;
    if (ship.isDestroyed || ship.isDead) return false;
    return true;
  }

  /**
   * Abstract method: called when a ship touches and successfully collects this item.
   * Concrete subclasses (e.g. AmmoItem, HealthItem, ShieldItem) must override this method
   * to apply their specific payload (e.g., adding ammo, restoring shields, healing).
   *
   * @param {import('../SpaceshipController.js').SpaceshipController|object} ship The collecting ship
   * @returns {object} Collection result metadata
   */
  onCollect(ship) {
    this.isCollected = true;
    return {
      collected: true,
      type: this.type,
      id: this.id,
      ship
    };
  }

  /**
   * Optional hook for custom per-frame animation/effects in subclasses.
   * @param {number} dt Delta time in seconds
   */
  onUpdate(dt) {}

  /**
   * Hook called when item is spawned into the world.
   * @param {THREE.Vector3|number[]} [position]
   */
  onSpawn(position = null) {
    if (position) {
      if (Array.isArray(position)) {
        this.basePosition.fromArray(position);
      } else if (position.isVector3) {
        this.basePosition.copy(position);
      } else if (typeof position === 'object') {
        this.basePosition.set(position.x || 0, position.y || 0, position.z || 0);
      }
      this.root.position.copy(this.basePosition);
      this.boundingSphere.center.copy(this.root.position);
    }
    this.age = 0;
    this.isCollected = false;
    this.isDisposed = false;
  }

  /**
   * Hook called when item despawns (e.g. lifetime expiry).
   */
  onDespawn() {}

  // =========================================================================
  // CORE LIFECYCLE & TOUCH DETECTION
  // =========================================================================

  /**
   * Tests if the given ship's collision volume overlaps with this item's collection radius.
   * @param {object} ship Ship entity with position/root.position and radius
   * @returns {boolean} True if touched
   */
  checkTouch(ship) {
    if (!ship || this.isCollected || this.isDisposed) return false;
    if (ship.isDestroyed || ship.isDead) return false;

    const shipPos = ship.root ? ship.root.position : (ship.position || null);
    if (!shipPos) return false;

    const shipRadius = typeof ship.radius === 'number' ? ship.radius : 3.0;
    const touchRadius = this.radius + shipRadius;

    _shipPos.copy(shipPos);
    _itemPos.copy(this.root.position);
    const distSq = _itemPos.distanceToSquared(_shipPos);

    return distSq <= (touchRadius * touchRadius);
  }

  /**
   * Gently pulls the item toward the specified position if within magnetic range.
   * @param {THREE.Vector3} targetPos
   * @param {number} dt
   */
  attractToward(targetPos, dt) {
    if (!this.magnetic || this.isCollected || this.isDisposed) return;
    const dist = this.root.position.distanceTo(targetPos);
    if (dist <= this.magneticRadius && dist > 0.1) {
      _diff.subVectors(targetPos, this.root.position).normalize();
      this.basePosition.addScaledVector(_diff, this.magneticSpeed * dt);
      this.root.position.addScaledVector(_diff, this.magneticSpeed * dt);
      this.boundingSphere.center.copy(this.root.position);
    }
  }

  /**
   * Updates item physics, bobbing, rotation, and lifecycle.
   * @param {number} dt Delta time in seconds
   * @returns {'active'|'expired'|'collected'|'disposed'}
   */
  update(dt) {
    if (this.isDisposed) return 'disposed';
    if (this.isCollected) return 'collected';

    this.age += dt;

    // Check lifetime expiry
    if (this.age >= this.lifetime) {
      this.onDespawn();
      return 'expired';
    }

    // Sinusoidal vertical bobbing
    if (this.bobbing) {
      this.root.position.y = this.basePosition.y + Math.sin(this.age * this.bobFrequency) * this.bobAmplitude;
      this.root.position.x = this.basePosition.x;
      this.root.position.z = this.basePosition.z;
    }

    // Continuous 3D rotation
    if (this.autoRotate && this.visualHolder) {
      this.visualHolder.rotation.x += this.rotationSpeed.x * dt;
      this.visualHolder.rotation.y += this.rotationSpeed.y * dt;
      this.visualHolder.rotation.z += this.rotationSpeed.z * dt;
    }

    // Keep bounding sphere synchronized with current world position
    this.boundingSphere.center.copy(this.root.position);

    // Subclass per-frame animation hook
    this.onUpdate(dt);

    return 'active';
  }

  /**
   * Plays a pickup visual animation (scaling down & shrinking into the ship) before disposal.
   * @param {object} ship
   * @param {Function} [onComplete]
   */
  playCollectAnimation(ship, onComplete = null) {
    this.isCollected = true;
    const startScale = this.visualHolder.scale.x;
    let animTime = 0;
    const duration = 0.22; // snappy 220ms

    const raf = typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 16);

    const step = () => {
      animTime += 0.033;
      const progress = Math.min(1.0, animTime / duration);
      const ease = 1 - Math.pow(progress, 2);
      if (this.visualHolder) {
        this.visualHolder.scale.setScalar(startScale * ease);
      }

      if (progress < 1.0 && !this.isDisposed) {
        raf(step);
      } else {
        if (onComplete) onComplete();
      }
    };
    step();
  }

  /**
   * Disposes 3D meshes, geometries, materials, and removes from scene.
   */
  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.root) {
      this.root.traverse((child) => {
        if (child.isMesh || child.isLine || child.isLineSegments) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      if (this.root.parent) {
        this.root.parent.remove(this.root);
      } else if (this.scene) {
        this.scene.remove(this.root);
      }
    }
  }
}
