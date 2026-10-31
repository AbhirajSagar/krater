/**
 * ItemManager.js
 * Central coordinator and touch/collision detector for collectible items in space.
 *
 * Manages item type registration, spatial spawning, per-frame updates, distance checks
 * against ships (local and remote), collection event dispatching, and scene disposal.
 */

import * as THREE from 'three';
import { CollectibleItem } from './CollectibleItem.js';

// Static scratchpads to eliminate per-frame GC allocations
const _shipPos = new THREE.Vector3();
const _itemPos = new THREE.Vector3();

export class ItemManager {
  /**
   * @param {THREE.Scene} scene The Three.js scene where item meshes live
   */
  constructor(scene) {
    this.scene = scene;

    /** @type {Map<string, CollectibleItem>} Active items mapped by id */
    this.items = new Map();

    /** @type {Map<string, typeof CollectibleItem>} Registry of item classes */
    this.itemTypes = new Map();

    /** @type {Map<string, Set<Function>>} Event listeners */
    this.eventListeners = new Map();
  }

  // =========================================================================
  // TYPE REGISTRY PATTERN
  // =========================================================================

  /**
   * Registers a concrete item subclass for string-based spawning.
   * Example: `itemManager.registerItemType('ammo', AmmoItem)`
   *
   * @param {string} type Key identifier (e.g. 'ammo', 'health', 'shield')
   * @param {typeof CollectibleItem} ItemClass Subclass constructor extending CollectibleItem
   */
  registerItemType(type, ItemClass) {
    if (typeof type !== 'string' || !type) {
      throw new Error('ItemManager.registerItemType: type must be a non-empty string');
    }
    this.itemTypes.set(type.toLowerCase(), ItemClass);
  }

  /**
   * Checks if an item type has been registered.
   * @param {string} type
   * @returns {boolean}
   */
  hasItemType(type) {
    return this.itemTypes.has(type.toLowerCase());
  }

  /**
   * Gets the constructor class for a registered item type.
   * @param {string} type
   * @returns {typeof CollectibleItem|null}
   */
  getItemClass(type) {
    return this.itemTypes.get(type.toLowerCase()) || null;
  }

  // =========================================================================
  // SPAWNING & ITEM MANAGEMENT
  // =========================================================================

  /**
   * Spawns an item into the world.
   * Accepts:
   * 1. A registered type string: `spawnItem('ammo', [0, 5, -20], options)`
   * 2. An item class constructor: `spawnItem(MyCustomItem, [0, 5, -20], options)`
   * 3. An existing CollectibleItem instance: `spawnItem(itemInstance)`
   *
   * @param {string|typeof CollectibleItem|CollectibleItem} itemOrTypeOrClass
   * @param {THREE.Vector3|number[]|object} [position]
   * @param {object} [options] Additional options passed to constructor
   * @returns {CollectibleItem} The spawned item instance
   */
  spawnItem(itemOrTypeOrClass, position = null, options = {}) {
    let item = null;

    if (typeof itemOrTypeOrClass === 'string') {
      const typeKey = itemOrTypeOrClass.toLowerCase();
      const ItemClass = this.itemTypes.get(typeKey);
      if (!ItemClass) {
        // Fallback to base CollectibleItem if unregistered
        item = new CollectibleItem(this.scene, { ...options, type: typeKey, position });
      } else {
        item = new ItemClass(this.scene, { ...options, type: typeKey, position });
      }
    } else if (typeof itemOrTypeOrClass === 'function') {
      const ItemClass = itemOrTypeOrClass;
      item = new ItemClass(this.scene, { ...options, position });
    } else if (itemOrTypeOrClass instanceof CollectibleItem) {
      item = itemOrTypeOrClass;
      if (position) {
        item.onSpawn(position);
      }
    } else {
      throw new Error('ItemManager.spawnItem: invalid item, class, or type provided');
    }

    if (position && !item.root.position.equals(item.basePosition)) {
      item.onSpawn(position);
    }

    this.items.set(item.id, item);
    this.emit('item:spawned', item);

    return item;
  }

  /**
   * Removes and disposes an item.
   * @param {CollectibleItem|string} itemOrId
   */
  removeItem(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
    const item = this.items.get(id);
    if (!item) return;

    this.items.delete(id);
    item.dispose();
    this.emit('item:removed', item);
  }

  /**
   * Retrieves an item by its unique ID.
   * @param {string} id
   * @returns {CollectibleItem|null}
   */
  getItem(id) {
    return this.items.get(id) || null;
  }

  /**
   * Returns an array of all currently active items.
   * @returns {CollectibleItem[]}
   */
  getAllItems() {
    return Array.from(this.items.values());
  }

  /**
   * Returns active items matching the specified type.
   * @param {string} type
   * @returns {CollectibleItem[]}
   */
  getItemsByType(type) {
    const typeKey = type.toLowerCase();
    const result = [];
    for (const item of this.items.values()) {
      if (item.type.toLowerCase() === typeKey) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Total number of active items in space.
   * @returns {number}
   */
  getCount() {
    return this.items.size;
  }

  // =========================================================================
  // TOUCH & COLLISION DETECTION
  // =========================================================================

  /**
   * Checks collisions between all active items and the provided ship(s).
   * When an item is touched by a ship, checks `item.canCollect(ship)`, and if true,
   * triggers collection and emits events.
   *
   * @param {object|object[]} ships Single ship or array of ships
   * @returns {Array<{item: CollectibleItem, ship: object, result: object}>} Collected items this check
   */
  checkCollisions(ships) {
    if (!ships) return [];
    const shipList = Array.isArray(ships) ? ships : [ships];
    if (shipList.length === 0 || this.items.size === 0) return [];

    const collected = [];

    for (const item of this.items.values()) {
      if (item.isCollected || item.isDisposed) continue;

      _itemPos.copy(item.root.position);

      for (let i = 0; i < shipList.length; i++) {
        const ship = shipList[i];
        if (!ship || ship.isDestroyed || ship.isDead) continue;

        const shipPos = ship.root ? ship.root.position : (ship.position || null);
        if (!shipPos) continue;

        const shipRadius = typeof ship.radius === 'number' ? ship.radius : 3.0;
        const touchRadius = item.radius + shipRadius;

        _shipPos.copy(shipPos);
        const distSq = _itemPos.distanceToSquared(_shipPos);

        // Check magnetic pull
        if (item.magnetic && item.magneticRadius > 0 && distSq <= item.magneticRadius * item.magneticRadius) {
          item.attractToward(_shipPos, 0.016);
        }

        // Check physical touch
        if (distSq <= touchRadius * touchRadius) {
          if (item.canCollect(ship)) {
            const res = this.collectItem(item, ship);
            collected.push({ item, ship, result: res });
            break; // item consumed, skip remaining ships for this item
          }
        }
      }
    }

    return collected;
  }

  /**
   * Executes collection of an item by a ship.
   * Invokes `item.onCollect(ship)`, emits events, and triggers the collect animation/removal.
   *
   * @param {CollectibleItem} item
   * @param {object} ship
   * @returns {object} Payload returned by item.onCollect(ship)
   */
  collectItem(item, ship) {
    if (item.isCollected) return null;

    // Invoke abstract collect hook
    const payload = item.onCollect(ship);

    // Emit general and type-specific events
    this.emit('item:collected', { item, ship, payload });
    this.emit(`item:collected:${item.type}`, { item, ship, payload });

    // Animate and remove
    item.playCollectAnimation(ship, () => {
      this.removeItem(item);
    });

    return payload;
  }

  // =========================================================================
  // PER-FRAME UPDATE LOOP
  // =========================================================================

  /**
   * Updates all active items (bobbing, rotation, expiry) and optionally checks collisions.
   *
   * @param {number} dt Delta time in seconds
   * @param {object|object[]} [ships] Optional ship or array of ships to test touch collision against
   * @returns {Array<{item: CollectibleItem, ship: object, result: object}>}
   */
  update(dt, ships = null) {
    const toRemove = [];

    for (const item of this.items.values()) {
      if (item.isDisposed) {
        toRemove.push(item);
        continue;
      }

      const status = item.update(dt);
      if (status === 'expired') {
        toRemove.push(item);
        this.emit('item:expired', item);
      }
    }

    for (let i = 0; i < toRemove.length; i++) {
      this.removeItem(toRemove[i]);
    }

    if (ships) {
      return this.checkCollisions(ships);
    }

    return [];
  }

  // =========================================================================
  // CLEANUP & LIFECYCLE
  // =========================================================================

  /**
   * Removes and disposes all items from the world.
   */
  clear() {
    for (const item of this.items.values()) {
      item.dispose();
    }
    this.items.clear();
    this.emit('items:cleared');
  }

  /**
   * Disposes the manager and all its items.
   */
  dispose() {
    this.clear();
    this.eventListeners.clear();
    this.itemTypes.clear();
  }

  // =========================================================================
  // EVENT BUS
  // =========================================================================

  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(fn);
  }

  off(event, fn) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(fn);
    }
  }

  emit(event, ...args) {
    if (!this.eventListeners.has(event)) return;
    for (const fn of this.eventListeners.get(event)) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`ItemManager event error in listener for '${event}':`, err);
      }
    }
  }
}
