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
   * Pick and load a random skybox
   * @param {Function} [onProgress]
   */
  async loadRandomSkybox(onProgress = null) {
    if (this.manifestPromise) {
      await this.manifestPromise;
    }
    if (this.skyboxes.length === 0) return Promise.reject(new Error('No skyboxes defined'));

    let newIndex;
    if (this.skyboxes.length === 1) {
      newIndex = 0;
    } else {
      do {
        newIndex = Math.floor(Math.random() * this.skyboxes.length);
      } while (newIndex === this.currentIndex);
    }

    return this.loadByIndex(newIndex, onProgress);
  }

  /**
   * Cycle to next skybox
   */
  nextSkybox() {
    const nextIdx = (this.currentIndex + 1) % this.skyboxes.length;
    return this.loadByIndex(nextIdx);
  }

  /**
   * Load skybox by ID
   * @param {string} id
   * @param {Function} [onProgress]
   */
  loadById(id, onProgress = null) {
    const idx = this.skyboxes.findIndex(s => s.id === id);
    if (idx === -1) return Promise.reject(new Error(`Skybox ${id} not found`));
    return this.loadByIndex(idx, onProgress);
  }

  /**
   * Load skybox by index in list with fine-grained face progress tracking
   * @param {number} index
   * @param {Function} [onProgress]
   */
  loadByIndex(index, onProgress = null) {
    const skybox = this.skyboxes[index];
    if (!skybox) return Promise.reject(new Error(`Invalid skybox index ${index}`));

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
