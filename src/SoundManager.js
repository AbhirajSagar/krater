/**
 * SoundManager.js
 * Sound effects disabled per user request.
 */
export class SoundManager {
  constructor() {
    this.volume = 0;
    this.muted = true;
    this.initialized = false;
  }

  ensureContext() {
    return false;
  }

  setVolume() {}
  setMuted() {}

  playLaser() {}
  playHit() {}
  playShieldHit() {}
  playExplosion() {}
  playKillConfirmed() {}
  playAlarm() {}
  playLockOn() {}
  playNoiseBurst() {}
  startBoost() {}
  stopBoost() {}
  playClick() {}
}

export const sounds = new SoundManager();
