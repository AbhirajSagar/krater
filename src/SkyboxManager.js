import * as THREE from 'three';

export class SkyboxManager {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.loader = new THREE.CubeTextureLoader();

    // Default list of space skyboxes located in public/skyboxes/
    this.skyboxes = [
      {
        id: 'purple_nebula',
        name: 'Purple Nebula',
        type: 'cube',
        path: '/skyboxes/purple_nebula/',
        files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
      },
      {
        id: 'blue_nebula',
        name: 'Blue Nebula',
        type: 'cube',
        path: '/skyboxes/blue_nebula/',
        files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
      },
      {
        id: 'blue_pink',
        name: 'Blue Pink Nebula',
        type: 'cube',
        path: '/skyboxes/blue_pink/',
        files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
      },
      {
        id: 'deep_space',
        name: 'Deep Space',
        type: 'cube',
        path: '/skyboxes/deep_space/',
        files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
      },
      {
        id: 'golden_galaxy',
        name: 'Golden Galaxy',
        type: 'cube',
        path: '/skyboxes/golden_galaxy/',
        files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
      }
    ];

    this.currentSkybox = null;
    this.currentIndex = -1;
    this._fallbackIndex = -1;
    this.cache = new Map();
    this.listeners = [];

    // Try loading skyboxes.json if available to discover newly added skyboxes
    this.manifestPromise = this.loadManifest();
  }

  async loadManifest() {
    try {
      const res = await fetch('/skyboxes/skyboxes.json');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          this.skyboxes = list;
        }
      }
    } catch {
      // Use built-in defaults if fetch fails
    }
  }

  /**
   * Retrieves the stored sequential skybox index from localStorage with in-memory fallback
   * @returns {number}
   */
  getStoredIndex() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('spacegame_skybox_index');
        if (val !== null) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            return parsed;
          }
        }
      }
    } catch {
      // ignore
    }
    return this._fallbackIndex;
  }

  /**
   * Saves the current sequential skybox index to localStorage with in-memory fallback
   * @param {number} index
   */
  setStoredIndex(index) {
    this._fallbackIndex = index;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spacegame_skybox_index', String(index));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Returns the next sequential skybox ID without advancing the index yet
   * @returns {string}
   */
  getNextSequentialSkyboxId() {
    const listLen = this.skyboxes.length || 5;
    const stored = this.getStoredIndex();
    const nextIdx = (stored + 1) % listLen;
    return this.skyboxes[nextIdx]?.id || 'blue_nebula';
  }

  /**
   * Load the next sequential skybox so each skybox gets its chance in order
   * @param {Function} [onProgress]
   */
  async loadNextSequentialSkybox(onProgress = null) {
    if (this.manifestPromise) {
      await this.manifestPromise;
    }
    if (this.skyboxes.length === 0) return Promise.reject(new Error('No skyboxes defined'));

    const stored = this.getStoredIndex();
    const nextIndex = (stored + 1) % this.skyboxes.length;
    this.setStoredIndex(nextIndex);

    return this.loadByIndex(nextIndex, onProgress);
  }

  /**
   * Sequential environment loader replacing legacy random selector
   * @param {Function} [onProgress]
   */
  async loadRandomSkybox(onProgress = null) {
    return this.loadNextSequentialSkybox(onProgress);
  }

  /**
   * Cycle to next skybox sequentially
   */
  nextSkybox() {
    return this.loadNextSequentialSkybox();
  }

  /**
   * Load skybox by ID
   * @param {string} id
   * @param {Function} [onProgress]
   */
  loadById(id, onProgress = null) {
    const idx = this.skyboxes.findIndex(s => s.id === id);
    if (idx === -1) return Promise.reject(new Error(`Skybox ${id} not found`));
    this.setStoredIndex(idx);
    return this.loadByIndex(idx, onProgress);
  }

  /**
   * General skybox loader alias for convenience
   * @param {string|number} idOrIndex
   * @param {Function} [onProgress]
   */
  loadSkybox(idOrIndex, onProgress = null) {
    if (typeof idOrIndex === 'number') {
      return this.loadByIndex(idOrIndex, onProgress);
    }
    return this.loadById(idOrIndex, onProgress);
  }

  /**
   * Load skybox by index in list with fine-grained face progress tracking
   * @param {number} index
   * @param {Function} [onProgress]
   */
  loadByIndex(index, onProgress = null) {
    const skybox = this.skyboxes[index];
    if (!skybox) return Promise.reject(new Error(`Invalid skybox index ${index}`));

    // If this skybox is already actively applied to the scene, return immediately
    if (this.currentSkybox && this.currentSkybox.id === skybox.id && this.scene.background) {
      this.currentIndex = index;
      if (onProgress) {
        onProgress({ loaded: 6, total: 6, face: 'active', skybox });
      }
      return Promise.resolve(skybox);
    }

    this.currentIndex = index;
    this.currentSkybox = skybox;

    return new Promise((resolve, reject) => {
      if (this.cache.has(skybox.id)) {
        const texture = this.cache.get(skybox.id);
        this.applyTexture(texture, skybox);
        if (onProgress) {
          onProgress({ loaded: 6, total: 6, face: 'cached', skybox });
        }
        resolve(skybox);
        return;
      }

      const files = skybox.files || ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];
      const texture = new THREE.CubeTexture();
      texture.colorSpace = THREE.SRGBColorSpace;
      const imgLoader = new THREE.ImageLoader();
      imgLoader.setPath(skybox.path);

      let loaded = 0;
      let hasError = false;

      files.forEach((file, faceIdx) => {
        imgLoader.load(
          file,
          (image) => {
            if (hasError) return;
            texture.images[faceIdx] = image;
            loaded++;

            if (onProgress) {
              try {
                onProgress({ loaded, total: files.length, face: file, faceIndex: faceIdx, skybox });
              } catch (e) {
                console.error('Error in skybox onProgress:', e);
              }
            }

            if (loaded === files.length) {
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = true;
              texture.needsUpdate = true;
              this.cache.set(skybox.id, texture);
              this.applyTexture(texture, skybox);
              resolve(skybox);
            }
          },
          undefined,
          (err) => {
            if (!hasError) {
              hasError = true;
              console.error(`Failed to load skybox face ${file} in ${skybox.id}:`, err);
              this.scene.background = new THREE.Color(0x05050d);
              reject(err);
            }
          }
        );
      });
    });
  }

  applyTexture(texture, skybox) {
    this.scene.background = texture;
    this.scene.environment = texture;
    this.notifyListeners(skybox);
  }

  getCurrentSkybox() {
    return this.currentSkybox;
  }

  getSkyboxes() {
    return this.skyboxes;
  }

  onSkyboxChange(fn) {
    this.listeners.push(fn);
  }

  notifyListeners(skybox) {
    for (const fn of this.listeners) {
      try {
        fn(skybox);
      } catch (e) {
        console.error('Error in skybox listener:', e);
      }
    }
  }
}
