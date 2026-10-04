/**
 * Minimal Glassmorphic Loading Screen
 * Displays a clean frosted glass card with percentage and loading bar.
 */
export class LoadingScreen {
  constructor() {
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.isFinished = false;
    this.animFrameId = null;

    this.initDOM();
    this.startSmoothingLoop();
  }

  initDOM() {
    let screen = document.getElementById('loading-screen');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'loading-screen';
      screen.className = 'loading-screen';
      screen.innerHTML = `
        <div class="glass-card">
          <div class="glass-percent" id="loading-percent">0%</div>
          <div class="glass-bar-track">
            <div class="glass-bar-fill" id="loading-bar-fill"></div>
          </div>
        </div>
      `;
      document.body.prepend(screen);
    }

    this.container = screen;
    this.percentEl = document.getElementById('loading-percent');
    this.barFillEl = document.getElementById('loading-bar-fill');
  }

  /**
   * Smoothly updates progress bar and percent counter with requestAnimationFrame lerping
   */
  startSmoothingLoop() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (this.isFinished) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Lerp progress smoothly
      const speed = this.targetProgress >= 100 ? 14.0 : 9.0;
      this.currentProgress += (this.targetProgress - this.currentProgress) * Math.min(dt * speed, 0.5);

      if (Math.abs(this.targetProgress - this.currentProgress) < 0.2) {
        this.currentProgress = this.targetProgress;
      }

      const displayVal = Math.round(this.currentProgress);
      if (this.percentEl) {
        this.percentEl.textContent = `${displayVal}%`;
      }
      if (this.barFillEl) {
        this.barFillEl.style.width = `${this.currentProgress}%`;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Set target progress (0 to 100)
   * @param {number} value
   */
  setProgress(value) {
    this.targetProgress = Math.max(0, Math.min(100, value));
  }

  /**
   * Safe no-op for backward compatibility
   */
  setTelemetry() {}

  /**
   * Completes loading, marks 100%, and smoothly fades out the overlay
   * @returns {Promise<void>} Resolves when fade-out animation completes
   */
  async finish() {
    this.setProgress(100);

    // Wait until smooth interpolation reaches 100%
    while (this.currentProgress < 99.5) {
      await new Promise(r => setTimeout(r, 30));
    }
    this.currentProgress = 100;
    if (this.percentEl) this.percentEl.textContent = '100%';
    if (this.barFillEl) this.barFillEl.style.width = '100%';

    // Brief pause at 100%
    await new Promise(r => setTimeout(r, 200));

    // Smooth fade-out
    if (this.container) {
      this.container.classList.add('fade-out');
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        this.isFinished = true;
        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
        }
        if (this.container) {
          this.container.classList.add('hidden');
        }
        resolve();
      }, 600);
    });
  }
}
