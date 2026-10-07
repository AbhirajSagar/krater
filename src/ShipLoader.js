/**
 * ShipLoader.js
 * Centralized async loader and memory cache for StarSparrow 3D fleet models and PBR materials.
 * Enables instant cloning and sharing of geometries and textures between local and remote spaceships.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { createStarSparrowMaterial } from './StarSparrowMaterial.js';
import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';

class ShipLoaderManager {
  constructor() {
    this.loader = new FBXLoader();
    this.cache = new Map();
    this.pendingPromises = new Map();
  }

  /**
   * Preload or fetch a StarSparrow ship model and material
   * @param {number|string} indexOrId
   * @param {Function} [onProgress]
   * @returns {Promise<{ createInstance: () => THREE.Group, config: object, material: THREE.Material }>}
   */
  async getShipTemplate(indexOrId, onProgress = null) {
    let config = null;
    if (typeof indexOrId === 'number') {
      config = SPACESHIP_CONFIGS[indexOrId] || SPACESHIP_CONFIGS[0];
    } else {
      config = SPACESHIP_CONFIGS.find(c => c.id === indexOrId) || SPACESHIP_CONFIGS[0];
    }

    if (this.cache.has(config.id)) {
      return this.cache.get(config.id);
    }

    if (this.pendingPromises.has(config.id)) {
      return this.pendingPromises.get(config.id);
    }

    const promise = (async () => {
      if (onProgress) onProgress({ phase: 'model_start', shipName: config.name });

      const fbx = await this.loader.loadAsync(config.model);
      if (onProgress) onProgress({ phase: 'model_loaded', shipName: config.name });

      // Normalize size and center
      const initialBox = new THREE.Box3().setFromObject(fbx);
      const size = new THREE.Vector3();
      initialBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = (config.scale || 4.0) / maxDim;

      fbx.scale.setScalar(scale);
      fbx.rotation.y = Math.PI; // Face forward along -Z

      const container = new THREE.Group();
      container.add(fbx);
      container.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(fbx);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      fbx.position.sub(center);
      container.updateMatrixWorld(true);

      // Create PBR Shader Material
      const material = createStarSparrowMaterial(config, {
        onProgress: (texProgress) => {
          if (onProgress) onProgress({ phase: 'texture', shipName: config.name, ...texProgress });
        }
      });

      if (material.texturesReadyPromise) {
        await material.texturesReadyPromise;
      }

      fbx.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = material;
        }
      });

      const entry = {
        config,
        material,
        createInstance: () => {
          const clone = container.clone(true);
          clone.traverse((child) => {
            if (child.isMesh) {
              child.material = material;
            }
          });
          return clone;
        }
      };

      this.cache.set(config.id, entry);
      this.pendingPromises.delete(config.id);
      return entry;
    })();

    this.pendingPromises.set(config.id, promise);
    return promise;
  }
}

export const shipLoader = new ShipLoaderManager();
