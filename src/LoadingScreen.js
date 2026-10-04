/**
 * Minimal Glassmorphic Loading Screen
 * Displays a clean frosted glass card with percentage, loading bar,
 * and upon completion prompts the user to click anywhere to enter fullscreen and launch.
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
          <div class="loading-prompt" id="loading-prompt">CLICK ANYWHERE TO START FULLSCREEN</div>
        </div>
      `;
      document.body.prepend(screen);
    }

    this.container = screen;
    this.percentEl = document.getElementById('loading-percent');
    this.barFillEl = document.getElementById('loading-bar-fill');
    this.promptEl = document.getElementById('loading-prompt');
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
   * Cross-browser safe fullscreen request inside a user gesture
   */
  async requestFullscreenSafe() {
    try {
      const isAlreadyFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isAlreadyFull) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request was declined or bypassed:', err);
    }
  }

  /**
   * Completes loading, marks 100%, prompts user to click anywhere,
   * triggers fullscreen on user click, and smoothly fades out the overlay.
   * @returns {Promise<void>} Resolves when user clicks anywhere and fade-out completes
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
    await new Promise(r => setTimeout(r, 120));

    // Reveal "Click anywhere to start fullscreen" prompt
    if (this.container) {
      this.container.classList.add('ready');
    }
    if (this.promptEl) {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      this.promptEl.textContent = isTouch ? 'TAP ANYWHERE TO CONTINUE \n (PLAY IN LANDSCAPE MODE)' : 'CLICK ANYWHERE TO CONTINUE';
      this.promptEl.classList.add('visible');
    }

    // Wait for user gesture anywhere on screen
    await new Promise((resolve) => {
      const onUserAction = async (e) => {
        window.removeEventListener('click', onUserAction);
        window.removeEventListener('touchend', onUserAction);
        window.removeEventListener('keydown', onKeyAction);

        // Trigger fullscreen directly inside the user activation event
        await this.requestFullscreenSafe();

        resolve();
      };

      const onKeyAction = async (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          onUserAction(e);
        }
      };

      window.addEventListener('click', onUserAction, { once: true });
      window.addEventListener('touchend', onUserAction, { once: true });
      window.addEventListener('keydown', onKeyAction);
    });

    // Smooth fade-out after user gesture
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
