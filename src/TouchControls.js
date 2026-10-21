/**
 * TouchControls.js
 * High-performance mobile touch controls for 3D space combat dogfights.
 * - Left Screen: Floating dynamic joystick for 6-DoF pitch, yaw, roll banking & propulsion throttle.
 * - Right Screen: Semi-automatic weapon fire button + Dedicated afterburner boost button + Screen-wide hold boost.
 */

export function detectTouchDevice() {
  const isTouch = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
  if (isTouch && document.body) {
    document.body.classList.add('has-touch');
  }
  return isTouch;
}

export class TouchControls {
  /**
   * @param {import('./SpaceshipController.js').SpaceshipController} spaceship
   * @param {import('./SkyboxManager.js').SkyboxManager} skyboxManager
   */
  constructor(spaceship, skyboxManager) {
    this.ship = spaceship;
    this.skyboxManager = skyboxManager;

    this.container = document.getElementById('touch-controls');
    this.zone = document.getElementById('joystick');
    this.knob = document.getElementById('joystick-knob');
    this.base = this.zone ? this.zone.querySelector('.joystick-base') : null;

    this.maxRadius = 48; // Max travel radius for knob

    // Floating dynamic joystick state
    this.joystickPointerId = null;
    this.joystickCenter = { x: 0, y: 0 };

    // Right-side screen-wide press-and-hold boost state
    this.boostPointerId = null;

    // Dedicated boost button state
    this.boostZone = document.getElementById('touch-boost-zone');
    this.boostBtn = document.getElementById('btn-touch-boost');
    this.boostBtnPointerId = null;

    // Semi-automatic shoot button state
    this.shootZone = document.getElementById('touch-shoot-zone');
    this.shootBtn = document.getElementById('btn-touch-shoot');
    this.shootPointerId = null;

    detectTouchDevice();
    this.initDOM();
    this.setupControls();

    // Auto-detect touch on any first touch event anywhere on screen
    window.addEventListener('touchstart', () => {
      detectTouchDevice();
    }, { once: true, passive: true });
  }

  initDOM() {
    if (!this.container) return;

    // Ensure Boost button exists in DOM
    if (!this.boostBtn) {
      let boostZone = document.getElementById('touch-boost-zone');
      if (!boostZone) {
        boostZone = document.createElement('div');
        boostZone.id = 'touch-boost-zone';
        boostZone.className = 'touch-boost-zone';
        this.container.appendChild(boostZone);
      }
      boostZone.innerHTML = `
        <button id="btn-touch-boost" class="touch-boost-btn" aria-label="Engage Boost" title="Hold to Boost">
          <svg class="boost-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span class="touch-btn-label boost-label">BOOST</span>
        </button>
      `;
      this.boostZone = boostZone;
      this.boostBtn = document.getElementById('btn-touch-boost');
    }

    // Ensure Shoot button exists in DOM
    if (!this.shootBtn) {
      let shootZone = document.getElementById('touch-shoot-zone');
      if (!shootZone) {
        shootZone = document.createElement('div');
        shootZone.id = 'touch-shoot-zone';
        shootZone.className = 'touch-shoot-zone';
        this.container.appendChild(shootZone);
      }
      shootZone.innerHTML = `
        <button id="btn-touch-shoot" class="touch-shoot-btn" aria-label="Fire Weapons" title="Tap to Fire">
          <div class="shoot-btn-core"></div>
          <span class="touch-btn-label fire-label">FIRE</span>
        </button>
      `;
      this.shootZone = shootZone;
      this.shootBtn = document.getElementById('btn-touch-shoot');
    }
  }

  setupControls() {
    if (!this.container || !this.zone || !this.knob || !this.base) return;

    // Screen-wide touch listeners
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    window.addEventListener('blur', () => this.resetAll());

    // Setup Shoot button listeners (strictly semi-automatic: tap to fire volley)
    if (this.shootBtn) {
      this.shootBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.shootPointerId = e.pointerId;
        this.shootBtn.classList.add('active');

        // Fire single salvo per tap
        if (this.ship && this.ship.enabled) {
          this.ship.fireWeapons();
        }
      });

      this.shootBtn.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.shootPointerId = null;
        this.shootBtn.classList.remove('active');
      });

      this.shootBtn.addEventListener('pointercancel', (e) => {
        this.shootPointerId = null;
        this.shootBtn.classList.remove('active');
      });
    }

    // Outer shoot zone tap also triggers weapon fire
    if (this.shootZone && this.shootBtn) {
      this.shootZone.addEventListener('pointerdown', (e) => {
        if (e.target !== this.shootBtn && !this.shootBtn.contains(e.target)) {
          e.stopPropagation();
          e.preventDefault();
          this.shootBtn.classList.add('active');
          if (this.ship && this.ship.enabled) {
            this.ship.fireWeapons();
          }
          setTimeout(() => {
            if (this.shootBtn) this.shootBtn.classList.remove('active');
          }, 120);
        }
      });
    }

    // Setup Dedicated Boost button listeners (hold to engage afterburners)
    if (this.boostBtn) {
      this.boostBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.boostBtnPointerId = e.pointerId;
        this.boostBtn.classList.add('active');
        this.setBoost(true);
      });

      this.boostBtn.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.boostBtnPointerId = null;
        this.boostBtn.classList.remove('active');
        this.setBoost(false);
      });

      this.boostBtn.addEventListener('pointercancel', (e) => {
        this.boostBtnPointerId = null;
        this.boostBtn.classList.remove('active');
        this.setBoost(false);
      });
    }

    // Outer boost zone tap also triggers boost
    if (this.boostZone && this.boostBtn) {
      this.boostZone.addEventListener('pointerdown', (e) => {
        if (e.target !== this.boostBtn && !this.boostBtn.contains(e.target)) {
          e.stopPropagation();
          e.preventDefault();
          this.boostBtnPointerId = e.pointerId;
          this.boostBtn.classList.add('active');
          this.setBoost(true);
        }
      });
    }
  }

  onPointerDown(e) {
    // 1. Ignore if user is interacting with options menu button, dialog, or UI cards
    if (e.target && e.target.closest && e.target.closest('#btn-options-toggle, #options-dialog, .options-dialog-backdrop, .hud-chat-card, .btn-primary, .btn-ghost')) {
      return;
    }
    if (e.clientX > window.innerWidth - 75 && e.clientY < 75) {
      return;
    }

    // 2. Ignore if pointer is on shoot or boost button (handled separately by their listeners)
    if (e.target && e.target.closest && e.target.closest('#btn-touch-shoot, #touch-shoot-zone, #btn-touch-boost, #touch-boost-zone')) {
      return;
    }

    const isLeftScreen = e.clientX < window.innerWidth * 0.5;

    if (isLeftScreen) {
      // --- LEFT SIDE: FLOATING DYNAMIC JOYSTICK ---
      if (this.joystickPointerId === null) {
        this.joystickPointerId = e.pointerId;
        this.joystickCenter = { x: e.clientX, y: e.clientY };

        // Position joystick dynamically under player's thumb
        this.zone.style.left = `${e.clientX}px`;
        this.zone.style.top = `${e.clientY}px`;
        this.knob.style.transform = 'translate(0px, 0px)';
        this.zone.classList.add('active');

        this.updateJoystick(e.clientX, e.clientY);
      }
    } else {
      // --- RIGHT SIDE (ANYWHERE EXCEPT BUTTONS): PRESS & HOLD BOOST ---
      if (this.boostPointerId === null) {
        this.boostPointerId = e.pointerId;
        this.setBoost(true);
        if (this.boostBtn) {
          this.boostBtn.classList.add('active');
        }
      }
    }
  }

  onPointerMove(e) {
    if (e.pointerId === this.joystickPointerId) {
      this.updateJoystick(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    // Release Floating Joystick
    if (e.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.zone.classList.remove('active');
      this.zone.style.left = '';
      this.zone.style.top = '';
      this.knob.style.transform = 'translate(0px, 0px)';
      if (this.ship) {
        this.ship.touchInput.yaw = 0;
        this.ship.touchInput.pitch = 0;
        this.ship.touchInput.throttle = 0;
      }
    }

    // Release Shoot Button
    if (e.pointerId === this.shootPointerId) {
      this.shootPointerId = null;
      if (this.shootBtn) {
        this.shootBtn.classList.remove('active');
      }
    }

    // Release Dedicated Boost Button
    if (e.pointerId === this.boostBtnPointerId) {
      this.boostBtnPointerId = null;
      if (this.boostBtn) {
        this.boostBtn.classList.remove('active');
      }
      this.setBoost(false);
    }

    // Release Screen-Wide Boost: immediate stop when lifting thumb
    if (e.pointerId === this.boostPointerId) {
      this.boostPointerId = null;
      if (this.boostBtn && this.boostBtnPointerId === null) {
        this.boostBtn.classList.remove('active');
      }
      this.setBoost(false);
    }
  }

  setBoost(active) {
    if (this.ship) {
      this.ship.touchInput.boost = active;
    }
  }

  updateJoystick(clientX, clientY) {
    let dx = clientX - this.joystickCenter.x;
    let dy = clientY - this.joystickCenter.y;

    const dist = Math.hypot(dx, dy);
    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }

    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;

    const nx = dx / this.maxRadius; // -1 to 1 (left to right)
    const ny = dy / this.maxRadius; // -1 to 1 (up to down)
    const deflection = Math.min(1.0, dist / this.maxRadius);

    if (this.ship) {
      // Left/Right -> Yaw & Bank (-1 to 1)
      this.ship.touchInput.yaw = -nx;

      // Up/Down -> Pitch (-1 to 1)
      // Up (ny < 0) = pitch down / dive, Down (ny > 0) = pitch up / climb
      this.ship.touchInput.pitch = -ny;

      // Throttle:
      // If pulling straight down hard (ny > 0.65 and |nx| < 0.45): Reverse / Airbrake
      if (ny > 0.65 && Math.abs(nx) < 0.45) {
        this.ship.touchInput.throttle = -0.7;
      } else if (deflection > 0.12) {
        // Pushing in any forward/steering direction engages propulsion
        this.ship.touchInput.throttle = Math.min(1.0, 0.45 + 0.55 * deflection);
      } else {
        this.ship.touchInput.throttle = 0;
      }
    }
  }

  resetAll() {
    this.joystickPointerId = null;
    if (this.zone) {
      this.zone.classList.remove('active');
      this.zone.style.left = '';
      this.zone.style.top = '';
    }
    if (this.knob) {
      this.knob.style.transform = 'translate(0px, 0px)';
    }

    this.boostPointerId = null;
    this.boostBtnPointerId = null;
    if (this.boostBtn) {
      this.boostBtn.classList.remove('active');
    }
    this.setBoost(false);

    this.shootPointerId = null;
    if (this.shootBtn) {
      this.shootBtn.classList.remove('active');
    }

    if (this.ship) {
      this.ship.touchInput.yaw = 0;
      this.ship.touchInput.pitch = 0;
      this.ship.touchInput.throttle = 0;
      this.ship.touchInput.boost = false;
    }
  }
}
