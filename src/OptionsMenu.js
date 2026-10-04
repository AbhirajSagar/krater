/**
 * Minimal Glassmorphic Options Dialog
 * Handles settings dialog and browser fullscreen toggle.
 */
export class OptionsMenu {
  /**
   * @param {object} [options]
   * @param {import('./SpaceshipController.js').SpaceshipController} [options.spaceship]
   */
  constructor(options = {}) {
    this.spaceship = options.spaceship || null;
    this.isOpen = false;
    this.canControl = false;

    this.initDOM();
    this.setupListeners();
    this.updateFullscreenUI();
  }

  setSpaceship(spaceship) {
    this.spaceship = spaceship;
  }

  showToggleButton() {
    this.canControl = true;
    if (this.toggleBtn) {
      this.toggleBtn.classList.add('visible');
    }
  }

  hideToggleButton() {
    if (this.toggleBtn) {
      this.toggleBtn.classList.remove('visible');
    }
  }

  initDOM() {
    // 1. Options Toggle Gear Button (Top-Right)
    let toggleBtn = document.getElementById('btn-options-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'btn-options-toggle';
      toggleBtn.className = 'glass-icon-btn options-toggle-btn';
      toggleBtn.setAttribute('aria-label', 'Options & Settings');
      toggleBtn.setAttribute('title', 'Options (Esc / O)');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      `;
      document.body.appendChild(toggleBtn);
    }
    this.toggleBtn = toggleBtn;

    // 2. Options Dialog Backdrop & Card
    let dialogBackdrop = document.getElementById('options-dialog');
    if (!dialogBackdrop) {
      dialogBackdrop = document.createElement('div');
      dialogBackdrop.id = 'options-dialog';
      dialogBackdrop.className = 'options-dialog-backdrop hidden';
      dialogBackdrop.innerHTML = `
        <div class="glass-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div class="dialog-header">
            <span id="dialog-title" class="dialog-title">OPTIONS</span>
            <button id="btn-close-options" class="dialog-close-btn" aria-label="Close Options">×</button>
          </div>

          <div class="dialog-body">
            <!-- Fullscreen Setting Row -->
            <div class="option-row">
              <div class="option-info">
                <span class="option-label">Display Mode</span>
              </div>
              <button id="btn-fullscreen-toggle" class="glass-btn-sm" aria-label="Toggle Fullscreen">
                <svg id="icon-enter-fullscreen" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                <svg id="icon-exit-fullscreen" class="hidden" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
                <span id="label-fullscreen">Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialogBackdrop);
    }
    this.dialogBackdrop = dialogBackdrop;

    this.closeBtn = document.getElementById('btn-close-options');
    this.fullscreenBtn = document.getElementById('btn-fullscreen-toggle');
    this.iconEnterFullscreen = document.getElementById('icon-enter-fullscreen');
    this.iconExitFullscreen = document.getElementById('icon-exit-fullscreen');
    this.labelFullscreen = document.getElementById('label-fullscreen');
  }

  setupListeners() {
    this.toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Close when clicking outside the dialog card
    this.dialogBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.dialogBackdrop) {
        this.close();
      }
    });

    // Fullscreen button action
    this.fullscreenBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // Keyboard shortcut (Escape or 'O' key)
    window.addEventListener('keydown', (e) => {
      // Don't intercept if modifier keys like Ctrl/Meta are held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (this.isOpen) {
          this.close();
        } else if (this.canControl) {
          this.open();
        }
      } else if (e.code === 'KeyO') {
        if (this.canControl || this.isOpen) {
          this.toggle();
        }
      }
    });

    // Monitor browser fullscreen state changes
    const onFullscreenChange = () => this.updateFullscreenUI();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
  }

  open() {
    this.isOpen = true;
    this.dialogBackdrop?.classList.remove('hidden');
    this.updateFullscreenUI();

    // Guard spaceship controls while in options dialog
    if (this.spaceship) {
      this.spaceship.enabled = false;
    }
  }

  close() {
    this.isOpen = false;
    this.dialogBackdrop?.classList.add('hidden');

    // Restore spaceship controls only if gameplay is active
    if (this.spaceship && this.canControl) {
      this.spaceship.enabled = true;
      if (this.spaceship.keys) {
        this.spaceship.keys = {};
      }
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  async toggleFullscreen() {
    const isFull = this.isFullscreen();

    try {
      if (!isFull) {
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
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed or was dismissed:', err);
    }

    this.updateFullscreenUI();
  }

  updateFullscreenUI() {
    const isFull = this.isFullscreen();

    if (this.fullscreenBtn) {
      if (isFull) {
        this.fullscreenBtn.classList.add('active');
      } else {
        this.fullscreenBtn.classList.remove('active');
      }
    }

    if (this.iconEnterFullscreen && this.iconExitFullscreen) {
      if (isFull) {
        this.iconEnterFullscreen.classList.add('hidden');
        this.iconExitFullscreen.classList.remove('hidden');
      } else {
        this.iconEnterFullscreen.classList.remove('hidden');
        this.iconExitFullscreen.classList.add('hidden');
      }
    }

    if (this.labelFullscreen) {
      this.labelFullscreen.textContent = isFull ? 'Exit Fullscreen' : 'Fullscreen';
    }
  }
}
