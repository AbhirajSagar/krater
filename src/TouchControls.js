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

    this.joystickPointerId = null;
    this.joystickCenter = { x: 0, y: 0 };

    // Double-tap and hold to boost tracking
    this.lastTapTime = 0;
    this.lastTapPos = { x: 0, y: 0 };
    this.boostPointerId = null;

    this.setupControls();
  }

  setupControls() {
    if (!this.container || !this.zone || !this.knob || !this.base) return;

    // Listen on the full container so double-tap works anywhere on touch screens
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e) {
    const now = performance.now();
    const elapsed = now - this.lastTapTime;
    const distFromLastTap = Math.hypot(e.clientX - this.lastTapPos.x, e.clientY - this.lastTapPos.y);

    // Double-tap detection: second tap within 350ms
    if (elapsed > 40 && elapsed < 350 && distFromLastTap < 120) {
      // Engaged double-tap and hold boost!
      this.boostPointerId = e.pointerId;
      this.ship.touchInput.boost = true;
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapPos = { x: e.clientX, y: e.clientY };
    }

    // Check if touching joystick zone or bottom-left region
    const rect = this.base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distToJoystick = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    // If within or near joystick area (within 90px of center)
    if (this.joystickPointerId === null && (distToJoystick < 95 || e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.5)) {
      this.joystickPointerId = e.pointerId;
      this.joystickCenter = { x: centerX, y: centerY };
      this.updateJoystick(e.clientX, e.clientY);
    }
  }

  onPointerMove(e) {
    if (e.pointerId === this.joystickPointerId) {
      this.updateJoystick(e.clientX, e.clientY);
    }
  }

  onPointerUp(e) {
    // Release boost if this was the boost pointer
    if (e.pointerId === this.boostPointerId) {
      this.boostPointerId = null;
      this.ship.touchInput.boost = false;
    }

    // Release joystick if this was the joystick pointer
    if (e.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.knob.style.transform = 'translate(0px, 0px)';
      this.ship.touchInput.yaw = 0;
      this.ship.touchInput.pitch = 0;
      this.ship.touchInput.throttle = 0;
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

    // Left/Right -> Yaw & Bank (-1 to 1)
    this.ship.touchInput.yaw = -nx;

    // Up/Down -> Pitch (-1 to 1)
    // Up (ny < 0) = pitch down / dive, Down (ny > 0) = pitch up / climb
    this.ship.touchInput.pitch = -ny;

    // Movement / Throttle:
    // If pulling straight down hard (ny > 0.65 and |nx| < 0.45): Reverse / Airbrake
    if (ny > 0.65 && Math.abs(nx) < 0.45) {
      this.ship.touchInput.throttle = -0.7;
    } else if (deflection > 0.12) {
      // Pushing in any forward/steering direction engages forward propulsion
      this.ship.touchInput.throttle = Math.min(1.0, 0.4 + 0.6 * deflection);
    } else {
      this.ship.touchInput.throttle = 0;
    }
  }
}
