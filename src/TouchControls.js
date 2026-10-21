/**
 * TouchControls.js
 * Minimalist mobile touch controls for space combat.
 * - Left Screen: Minimal floating dynamic joystick (pitch, yaw, roll banking, throttle)
 * - Right Screen: Tap minimal circle to fire lasers; press & hold anywhere on right side to boost.
 * - Strictly active only on verified touch/mobile devices.
 */

export function isTouchOrMobileDevice() {
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobileUA || (hasTouch && isCoarse);
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

    this.maxRadius = 45; // Max travel radius for knob

    // Floating dynamic joystick state
    this.joystickPointerId = null;
    this.joystickCenter = { x: 0, y: 0 };

    // Right-side press-and-hold boost state
    this.boostPointerId = null;

    // Semi-automatic minimal shoot button
    this.shootZone = document.getElementById('touch-shoot-zone');
    this.shootBtn = document.getElementById('btn-touch-shoot');
    this.shootPointerId = null;

    if (isTouchOrMobileDevice() && document.body) {
      document.body.classList.add('touch-device');
    }

    // Mark as touch device on actual first touch event
    window.addEventListener('touchstart', () => {
      if (document.body) {
        document.body.classList.add('touch-device');
      }
    }, { passive: true, once: true });

    this.initDOM();
    this.setupControls();
  }

  initDOM() {
    if (!this.container) return;

    // Ensure minimal shoot button exists
    if (!this.shootBtn) {
      let shootZone = document.getElementById('touch-shoot-zone');
      if (!shootZone) {
        shootZone = document.createElement('div');
        shootZone.id = 'touch-shoot-zone';
        shootZone.className = 'touch-shoot-zone';
        this.container.appendChild(shootZone);
      }
      shootZone.innerHTML = `
        <button id="btn-touch-shoot" class="touch-shoot-btn" aria-label="Fire Weapons"></button>
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

    // Minimal Shoot button: tap to fire salvo
    if (this.shootBtn) {
      this.shootBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.shootPointerId = e.pointerId;
        this.shootBtn.classList.add('active');

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

    // Outer shoot zone tap triggers fire
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
          }, 100);
        }
      });
    }
  }

  onPointerDown(e) {
    // Ignore UI button interactions (options menu, dialog, etc.)
    if (e.target && e.target.closest && e.target.closest('#btn-options-toggle, #options-dialog, .options-dialog-backdrop, .hud-chat-card, .btn-primary, .btn-ghost')) {
      return;
    }
    if (e.clientX > window.innerWidth - 75 && e.clientY < 75) {
      return;
    }

    // Ignore if tapping the shoot button (handled by shoot button listener)
    if (e.target && e.target.closest && e.target.closest('#btn-touch-shoot, #touch-shoot-zone')) {
      return;
    }

    const isLeftScreen = e.clientX < window.innerWidth * 0.5;

    if (isLeftScreen) {
      // --- LEFT SIDE: FLOATING DYNAMIC JOYSTICK ---
      if (this.joystickPointerId === null) {
        this.joystickPointerId = e.pointerId;
        this.joystickCenter = { x: e.clientX, y: e.clientY };

        this.zone.style.left = `${e.clientX}px`;
        this.zone.style.top = `${e.clientY}px`;
        this.knob.style.transform = 'translate(0px, 0px)';
        this.zone.classList.add('active');

        this.updateJoystick(e.clientX, e.clientY);
      }
    } else {
      // --- RIGHT SIDE (ANYWHERE EXCEPT SHOOT BUTTON): PRESS & HOLD BOOST ---
      if (this.boostPointerId === null) {
        this.boostPointerId = e.pointerId;
        this.setBoost(true);
      }
    }
  }

  onPointerMove(e) {
    if (e.pointerId === this.joystickPointerId) {
      this.updateJoystick(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    // Release Joystick
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

    // Release Right-Side Screen Boost: immediate stop when lifting thumb
    if (e.pointerId === this.boostPointerId) {
      this.boostPointerId = null;
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
      this.ship.touchInput.pitch = -ny;

      // Throttle:
      if (ny > 0.65 && Math.abs(nx) < 0.45) {
        this.ship.touchInput.throttle = -0.7;
      } else if (deflection > 0.12) {
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
