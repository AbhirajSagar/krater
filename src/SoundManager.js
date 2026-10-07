/**
 * SoundManager.js
 * High-performance, zero-asset Web Audio API sci-fi sound synthesizer.
 * Synthesizes laser shots, explosions, shield hits, alarms, engine boosts, and UI sounds
 * with zero external network downloads or audio file dependencies.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.6;
    this.muted = false;
    this.initialized = false;

    this.boostOsc = null;
    this.boostGain = null;
    this.isBoostPlaying = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Laser blaster shot sound with pitch tailored to weapon energy
   */
  playLaser(isSpecial = false) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isSpecial ? 'sawtooth' : 'sine';
    const startFreq = isSpecial ? 1100 : 880;
    const endFreq = isSpecial ? 180 : 130;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.14);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Punchy metallic armor impact
   */
  playHit() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + 0.14);

    // Crunch noise
    this.playNoiseBurst(0.08, 0.25, 400);
  }

  /**
   * High-tech resonant energy shield deflection ping
   */
  playShieldHit() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(1150, t);
    osc1.frequency.exponentialRampToValueAtTime(420, t + 0.22);
    osc2.frequency.setValueAtTime(780, t);
    osc2.frequency.exponentialRampToValueAtTime(310, t + 0.22);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.25);
    osc2.stop(t + 0.25);
  }

  /**
   * Dramatic multi-stage explosion with sub rumble and debris noise
   */
  playExplosion(intensity = 1.0) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    // 1. Deep rumble sub-bass
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.9 * intensity);

    subGain.gain.setValueAtTime(0.6 * intensity, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1 * intensity);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 1.2 * intensity);

    // 2. White noise blast through low-pass sweep
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.2 * intensity);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 1.0 * intensity);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55 * intensity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1 * intensity);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(t);
  }

  /**
   * Victorious elimination chime
   */
  playKillConfirmed() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.24);
    });
  }

  /**
   * Low health / critical alarm beep
   */
  playAlarm() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.setValueAtTime(560, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  /**
   * Target locked chirp
   */
  playLockOn() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1800, t + 0.05);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Quick UI click sound
   */
  playClick() {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playNoiseBurst(duration, gainVal, filterFreq) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(this.ctx.currentTime);
  }
}

export const sounds = new SoundManager();
