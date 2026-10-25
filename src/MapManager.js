/**
 * MapManager.js
 * Centralized manager for StarSparrow arena maps.
 * Seamlessly manages skybox cubemaps, procedural asteroid field states,
 * dynamic 3D environment models, lighting atmospheres, and space dust themes.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MAPS_CONFIG, getMapById, getDefaultMap } from './mapsConfig.js';

export class MapManager {
  /**
   * @param {object} options
   * @param {THREE.Scene} options.scene
   * @param {THREE.WebGLRenderer} options.renderer
   * @param {import('./SkyboxManager.js').SkyboxManager} options.skyboxManager
   * @param {import('./AsteroidField.js').AsteroidField} [options.asteroidField]
   * @param {import('./SpaceDust.js').SpaceDust} [options.spaceDust]
   * @param {THREE.AmbientLight} [options.ambientLight]
   * @param {THREE.DirectionalLight} [options.sunLight]
   * @param {THREE.HemisphereLight} [options.hemisphereLight]
   */
  constructor(options) {
    this.scene = options.scene;
    this.renderer = options.renderer;
    this.skyboxManager = options.skyboxManager;
    this.asteroidField = options.asteroidField || null;
    this.spaceDust = options.spaceDust || null;
    this.ambientLight = options.ambientLight || null;
    this.sunLight = options.sunLight || null;
    this.hemisphereLight = options.hemisphereLight || null;

    this.maps = MAPS_CONFIG;
    this.currentMap = null;
    this.currentIndex = -1;
    this.listeners = [];

    // Group for static environment 3D props (stations, gates, wreckage)
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'MapEnvironmentProps';
    this.scene.add(this.environmentGroup);

    // Model loaders cache
    this.fbxLoader = null;
    this.gltfLoader = null;
    this.modelCache = new Map();

    // Default or stored map index
    const storedId = this.getStoredMapId();
    const initialMap = storedId ? getMapById(storedId) : getDefaultMap();
    this.currentMap = initialMap;
    this.currentIndex = this.maps.findIndex(m => m.id === initialMap.id);
  }

  getStoredMapId() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('spacegame_selected_map');
        if (val && this.maps.some(m => m.id === val)) {
          return val;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  setStoredMapId(mapId) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spacegame_selected_map', mapId);
      }
    } catch {
      // ignore
    }
  }

  getMaps() {
    return this.maps;
  }

  getCurrentMap() {
    return this.currentMap || getDefaultMap();
  }

  onMapChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  }

  notifyListeners(map) {
    for (const fn of this.listeners) {
      try {
        fn(map);
      } catch (err) {
        console.error('[MapManager] Listener error:', err);
      }
    }
  }

  getNextSequentialMapId() {
    const nextIdx = (this.currentIndex + 1) % this.maps.length;
    return this.maps[nextIdx]?.id || this.maps[0].id;
  }

  async loadNextSequentialMap(onProgress = null) {
    const nextIdx = (this.currentIndex + 1) % this.maps.length;
    return this.loadByIndex(nextIdx, onProgress);
  }

  async loadMapById(mapId, onProgress = null) {
    const idx = this.maps.findIndex(m => m.id === mapId);
    if (idx === -1) {
      return this.loadByIndex(0, onProgress);
    }
    return this.loadByIndex(idx, onProgress);
  }

  /**
   * Loads and applies an arena map by index
   * @param {number} index
   * @param {Function} [onProgress]
   */
  async loadByIndex(index, onProgress = null) {
    const map = this.maps[index] || this.maps[0];
    this.currentIndex = index;
    this.currentMap = map;
    this.setStoredMapId(map.id);

    // 1. Load Skybox
    if (this.skyboxManager && map.skybox) {
      try {
        await this.skyboxManager.loadById(map.skybox.id, onProgress);
      } catch (err) {
        console.warn(`[MapManager] Failed to load skybox ${map.skybox.id}:`, err);
      }
    }

    // 2. Configure Asteroid Field
    if (this.asteroidField) {
      if (map.asteroids && map.asteroids.enabled !== false) {
        this.asteroidField.setEnabled(true);
        this.asteroidField.reseed(map.asteroids.seed || `sector_${map.id}`, map.asteroids);
      } else {
        this.asteroidField.setEnabled(false);
      }
    }

    // 3. Load Environment 3D Models
    await this.loadEnvironmentModels(map.environmentModels);

    // 4. Update Lighting Atmosphere
    this.applyLighting(map.lighting);

    // 5. Update Space Dust Theme
    if (this.spaceDust) {
      this.spaceDust.setTheme(map.spaceDustTheme || map.skybox?.id || 'deep_space');
    }

    this.notifyListeners(map);
    return map;
  }

  /**
   * Applies lighting parameters defined in the map configuration
   * @param {object} lighting
   */
  applyLighting(lighting) {
    if (!lighting) return;

    if (this.ambientLight) {
      if (lighting.ambientColor !== undefined) {
        this.ambientLight.color.setHex(lighting.ambientColor);
      }
      if (lighting.ambientIntensity !== undefined) {
        this.ambientLight.intensity = lighting.ambientIntensity;
      }
    }

    if (this.sunLight) {
      if (lighting.directionalColor !== undefined) {
        this.sunLight.color.setHex(lighting.directionalColor);
      }
      if (lighting.directionalIntensity !== undefined) {
        this.sunLight.intensity = lighting.directionalIntensity;
      }
      if (Array.isArray(lighting.sunPosition) && lighting.sunPosition.length === 3) {
        this.sunLight.position.set(lighting.sunPosition[0], lighting.sunPosition[1], lighting.sunPosition[2]);
      }
    }

    if (this.hemisphereLight) {
      if (lighting.hemisphereSkyColor !== undefined) {
        this.hemisphereLight.color.setHex(lighting.hemisphereSkyColor);
      }
      if (lighting.hemisphereGroundColor !== undefined) {
        this.hemisphereLight.groundColor.setHex(lighting.hemisphereGroundColor);
      }
      if (lighting.hemisphereIntensity !== undefined) {
        this.hemisphereLight.intensity = lighting.hemisphereIntensity;
      }
    }
  }

  /**
   * Asynchronously loads static 3D environment props (stations, gates, wrecks)
   * @param {Array<object>} modelsList
   */
  async loadEnvironmentModels(modelsList = []) {
    // Clear previously loaded environment models
    while (this.environmentGroup.children.length > 0) {
      const child = this.environmentGroup.children[0];
      this.environmentGroup.remove(child);
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
          else node.material.dispose();
        }
      });
    }

    if (!Array.isArray(modelsList) || modelsList.length === 0) return;

    for (const mCfg of modelsList) {
      if (!mCfg || !mCfg.path) continue;

      try {
        let object = null;
        const lowerPath = mCfg.path.toLowerCase();

        if (lowerPath.endsWith('.glb') || lowerPath.endsWith('.gltf')) {
          if (!this.gltfLoader) this.gltfLoader = new GLTFLoader();
          const gltf = await this.gltfLoader.loadAsync(mCfg.path);
          object = gltf.scene;
        } else {
          // Default to FBX
          if (!this.fbxLoader) this.fbxLoader = new FBXLoader();
          object = await this.fbxLoader.loadAsync(mCfg.path);
        }

        if (object) {
          if (Array.isArray(mCfg.position) && mCfg.position.length === 3) {
            object.position.set(mCfg.position[0], mCfg.position[1], mCfg.position[2]);
          }
          if (Array.isArray(mCfg.rotation) && mCfg.rotation.length === 3) {
            object.rotation.set(mCfg.rotation[0], mCfg.rotation[1], mCfg.rotation[2]);
          }
          if (mCfg.scale !== undefined) {
            if (Array.isArray(mCfg.scale) && mCfg.scale.length === 3) {
              object.scale.set(mCfg.scale[0], mCfg.scale[1], mCfg.scale[2]);
            } else {
              object.scale.setScalar(Number(mCfg.scale) || 1.0);
            }
          }

          object.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = mCfg.castShadow !== false;
              node.receiveShadow = mCfg.receiveShadow !== false;
            }
          });

          this.environmentGroup.add(object);
        }
      } catch (err) {
        console.warn(`[MapManager] Notice: Could not load environment model "${mCfg.path}":`, err.message || err);
      }
    }
  }

  setSpaceDust(dust) {
    this.spaceDust = dust;
    if (this.spaceDust && this.currentMap) {
      this.spaceDust.setTheme(this.currentMap.spaceDustTheme || this.currentMap.skybox?.id || 'deep_space');
    }
  }

  setAsteroidField(field) {
    this.asteroidField = field;
    if (this.asteroidField && this.currentMap) {
      if (this.currentMap.asteroids && this.currentMap.asteroids.enabled !== false) {
        this.asteroidField.setEnabled(true);
        this.asteroidField.reseed(this.currentMap.asteroids.seed || `sector_${this.currentMap.id}`, this.currentMap.asteroids);
      } else {
        this.asteroidField.setEnabled(false);
      }
    }
  }
}
