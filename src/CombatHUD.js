/**
 * CombatHUD.js
 * Minimalist, monochromatic tactical HUD for multiplayer space combat.
 * Uses neutral glassmorphism (black, white, translucent grays),
 * clean Lucide-style vector line icons, and subtle typography.
 */

import * as THREE from 'three';
import { sounds } from './SoundManager.js';
import { Icons } from './Icons.js';

const _radarForward = new THREE.Vector3();

export class CombatHUD {
  /**
   * @param {object} options
   */
  constructor(options = {}) {
    this.onSendChat = options.onSendChat || null;
    this.onRespawnRequest = options.onRespawnRequest || null;
    this.onLeaveMatch = options.onLeaveMatch || null;

    this.localPlayerState = {
      callsign: 'Pilot',
      shield: 100,
      maxShield: 100,
      hull: 100,
      maxHull: 100,
      speed: 0,
      boostEnergy: 100,
      maxBoostEnergy: 100,
      isBoosting: false,
      kills: 0,
      deaths: 0,
      score: 0,
      ping: 0,
    };

    this.isChatOpen = false;
    this.isScoreboardOpen = false;
    this.isDestroyed = false;
    this.respawnTimer = 0;
    this._activePlayerIds = new Set();

    this._scratchVec = new THREE.Vector3();
    this._screenVec = new THREE.Vector3();
    this._camSpaceVec = new THREE.Vector3();
    this._leadScratchVec = new THREE.Vector3();
    this._leadScreenVec = new THREE.Vector3();
    this._leadCamSpaceVec = new THREE.Vector3();

    // Directional damage hitmarkers state
    this.damageIndicators = [];
    this._nextDamageId = 1;
    this.lastCamera = null;
    this.lastShipPos = new THREE.Vector3();
    this.remotePlayersManager = null;
    this.enemyManager = null;
    this._threatVec = new THREE.Vector3();
    this._threatLocal = new THREE.Vector3();
    this._camInvQuat = new THREE.Quaternion();

    this.initDOM();
    this.setupListeners();
  }

  initDOM() {
    let container = document.getElementById('combat-hud-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'combat-hud-root';
      container.className = 'combat-hud-root';
      document.body.appendChild(container);
    }
    this.container = container;

    this.container.innerHTML = `
      <!-- HITMARKER OVERLAY (OUTGOING SHOT HIT) -->
      <div class="hud-hitmarker hidden" id="hud-hitmarker">
        <div class="hit-slash hit-slash-1"></div>
        <div class="hit-slash hit-slash-2"></div>
      </div>

      <!-- DIRECTIONAL DAMAGE HITMARKERS (INCOMING DAMAGE BEARING ARCS) -->
      <div class="hud-damage-indicators-container" id="hud-damage-indicators"></div>

      <!-- IN-VIEW ENEMY TARGET MARKERS -->
      <div class="hud-world-targets" id="hud-world-targets"></div>

      <!-- OFF-SCREEN ENEMY DIRECTIONAL ARROWS -->
      <div class="hud-offscreen-indicators" id="hud-offscreen-indicators"></div>

      <!-- SUPER MINIMAL TRANSPARENT MINIMAP -->
      <div class="hud-radar-card" id="hud-radar-card">
        <canvas id="hud-radar-canvas" width="110" height="110" class="radar-canvas"></canvas>
      </div>

      <!-- DESTRUCTION & RESPAWN OVERLAY -->
      <div class="hud-respawn-backdrop hidden" id="hud-respawn-overlay">
        <div class="respawn-glass-card">
          <div class="respawn-badge">VESSEL COMPROMISED</div>
          <div class="respawn-title-clean">CRITICAL DAMAGE</div>
          <div class="respawn-killer-clean" id="hud-killer-text">Eliminated by enemy laser fire</div>
          <div class="respawn-timer-wrap">
            <span class="respawn-digits" id="hud-respawn-countdown">5</span>
            <span class="respawn-seconds-label">seconds to auto-respawn</span>
          </div>
          <div class="respawn-actions-row">
            <button id="btn-manual-respawn" class="btn-primary-solid" type="button">Respawn Now</button>
            <button id="btn-respawn-leave" class="btn-secondary-outline" type="button">Return to Menu</button>
          </div>
        </div>
      </div>
    `;

    // Elements
    this.hitmarkerEl = document.getElementById('hud-hitmarker');
    this.damageContainer = document.getElementById('hud-damage-indicators');
    this.inViewContainer = document.getElementById('hud-world-targets');
    this.targetBracketsMap = new Map();
    this.leadPipsMap = new Map();
    this.offscreenArrowsMap = new Map();

    this.offscreenContainer = document.getElementById('hud-offscreen-indicators');
    this.radarCanvas = document.getElementById('hud-radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.respawnOverlayEl = document.getElementById('hud-respawn-overlay');
    this.killerTextEl = document.getElementById('hud-killer-text');
    this.respawnCountdownEl = document.getElementById('hud-respawn-countdown');
    this.manualRespawnBtn = document.getElementById('btn-manual-respawn');
    this.respawnLeaveBtn = document.getElementById('btn-respawn-leave');

    this._hitmarkerTimer = null;
  }

  setupListeners() {
    this.manualRespawnBtn?.addEventListener('click', () => {
      if (this.onRespawnRequest) {
        this.onRespawnRequest();
      }
    });

    this.respawnLeaveBtn?.addEventListener('click', () => {
      this.hideDestroyedOverlay();
      if (this.onLeaveMatch) {
        this.onLeaveMatch();
      }
    });
  }

  show() {
    this.container.classList.add('visible');
  }

  hide() {
    this.container.classList.remove('visible');
    this.clearTargets();
  }

  clearTargets() {
    if (this.targetBracketsMap) {
      for (const b of this.targetBracketsMap.values()) b.el.remove();
      this.targetBracketsMap.clear();
    }
    if (this.leadPipsMap) {
      for (const lp of this.leadPipsMap.values()) lp.el.remove();
      this.leadPipsMap.clear();
    }
    if (this.offscreenArrowsMap) {
      for (const a of this.offscreenArrowsMap.values()) a.el.remove();
      this.offscreenArrowsMap.clear();
    }
    this.clearDamageIndicators();
  }

  setRoomInfo(roomCode) {
    if (this.roomCodeEl) this.roomCodeEl.textContent = roomCode ? `#${roomCode}` : 'Singleplayer';
  }

  setPing(ms) {
    if (this.pingValEl) {
      this.pingValEl.textContent = `${ms}ms`;
      const dot = this.container.querySelector('.ping-dot');
      if (dot) {
        dot.style.background = ms < 80 ? '#22c55e' : ms < 180 ? '#f59e0b' : '#ef4444';
      }
    }
  }

  updateLocalVitals(vitals) {
    Object.assign(this.localPlayerState, vitals);

    const sPct = Math.max(0, Math.min(100, Math.round((this.localPlayerState.shield / this.localPlayerState.maxShield) * 100)));
    if (this.shieldValEl) this.shieldValEl.textContent = `${sPct}%`;
    if (this.shieldBarEl) this.shieldBarEl.style.width = `${sPct}%`;

    const hPct = Math.max(0, Math.min(100, Math.round((this.localPlayerState.hull / this.localPlayerState.maxHull) * 100)));
    if (this.hullValEl) this.hullValEl.textContent = `${hPct}%`;
    if (this.hullBarEl) {
      this.hullBarEl.style.width = `${hPct}%`;
      if (hPct <= 25) {
        this.hullBarEl.classList.add('critical');
      } else {
        this.hullBarEl.classList.remove('critical');
      }
    }

    const bPct = Math.max(0, Math.min(100, Math.round((this.localPlayerState.boostEnergy / this.localPlayerState.maxBoostEnergy) * 100)));
    if (this.boostValEl) this.boostValEl.textContent = `${bPct}%`;
    if (this.boostBarEl) this.boostBarEl.style.width = `${bPct}%`;

    if (this.speedValEl) {
      this.speedValEl.textContent = Math.round(this.localPlayerState.speed * 3.6);
    }
  }

  triggerHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.classList.remove('hidden');
    this.hitmarkerEl.classList.remove('flash');
    void this.hitmarkerEl.offsetWidth;
    this.hitmarkerEl.classList.add('flash');

    sounds.playHit();

    if (this._hitmarkerTimer) clearTimeout(this._hitmarkerTimer);
    this._hitmarkerTimer = setTimeout(() => {
      if (this.hitmarkerEl) this.hitmarkerEl.classList.add('hidden');
    }, 110);
  }

  /**
   * Directional damage hitmarker: indicates the 3D direction from which the player was hit.
   * Spawns a glowing curved tactical chevron arc around the crosshair pointing towards the threat.
   * @param {THREE.Vector3|number[]|null} sourcePos 3D world position of the threat (attacker or impact origin)
   * @param {THREE.Vector3|number[]|null} hitPoint 3D point on the ship where damage was received
   * @param {string|null} attackerId ID of remote player or AI enemy
   */
  triggerDamageIndicator(sourcePos = null, hitPoint = null, attackerId = null) {
    if (!this.damageContainer) return;

    // Helper to extract Vector3 safely without unnecessary allocations
    const setThreatPos = (pos) => {
      if (!pos) return false;
      if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number') {
        this._scratchVec.set(pos.x, pos.y, pos.z);
        return true;
      }
      if (Array.isArray(pos) && pos.length >= 3) {
        this._scratchVec.set(pos[0], pos[1], pos[2]);
        return true;
      }
      return false;
    };

    // 1. Resolve 3D threat position
    let hasThreatPos = setThreatPos(sourcePos);
    if (!hasThreatPos && attackerId) {
      const attacker = this.enemyManager?.getEnemy(attackerId) || this.remotePlayersManager?.getPlayer(attackerId);
      if (attacker && attacker.root) {
        hasThreatPos = setThreatPos(attacker.root.position);
      }
    }
    if (!hasThreatPos && hitPoint) {
      hasThreatPos = setThreatPos(hitPoint);
    }

    // 2. Compute initial 2D HUD angle relative to camera view
    let angle = 0;
    if (hasThreatPos && this.lastCamera && this.lastShipPos) {
      this._threatVec.subVectors(this._scratchVec, this.lastShipPos);
      this._camInvQuat.copy(this.lastCamera.quaternion).invert();
      this._threatLocal.copy(this._threatVec).applyQuaternion(this._camInvQuat);
      angle = Math.atan2(this._threatLocal.x, -this._threatLocal.z) * (180 / Math.PI);
    }

    // 3. Prevent duplicate clutter: if an indicator is already active within 24 degrees, refresh it
    for (const ind of this.damageIndicators) {
      let diff = Math.abs(ind.angle - angle);
      if (diff > 180) diff = 360 - diff;
      if (diff < 24) {
        ind.life = ind.maxLife;
        if (hasThreatPos) {
          if (!ind.threatPos) ind.threatPos = new THREE.Vector3();
          ind.threatPos.copy(this._scratchVec);
        }
        if (attackerId) ind.attackerId = attackerId;
        ind.el.classList.remove('damage-pulse');
        void ind.el.offsetWidth;
        ind.el.classList.add('damage-pulse');
        return;
      }
    }

    // 4. Create new indicator element
    const id = this._nextDamageId++;
    const el = document.createElement('div');
    el.className = 'damage-indicator-item damage-pulse';
    el.innerHTML = `
      <svg class="damage-indicator-svg" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="dmgGrad-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff1a3c" stop-opacity="1" />
            <stop offset="65%" stop-color="#ff0033" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#800010" stop-opacity="0.1" />
          </linearGradient>
          <filter id="dmgGlow-${id}" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path class="damage-arc-glow" d="M 94,52 L 87,38 Q 114,26 140,16 Q 166,26 193,38 L 186,52 Q 163,42 140,42 Q 117,42 94,52 Z" fill="url(#dmgGrad-${id})" filter="url(#dmgGlow-${id})" />
        <path class="damage-arc-core" d="M 98,50 L 92,39 Q 116,28 140,20 Q 164,28 188,39 L 182,50 Q 161,41 140,41 Q 119,41 98,50 Z" fill="#ff2244" />
        <polygon class="damage-chevron-pip" points="140,8 133,19 147,19" fill="#ffffff" />
      </svg>
    `;

    const edgeEl = document.createElement('div');
    edgeEl.className = 'damage-edge-glow';

    this.damageContainer.appendChild(edgeEl);
    this.damageContainer.appendChild(el);

    this.damageIndicators.push({
      id,
      el,
      edgeEl,
      threatPos: hasThreatPos ? this._scratchVec.clone() : null,
      attackerId,
      angle,
      life: 1.25,
      maxLife: 1.25
    });
  }

  updateDamageIndicators(dt, camera, localShipPos) {
    if (!this.damageIndicators || this.damageIndicators.length === 0) return;

    for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
      const ind = this.damageIndicators[i];
      ind.life -= dt;
      if (ind.life <= 0) {
        ind.el?.remove();
        ind.edgeEl?.remove();
        this.damageIndicators.splice(i, 1);
        continue;
      }

      // Live-track attacker position if known and still active
      if (ind.attackerId) {
        const attacker = this.enemyManager?.getEnemy(ind.attackerId) || this.remotePlayersManager?.getPlayer(ind.attackerId);
        if (attacker && attacker.root) {
          ind.threatPos = attacker.root.position;
        }
      }

      // Re-project angle in camera space as player turns or maneuvers
      if (ind.threatPos && camera && localShipPos) {
        this._threatVec.subVectors(ind.threatPos, localShipPos);
        this._camInvQuat.copy(camera.quaternion).invert();
        this._threatLocal.copy(this._threatVec).applyQuaternion(this._camInvQuat);
        ind.angle = Math.atan2(this._threatLocal.x, -this._threatLocal.z) * (180 / Math.PI);
      }

      const progress = ind.life / ind.maxLife; // 1.0 down to 0
      const opacity = Math.min(1.0, Math.pow(progress, 0.72));
      const scale = 1.0 + (1.0 - progress) * 0.12;

      ind.el.style.transform = `translate(-50%, -50%) rotate(${ind.angle.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
      ind.el.style.opacity = opacity.toFixed(3);

      if (ind.edgeEl) {
        ind.edgeEl.style.transform = `rotate(${ind.angle.toFixed(1)}deg)`;
        ind.edgeEl.style.opacity = (opacity * 0.65).toFixed(3);
      }
    }
  }

  clearDamageIndicators() {
    if (this.damageIndicators) {
      for (const ind of this.damageIndicators) {
        ind.el?.remove();
        ind.edgeEl?.remove();
      }
      this.damageIndicators.length = 0;
    }
  }

  showCombatBanner(text, durationMs = 2000) {
    if (!this.combatBannerEl || !this.bannerTextEl) return;
    this.bannerTextEl.textContent = text;
    this.combatBannerEl.classList.remove('hidden');

    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      if (this.combatBannerEl) this.combatBannerEl.classList.add('hidden');
    }, durationMs);
  }

  addKillFeedEntry(killerName, victimName, isLocalKiller = false, isLocalVictim = false) {
    if (!this.killFeedEl) return;

    const chip = document.createElement('div');
    chip.className = `kill-chip ${isLocalKiller ? 'is-killer' : ''} ${isLocalVictim ? 'is-victim' : ''}`;
    chip.innerHTML = `
      <span class="chip-pilot">${escapeHTML(killerName)}</span>
      <span class="chip-arrow">›</span>
      <span class="chip-pilot">${escapeHTML(victimName)}</span>
    `;

    this.killFeedEl.prepend(chip);

    while (this.killFeedEl.children.length > 4) {
      this.killFeedEl.removeChild(this.killFeedEl.lastChild);
    }

    setTimeout(() => {
      chip.style.opacity = '0';
      chip.style.transform = 'translateX(10px)';
      setTimeout(() => chip.remove(), 250);
    }, 5000);

    if (isLocalKiller) {
      sounds.playKillConfirmed();
      this.showCombatBanner('Target Eliminated (+100)');
    }
  }

  addChatMessage(sender, text, isSystem = false) {
    if (!this.chatMessagesEl) return;
    const line = document.createElement('div');
    line.className = `chat-line ${isSystem ? 'system' : ''}`;
    if (isSystem) {
      line.innerHTML = `<span class="chat-system">[System]</span> <span>${escapeHTML(text)}</span>`;
    } else {
      line.innerHTML = `<span class="chat-author">${escapeHTML(sender)}:</span> <span class="chat-body">${escapeHTML(text)}</span>`;
    }
    this.chatMessagesEl.appendChild(line);
    this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
  }

  openChat() {
    this.isChatOpen = true;
    this.chatBoxEl?.classList.remove('hidden');
    this.chatInputEl?.focus();
  }

  closeChat() {
    this.isChatOpen = false;
    this.chatBoxEl?.classList.add('hidden');
    this.chatInputEl?.blur();
  }

  toggleScoreboard(force = null) {
    this.isScoreboardOpen = force !== null ? force : !this.isScoreboardOpen;
    this.scoreboardModalEl?.classList.toggle('hidden', !this.isScoreboardOpen);
  }

  updateScoreboard(playersList, localPlayerId) {
    if (!this.scoreboardTbodyEl) return;

    const sorted = [...playersList].sort((a, b) => {
      const scoreA = a.state?.score || a.score || 0;
      const scoreB = b.state?.score || b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const killsA = a.state?.kills || a.kills || 0;
      const killsB = b.state?.kills || b.kills || 0;
      return killsB - killsA;
    });

    this.scoreboardTbodyEl.innerHTML = sorted.map((p, idx) => {
      const isLocal = p.id === localPlayerId;
      const kills = p.state?.kills ?? p.kills ?? 0;
      const deaths = p.state?.deaths ?? p.deaths ?? 0;
      const score = p.state?.score ?? p.score ?? 0;
      const ping = p.ping || '--';
      const vessel = p.customData?.shipName || 'StarSparrow';

      return `
        <tr class="${isLocal ? 'row-me' : ''}">
          <td>#${idx + 1}</td>
          <td>${escapeHTML(p.name)} ${p.isHost ? '<span class="badge-neutral">Host</span>' : ''}</td>
          <td>${escapeHTML(vessel)}</td>
          <td>${kills}</td>
          <td>${deaths}</td>
          <td class="cell-bold">${score}</td>
          <td>${ping}ms</td>
        </tr>
      `;
    }).join('');
  }

  showDestroyedOverlay(killerName = 'Enemy Laser Fire', countdownSec = 5) {
    this.isDestroyed = true;
    this.respawnTimer = countdownSec;
    if (this.killerTextEl) {
      this.killerTextEl.textContent = `Eliminated by ${killerName}`;
    }
    if (this.respawnCountdownEl) {
      this.respawnCountdownEl.textContent = Math.ceil(this.respawnTimer);
    }
    this.respawnOverlayEl?.classList.remove('hidden');
  }

  hideDestroyedOverlay() {
    this.isDestroyed = false;
    this.respawnOverlayEl?.classList.add('hidden');
  }

  showResults(title, mvpName, statsHtml) {
    if (this.resultsTitleEl) this.resultsTitleEl.textContent = title;
    if (this.resultsMvpEl) this.resultsMvpEl.textContent = `MVP: ${mvpName}`;
    if (this.resultsStatsEl) this.resultsStatsEl.innerHTML = statsHtml;
    this.resultsOverlayEl?.classList.remove('hidden');
  }

  hideResults() {
    this.resultsOverlayEl?.classList.add('hidden');
  }

  update(dt, camera, localShipPos, localShipQuat, remotePlayersManager, asteroidField, enemyManager = null) {
    if (this.isDestroyed && this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnCountdownEl) {
        this.respawnCountdownEl.textContent = Math.max(0, Math.ceil(this.respawnTimer));
      }
      if (this.respawnTimer <= 0) {
        if (this.onRespawnRequest) {
          this.onRespawnRequest();
        }
      }
    }

    if (!camera || !localShipPos) return;

    this.lastCamera = camera;
    this.lastShipPos.copy(localShipPos);
    if (remotePlayersManager) this.remotePlayersManager = remotePlayersManager;
    if (enemyManager) this.enemyManager = enemyManager;

    this.updateDamageIndicators(dt, camera, localShipPos);
    this.updateTacticalTargets(camera, localShipPos, enemyManager || remotePlayersManager);
    this.drawRadar(localShipPos, localShipQuat, remotePlayersManager, asteroidField);
  }

  updateTacticalTargets(camera, localShipPos, remotePlayersManager) {
    if (!this.inViewContainer || !this.offscreenContainer || !remotePlayersManager) return;
    const players = remotePlayersManager.getAllPlayers();
    const activePlayerIds = this._activePlayerIds;
    activePlayerIds.clear();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = Math.max(30, Math.min(w, h) * 0.045);
    const halfW = (w / 2) - margin;
    const halfH = (h / 2) - margin;
    const cx = w / 2;
    const cy = h / 2;

    for (const p of players) {
      if (p.isDestroyed || !p.root.visible) {
        const b = this.targetBracketsMap.get(p.id);
        if (b) b.el.style.display = 'none';
        const lp = this.leadPipsMap.get(p.id);
        if (lp) lp.el.style.display = 'none';
        const a = this.offscreenArrowsMap.get(p.id);
        if (a) a.el.style.display = 'none';
        continue;
      }

      activePlayerIds.add(p.id);

      // Camera local space position of the enemy ship
      this._camSpaceVec.copy(p.root.position).applyMatrix4(camera.matrixWorldInverse);
      const camX = this._camSpaceVec.x;
      const camY = this._camSpaceVec.y;
      const camZ = this._camSpaceVec.z;

      // Distance in meters
      const dist = Math.round(localShipPos.distanceTo(p.root.position));

      // In Three.js camera space, points in front of the lens have z < -0.1
      const isInFront = camZ < -0.1;

      // Project enemy world pos to 2D screen coordinates
      this._screenVec.copy(p.root.position).project(camera);
      const sx = (this._screenVec.x * 0.5 + 0.5) * w;
      const sy = (-this._screenVec.y * 0.5 + 0.5) * h;

      const isInView = isInFront && (sx >= margin && sx <= (w - margin) && sy >= margin && sy <= (h - margin));

      if (isInView) {
        // Hide off-screen arrow
        const arrow = this.offscreenArrowsMap.get(p.id);
        if (arrow) arrow.el.style.display = 'none';

        // --- BAREBONES IN-VIEW ENEMY MARKER (Icon + Distance) ---
        let marker = this.targetBracketsMap.get(p.id);
        if (!marker) {
          const el = document.createElement('div');
          el.className = 'minimal-enemy-marker';
          el.innerHTML = `
            <div class="marker-icon">
              <svg viewBox="0 0 20 20" class="marker-svg">
                <polygon points="10,2 18,10 10,18 2,10" />
                <circle cx="10" cy="10" r="1.5" />
              </svg>
            </div>
            <div class="marker-dist"></div>
          `;
          this.inViewContainer.appendChild(el);
          marker = {
            el,
            distEl: el.querySelector('.marker-dist'),
          };
          this.targetBracketsMap.set(p.id, marker);
        }

        // --- PREDICTIVE LEAD AIM PIP ---
        const tLead = dist / 160.0;
        this._leadScratchVec.copy(p.root.position).addScaledVector(p.velocity, tLead);
        this._leadCamSpaceVec.copy(this._leadScratchVec).applyMatrix4(camera.matrixWorldInverse);
        const leadIsInFront = this._leadCamSpaceVec.z < -0.1;

        let leadPip = this.leadPipsMap.get(p.id);
        if (!leadPip) {
          const el = document.createElement('div');
          el.className = 'minimal-lead-pip';
          el.innerHTML = `<div class="lead-pip-circle"></div>`;
          this.inViewContainer.appendChild(el);
          leadPip = { el };
          this.leadPipsMap.set(p.id, leadPip);
        }

        let isLocked = false;
        const enemySpeed = p.velocity ? p.velocity.length() : (p.currentSpeed || 0);
        const isMoving = enemySpeed > 1.2;

        if (leadIsInFront && isMoving) {
          this._leadScreenVec.copy(this._leadScratchVec).project(camera);
          const leadSx = (this._leadScreenVec.x * 0.5 + 0.5) * w;
          const leadSy = (-this._leadScreenVec.y * 0.5 + 0.5) * h;

          leadPip.el.style.left = `${leadSx.toFixed(1)}px`;
          leadPip.el.style.top = `${leadSy.toFixed(1)}px`;
          leadPip.el.style.display = 'flex';

          const leadDistToCenter = Math.hypot(leadSx - cx, leadSy - cy);
          const shipDistToCenter = Math.hypot(sx - cx, sy - cy);
          isLocked = (leadDistToCenter < 40) || (shipDistToCenter < 36);

          leadPip.el.classList.toggle('is-locked', isLocked);
        } else {
          leadPip.el.style.display = 'none';
          const shipDistToCenter = Math.hypot(sx - cx, sy - cy);
          isLocked = shipDistToCenter < 36;
        }

        marker.distEl.textContent = `${dist}m`;
        marker.el.classList.toggle('is-locked', isLocked);

        const scale = THREE.MathUtils.clamp(1.15 - (dist / 800) * 0.35, 0.75, 1.25);
        marker.el.style.left = `${sx.toFixed(1)}px`;
        marker.el.style.top = `${sy.toFixed(1)}px`;
        marker.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)})`;
        marker.el.style.display = 'flex';

      } else {
        // Hide in-view marker and lead pip
        const marker = this.targetBracketsMap.get(p.id);
        if (marker) marker.el.style.display = 'none';
        const leadPip = this.leadPipsMap.get(p.id);
        if (leadPip) leadPip.el.style.display = 'none';

        // --- BAREBONES OFF-SCREEN ARROW (Icon + Distance) ---
        let arrow = this.offscreenArrowsMap.get(p.id);
        if (!arrow) {
          const el = document.createElement('div');
          el.className = 'minimal-offscreen-arrow';
          el.innerHTML = `
            <div class="offscreen-arrow-icon">▲</div>
            <div class="offscreen-arrow-dist"></div>
          `;
          this.offscreenContainer.appendChild(el);
          arrow = {
            el,
            iconEl: el.querySelector('.offscreen-arrow-icon'),
            distEl: el.querySelector('.offscreen-arrow-dist')
          };
          this.offscreenArrowsMap.set(p.id, arrow);
        }

        // Direction in screen pixel coordinates
        let dirX = camX;
        let dirY = -camY;
        const isBehind = camZ >= -0.1;
        if (isBehind && Math.hypot(dirX, dirY) < 0.05) {
          dirX = 0;
          dirY = 1;
        }
        const len = Math.hypot(dirX, dirY);
        if (len > 0.0001) {
          dirX /= len;
          dirY /= len;
        } else {
          dirX = 0;
          dirY = 1;
        }

        const angle = Math.atan2(dirY, dirX);
        const edgeScale = Math.min(
          Math.abs(halfW / (dirX || 0.0001)),
          Math.abs(halfH / (dirY || 0.0001))
        );

        const edgeX = THREE.MathUtils.clamp(cx + dirX * edgeScale, margin, w - margin);
        const edgeY = THREE.MathUtils.clamp(cy + dirY * edgeScale, margin, h - margin);
        const rotDeg = (angle * 180 / Math.PI) + 90;

        arrow.iconEl.style.transform = `rotate(${rotDeg.toFixed(1)}deg)`;
        arrow.distEl.textContent = `${dist}m`;
        arrow.el.style.left = `${edgeX.toFixed(1)}px`;
        arrow.el.style.top = `${edgeY.toFixed(1)}px`;
        arrow.el.classList.toggle('is-danger', dist < 160);
        arrow.el.style.display = 'flex';
      }
    }

    // Clean up disconnected players
    for (const [id, b] of this.targetBracketsMap.entries()) {
      if (!activePlayerIds.has(id)) {
        b.el.remove();
        this.targetBracketsMap.delete(id);
      }
    }
    for (const [id, lp] of this.leadPipsMap.entries()) {
      if (!activePlayerIds.has(id)) {
        lp.el.remove();
        this.leadPipsMap.delete(id);
      }
    }
    for (const [id, a] of this.offscreenArrowsMap.entries()) {
      if (!activePlayerIds.has(id)) {
        a.el.remove();
        this.offscreenArrowsMap.delete(id);
      }
    }
  }

  drawRadar(localShipPos, localShipQuat, remotePlayersManager, asteroidField) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarRange = 350;
    const scale = (cx - 6) / radarRange;

    ctx.clearRect(0, 0, w, h);

    // Super minimal and transparent circular radar boundary
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();

    // Delicate transparent border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Subtle faint crosshair ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(cx, 6);
    ctx.lineTo(cx, h - 6);
    ctx.moveTo(6, cy);
    ctx.lineTo(w - 6, cy);
    ctx.stroke();

    _radarForward.set(0, 0, -1).applyQuaternion(localShipQuat);
    const shipYaw = Math.atan2(_radarForward.x, -_radarForward.z);

    // Draw Remote Enemy Players (crisp red dots)
    if (remotePlayersManager) {
      const players = remotePlayersManager.getAllPlayers();
      ctx.fillStyle = '#ff3366';
      for (const p of players) {
        if (p.isDestroyed || !p.root.visible) continue;

        const dx = p.root.position.x - localShipPos.x;
        const dz = p.root.position.z - localShipPos.z;

        const rx = dx * Math.cos(shipYaw) - dz * Math.sin(shipYaw);
        const rz = dx * Math.sin(shipYaw) + dz * Math.cos(shipYaw);

        const px = cx + rx * scale;
        const py = cy + rz * scale;

        if (Math.hypot(px - cx, py - cy) < cx - 4) {
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Local Player (crisp tiny white arrow)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4.5);
    ctx.lineTo(cx + 3, cy + 3.5);
    ctx.lineTo(cx, cy + 1.8);
    ctx.lineTo(cx - 3, cy + 3.5);
    ctx.closePath();
    ctx.fill();
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
