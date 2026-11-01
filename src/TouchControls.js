/**
 * TouchControls.js
 * Minimalist mobile touch controls for space combat:
 * - Left Screen: Floating dynamic joystick with double-tap & hold to boost.
 * - Right Screen: Tap or hold anywhere on the right side to fire lasers.
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

    // Left-side double-tap and hold to boost state
    this.lastLeftTapTime = 0;
    this.lastLeftTapPos = { x: 0, y: 0 };
    this.isBoostHolding = false;

    // Right-side weapons firing state (tap or hold anywhere on right side)
    this.shootZone = document.getElementById('touch-shoot-zone');
    this.shootBtn = document.getElementById('btn-touch-shoot');
    this.shootPointerId = null;
    this.shootInterval = null;

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

    // Explicit shoot button tap/hold listener for direct interaction
    if (this.shootBtn) {
      this.shootBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startShooting(e.pointerId);
      });

      this.shootBtn.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.stopShooting(e.pointerId);
      });

      this.shootBtn.addEventListener('pointercancel', (e) => {
        this.stopShooting(e.pointerId);
      });
    }

    // Outer shoot zone tap triggers fire
    if (this.shootZone && this.shootBtn) {
      this.shootZone.addEventListener('pointerdown', (e) => {
        if (e.target !== this.shootBtn && !this.shootBtn.contains(e.target)) {
          e.stopPropagation();
          e.preventDefault();
          this.startShooting(e.pointerId);
        }
      });
    }
  }

  onPointerDown(e) {
    // Ignore UI button interactions (options menu, dialog, etc.)
    if (e.target && e.target.closest && e.target.closest('#btn-options-toggle, #options-dialog, .options-dialog-backdrop, .hud-chat-card, .btn-primary, .btn-ghost')) {
      return;
    }
    // Top-right corner settings icon guard
    if (e.clientX > window.innerWidth - 75 && e.clientY < 75) {
      return;
    }

    const isLeftScreen = e.clientX < window.innerWidth * 0.5;

    if (isLeftScreen) {
      // --- LEFT SIDE: FLOATING DYNAMIC JOYSTICK & DOUBLE-TAP BOOST ---
      const now = performance.now();
      const timeSinceLastTap = now - this.lastLeftTapTime;
      const distFromLastTap = Math.hypot(e.clientX - this.lastLeftTapPos.x, e.clientY - this.lastLeftTapPos.y);

      // Double-tap threshold: within 350ms and within 120px
      const isDoubleTap = timeSinceLastTap < 350 && distFromLastTap < 120;

      if (isDoubleTap) {
        this.isBoostHolding = true;
        this.setBoost(true);
        if (this.ship) {
          this.ship.touchInput.throttle = 1.0;
        }
      } else {
        this.isBoostHolding = false;
        this.setBoost(false);
      }

      if (this.joystickPointerId === null) {
        this.joystickPointerId = e.pointerId;
        this.joystickCenter = { x: e.clientX, y: e.clientY };

        this.zone.style.left = `${e.clientX}px`;
        this.zone.style.top = `${e.clientY}px`;
        this.knob.style.transform = 'translate(0px, 0px)';
        this.zone.classList.add('active');

        if (this.isBoostHolding) {
          this.zone.classList.add('boosting');
        } else {
          this.zone.classList.remove('boosting');
        }

        this.updateJoystick(e.clientX, e.clientY);
      }
    } else {
      // --- RIGHT SIDE: SHOOT WEAPONS (TAP OR HOLD ANYWHERE ON RIGHT HALF) ---
      this.startShooting(e.pointerId);
    }
  }

  onPointerMove(e) {
    if (e.pointerId === this.joystickPointerId) {
      this.updateJoystick(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    // Release Joystick & Left-Side Boost
    if (e.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.zone.classList.remove('active');
      this.zone.classList.remove('boosting');
      this.zone.style.left = '';
      this.zone.style.top = '';
      this.knob.style.transform = 'translate(0px, 0px)';
      if (this.ship) {
        this.ship.touchInput.yaw = 0;
        this.ship.touchInput.pitch = 0;
        this.ship.touchInput.throttle = 0;
      }

      if (this.isBoostHolding) {
        this.isBoostHolding = false;
        this.setBoost(false);
        this.lastLeftTapTime = 0;
      } else {
        this.lastLeftTapTime = performance.now();
        this.lastLeftTapPos = { x: e.clientX, y: e.clientY };
      }
    }

    // Release Shooting on right side
    if (e.pointerId === this.shootPointerId) {
      this.stopShooting(e.pointerId);
    }
  }

  startShooting(pointerId) {
    this.shootPointerId = pointerId;
    if (this.shootBtn) {
      this.shootBtn.classList.add('active');
    }

    if (this.ship && this.ship.enabled) {
      this.ship.fireWeapons();
    }

    if (this.shootInterval) {
      clearInterval(this.shootInterval);
    }

    this.shootInterval = setInterval(() => {
      if (this.ship && this.ship.enabled && this.shootPointerId !== null) {
        this.ship.fireWeapons();
      } else {
        this.stopShooting(this.shootPointerId);
      }
    }, 110);
  }

  stopShooting(pointerId = null) {
    if (pointerId === null || pointerId === this.shootPointerId) {
      this.shootPointerId = null;
      if (this.shootInterval) {
        clearInterval(this.shootInterval);
        this.shootInterval = null;
      }
      if (this.shootBtn) {
        this.shootBtn.classList.remove('active');
      }
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
      if (this.isBoostHolding) {
        // While double-tap holding to boost, default to full forward thrust unless pulling hard down to brake
        if (ny > 0.7 && Math.abs(nx) < 0.45) {
          this.ship.touchInput.throttle = -0.7;
        } else {
          this.ship.touchInput.throttle = 1.0;
        }
      } else if (ny > 0.65 && Math.abs(nx) < 0.45) {
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
    this.isBoostHolding = false;
    this.lastLeftTapTime = 0;
    if (this.zone) {
      this.zone.classList.remove('active');
      this.zone.classList.remove('boosting');
      this.zone.style.left = '';
      this.zone.style.top = '';
    }
    if (this.knob) {
      this.knob.style.transform = 'translate(0px, 0px)';
    }

    this.stopShooting();

    if (this.ship) {
      this.ship.touchInput.yaw = 0;
      this.ship.touchInput.pitch = 0;
      this.ship.touchInput.throttle = 0;
      this.ship.touchInput.boost = false;
    }
  }
}
