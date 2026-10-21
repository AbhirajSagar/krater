/**
 * DevStatsHUD.js
 * Minimal Glassmorphic Developer Telemetry ("Stats for Nerds") HUD
 * Displays real-time rendering statistics: FPS, frame time, polygons (triangles),
 * draw calls, geometries, textures, compiled shaders, resolution, heap & ping.
 */

export class DevStatsHUD {
  /**
   * @param {object} options
   * @param {import('three').WebGLRenderer} options.renderer
   * @param {import('three').Scene} [options.scene]
   * @param {import('three').Camera} [options.camera]
   * @param {Function} [options.getClient] Function returning active MultiplayerClient instance
   */
  constructor(options = {}) {
    this.renderer = options.renderer || null;
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.getClient = options.getClient || null;

    this.visible = false;
    this.frameCount = 0;
    this.timeAccumulator = 0;

    this.initDOM();
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  initDOM() {
    let container = document.getElementById('dev-stats-hud');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dev-stats-hud';
      container.className = 'dev-stats-hud hidden';
      container.setAttribute('aria-label', 'Developer Telemetry Stats');

      container.innerHTML = `
        <div class="dev-stats-header">
          <span class="dev-stats-badge">STATS FOR NERDS</span>
          <span class="dev-stats-fps-wrap">
            <span class="dev-stats-dot good" id="dev-stat-dot"></span>
            <span id="dev-stat-fps" class="dev-stat-val-fps">-- FPS</span>
            <span id="dev-stat-ms" class="dev-stat-ms">-- ms</span>
          </span>
        </div>
        <div class="dev-stats-grid">
          <div class="dev-stat-item">
            <span class="dev-stat-label">POLYGONS</span>
            <span id="dev-stat-triangles" class="dev-stat-val">0</span>
          </div>
          <div class="dev-stat-item">
            <span class="dev-stat-label">DRAW CALLS</span>
            <span id="dev-stat-calls" class="dev-stat-val">0</span>
          </div>
          <div class="dev-stat-item">
            <span class="dev-stat-label">GEOMETRIES</span>
            <span id="dev-stat-geometries" class="dev-stat-val">0</span>
          </div>
          <div class="dev-stat-item">
            <span class="dev-stat-label">TEXTURES</span>
            <span id="dev-stat-textures" class="dev-stat-val">0</span>
          </div>
          <div class="dev-stat-item">
            <span class="dev-stat-label">SHADERS</span>
            <span id="dev-stat-shaders" class="dev-stat-val">0</span>
          </div>
          <div class="dev-stat-item">
            <span class="dev-stat-label">VIEWPORT</span>
            <span id="dev-stat-resolution" class="dev-stat-val">0×0</span>
          </div>
          <div class="dev-stat-item" id="dev-stat-memory-row">
            <span class="dev-stat-label" id="dev-stat-memory-label">JS HEAP</span>
            <span id="dev-stat-memory" class="dev-stat-val">-</span>
          </div>
          <div class="dev-stat-item" id="dev-stat-ping-row">
            <span class="dev-stat-label">NET PING</span>
            <span id="dev-stat-ping" class="dev-stat-val">-</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    this.container = container;
    this.elDot = document.getElementById('dev-stat-dot');
    this.elFps = document.getElementById('dev-stat-fps');
    this.elMs = document.getElementById('dev-stat-ms');
    this.elTriangles = document.getElementById('dev-stat-triangles');
    this.elCalls = document.getElementById('dev-stat-calls');
    this.elGeometries = document.getElementById('dev-stat-geometries');
    this.elTextures = document.getElementById('dev-stat-textures');
    this.elShaders = document.getElementById('dev-stat-shaders');
    this.elResolution = document.getElementById('dev-stat-resolution');
    this.elMemoryLabel = document.getElementById('dev-stat-memory-label');
    this.elMemory = document.getElementById('dev-stat-memory');
    this.elPing = document.getElementById('dev-stat-ping');
  }

  setVisible(visible) {
    this.visible = !!visible;
    if (this.container) {
      if (this.visible) {
        this.container.classList.remove('hidden');
        this.frameCount = 0;
        this.timeAccumulator = 1; // trigger immediate update
      } else {
        this.container.classList.add('hidden');
      }
    }
  }

  countSceneMeshes() {
    if (!this.scene) return 0;
    let count = 0;
    this.scene.traverse((obj) => {
      if (obj.isMesh) count++;
    });
    return count;
  }

  update(dt) {
    if (!this.visible) return;

    this.frameCount++;
    this.timeAccumulator += dt;

    // Refresh telemetry ~4 times a second (every 250ms) for smooth, non-flickering readout
    if (this.timeAccumulator >= 0.25) {
      const fps = Math.max(1, Math.round(this.frameCount / this.timeAccumulator));
      const ms = ((this.timeAccumulator / this.frameCount) * 1000).toFixed(1);
      this.frameCount = 0;
      this.timeAccumulator = 0;

      if (this.elFps) this.elFps.textContent = `${fps} FPS`;
      if (this.elMs) this.elMs.textContent = `${ms} ms`;

      if (this.elDot) {
        if (fps >= 55) {
          this.elDot.className = 'dev-stats-dot good';
        } else if (fps >= 30) {
          this.elDot.className = 'dev-stats-dot ok';
        } else {
          this.elDot.className = 'dev-stats-dot bad';
        }
      }

      const info = this.renderer?.info;
      if (info) {
        if (this.elTriangles) {
          this.elTriangles.textContent = (info.render?.triangles ?? 0).toLocaleString();
        }
        if (this.elCalls) {
          this.elCalls.textContent = (info.render?.calls ?? 0).toLocaleString();
        }
        if (this.elGeometries) {
          this.elGeometries.textContent = (info.memory?.geometries ?? 0).toLocaleString();
        }
        if (this.elTextures) {
          this.elTextures.textContent = (info.memory?.textures ?? 0).toLocaleString();
        }
        if (this.elShaders) {
          this.elShaders.textContent = (info.programs?.length ?? 0).toLocaleString();
        }
      }

      if (this.elResolution) {
        const dpr = this.renderer ? this.renderer.getPixelRatio() : 1;
        this.elResolution.textContent = `${window.innerWidth}×${window.innerHeight}${dpr !== 1 ? ` (${dpr}x)` : ''}`;
      }

      if (this.elMemory) {
        if (typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize) {
          const mb = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
          this.elMemory.textContent = `${mb} MB`;
          if (this.elMemoryLabel) this.elMemoryLabel.textContent = 'JS HEAP';
        } else {
          const count = this.countSceneMeshes();
          this.elMemory.textContent = String(count);
          if (this.elMemoryLabel) this.elMemoryLabel.textContent = 'OBJECTS';
        }
      }

      if (this.elPing) {
        const client = this.getClient ? this.getClient() : null;
        if (client && client.isConnected) {
          this.elPing.textContent = `${client.pingMs ?? 0} ms`;
        } else {
          this.elPing.textContent = 'Offline';
        }
      }
    }
  }
}
