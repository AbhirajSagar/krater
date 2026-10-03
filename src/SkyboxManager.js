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
    this.loadManifest();
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
   */
  loadRandomSkybox() {
    if (this.skyboxes.length === 0) return Promise.reject(new Error('No skyboxes defined'));

    let newIndex;
    if (this.skyboxes.length === 1) {
      newIndex = 0;
    } else {
      do {
        newIndex = Math.floor(Math.random() * this.skyboxes.length);
      } while (newIndex === this.currentIndex);
    }

    return this.loadByIndex(newIndex);
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
   */
  loadById(id) {
    const idx = this.skyboxes.findIndex(s => s.id === id);
    if (idx === -1) return Promise.reject(new Error(`Skybox ${id} not found`));
    return this.loadByIndex(idx);
  }

  /**
   * Load skybox by index in list
   * @param {number} index
   */
  loadByIndex(index) {
    const skybox = this.skyboxes[index];
    if (!skybox) return Promise.reject(new Error(`Invalid skybox index ${index}`));

    this.currentIndex = index;
    this.currentSkybox = skybox;

    return new Promise((resolve, reject) => {
      if (this.cache.has(skybox.id)) {
        const texture = this.cache.get(skybox.id);
        this.applyTexture(texture, skybox);
        resolve(skybox);
        return;
      }

      this.loader.setPath(skybox.path);
      this.loader.load(
        skybox.files,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.needsUpdate = true;
          this.cache.set(skybox.id, texture);
          this.applyTexture(texture, skybox);
          resolve(skybox);
        },
        undefined,
        (err) => {
          console.error(`Failed to load skybox ${skybox.id}:`, err);
          // Graceful fallback to dark cosmic background
          this.scene.background = new THREE.Color(0x05050d);
          reject(err);
        }
      );
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
