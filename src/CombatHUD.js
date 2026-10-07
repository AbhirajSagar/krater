/**
 * CombatHUD.js
 * Minimalist, monochromatic tactical HUD for multiplayer space combat.
 * Uses neutral glassmorphism (black, white, translucent grays),
 * clean Lucide-style vector line icons, and subtle typography.
 */

import * as THREE from 'three';
import { sounds } from './SoundManager.js';
import { Icons } from './Icons.js';

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

    this._scratchVec = new THREE.Vector3();
    this._screenVec = new THREE.Vector3();

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
      <!-- TOP STATUS BAR -->
      <div class="hud-top-bar">
        <div class="hud-badge-pill" id="hud-room-badge">
          <span class="badge-code" id="hud-room-code">Match</span>
        </div>
        <div class="hud-badge-pill" id="hud-ping-badge">
          <span class="ping-dot"></span>
          <span id="hud-ping-val">0ms</span>
        </div>
        <button id="btn-hud-score" class="hud-action-pill" title="Scoreboard (Tab)">
          ${Icons.trophy(14)}
          <span>Score</span>
        </button>
        <button id="btn-hud-chat" class="hud-action-pill" title="Chat (Enter)">
          ${Icons.message(14)}
          <span>Chat</span>
        </button>
      </div>

      <!-- TOP RIGHT: KILL FEED -->
      <div class="hud-kill-feed" id="hud-kill-feed"></div>

      <!-- CENTER TOP: NOTIFICATION BANNER -->
      <div class="hud-combat-banner hidden" id="hud-combat-banner">
        <span class="banner-text" id="hud-banner-text">Target Eliminated</span>
      </div>

      <!-- HITMARKER OVERLAY -->
      <div class="hud-hitmarker hidden" id="hud-hitmarker">
        <div class="hit-slash hit-slash-1"></div>
        <div class="hit-slash hit-slash-2"></div>
      </div>

      <!-- TARGET LOCK RETICLE -->
      <div class="hud-target-lock hidden" id="hud-target-lock">
        <div class="lock-bracket lock-tl"></div>
        <div class="lock-bracket lock-tr"></div>
        <div class="lock-bracket lock-bl"></div>
        <div class="lock-bracket lock-br"></div>
        <div class="lock-info">
          <span class="lock-name" id="hud-lock-name">Target</span>
          <span class="lock-dist" id="hud-lock-dist">120m</span>
          <div class="lock-health-track">
            <div class="lock-health-fill" id="hud-lock-health"></div>
          </div>
        </div>
      </div>

      <!-- OFF-SCREEN ENEMY DIRECTIONAL ARROWS -->
      <div class="hud-offscreen-indicators" id="hud-offscreen-indicators"></div>

      <!-- BOTTOM LEFT: VITALS GAUGES -->
      <div class="hud-vitals-card">
        <div class="vitals-row">
          <div class="vitals-header">
            <span class="vitals-label">${Icons.shield(12)} Shield</span>
            <span class="vitals-val" id="hud-shield-val">100%</span>
          </div>
          <div class="vitals-track">
            <div class="vitals-bar shield-bar" id="hud-shield-bar" style="width: 100%;"></div>
          </div>
        </div>

        <div class="vitals-row">
          <div class="vitals-header">
            <span class="vitals-label">${Icons.heart(12)} Hull</span>
            <span class="vitals-val" id="hud-hull-val">100%</span>
          </div>
          <div class="vitals-track">
            <div class="vitals-bar hull-bar" id="hud-hull-bar" style="width: 100%;"></div>
          </div>
        </div>

        <div class="vitals-row">
          <div class="vitals-header">
            <span class="vitals-label">${Icons.zap(12)} Boost</span>
            <span class="vitals-val" id="hud-boost-val">100%</span>
          </div>
          <div class="vitals-track">
            <div class="vitals-bar boost-bar" id="hud-boost-bar" style="width: 100%;"></div>
          </div>
        </div>

        <div class="hud-speed-row">
          <span class="speed-number" id="hud-speed-val">0</span>
          <span class="speed-unit-text">km/h</span>
        </div>
      </div>

      <!-- BOTTOM RIGHT: MINIMAL RADAR SENSOR -->
      <div class="hud-radar-card">
        <canvas id="hud-radar-canvas" width="140" height="140" class="radar-canvas"></canvas>
      </div>

      <!-- IN-GAME CHAT OVERLAY -->
      <div class="hud-chat-card hidden" id="hud-chat-box">
        <div class="chat-header-row">
          <span>Channel</span>
          <button id="btn-close-chat" class="icon-btn-ghost-sm">${Icons.x(14)}</button>
        </div>
        <div class="chat-messages-scroll" id="hud-chat-messages"></div>
        <div class="chat-quick-comms">
          <button class="quick-comm-btn" data-msg="On your six">On your six</button>
          <button class="quick-comm-btn" data-msg="Need backup">Need backup</button>
          <button class="quick-comm-btn" data-msg="Good fight">Good fight</button>
          <button class="quick-comm-btn" data-msg="Nice shot">Nice shot</button>
        </div>
        <form class="chat-input-row" id="hud-chat-form">
          <input type="text" id="hud-chat-input" placeholder="Message squad..." maxlength="120" autocomplete="off" />
          <button type="submit" class="btn-glass-sm">Send</button>
        </form>
      </div>

      <!-- SCOREBOARD MODAL (TAB) -->
      <div class="hud-scoreboard-backdrop hidden" id="hud-scoreboard-modal">
        <div class="scoreboard-glass-card">
          <div class="scoreboard-header-clean">
            <div class="scoreboard-title-text">Leaderboard</div>
            <div class="scoreboard-room-label" id="hud-scoreboard-room-name">Match</div>
          </div>
          <div class="scoreboard-table-scroll">
            <table class="minimal-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Pilot</th>
                  <th>Vessel</th>
                  <th>Kills</th>
                  <th>Deaths</th>
                  <th>Score</th>
                  <th>Ping</th>
                </tr>
              </thead>
              <tbody id="hud-scoreboard-tbody"></tbody>
            </table>
          </div>
          <div class="scoreboard-footer-clean">
            <span>Press Tab or Escape to close</span>
          </div>
        </div>
      </div>

      <!-- DESTRUCTION & RESPAWN OVERLAY -->
      <div class="hud-respawn-backdrop hidden" id="hud-respawn-overlay">
        <div class="respawn-glass-card">
          <div class="respawn-title-clean">Vessel Compromised</div>
          <div class="respawn-killer-clean" id="hud-killer-text">Eliminated by enemy fire</div>
          <div class="respawn-timer-wrap">
            <span class="respawn-digits" id="hud-respawn-countdown">5</span>
            <span class="respawn-seconds-label">seconds to respawn</span>
          </div>
          <button id="btn-manual-respawn" class="btn-primary-solid">Respawn Now</button>
        </div>
      </div>

      <!-- RESULTS OVERLAY -->
      <div class="hud-results-backdrop hidden" id="hud-results-overlay">
        <div class="results-glass-card">
          <div class="results-title-clean" id="hud-results-title">Match Concluded</div>
          <div class="results-mvp-clean" id="hud-results-mvp">MVP: Pilot</div>
          <div class="results-stats-body" id="hud-results-stats"></div>
          <div class="results-actions-row">
            <button id="btn-results-leave" class="btn-primary-solid">Return to Hangar</button>
          </div>
        </div>
      </div>
    `;

    // Elements
    this.shieldValEl = document.getElementById('hud-shield-val');
    this.shieldBarEl = document.getElementById('hud-shield-bar');
    this.hullValEl = document.getElementById('hud-hull-val');
    this.hullBarEl = document.getElementById('hud-hull-bar');
    this.boostValEl = document.getElementById('hud-boost-val');
    this.boostBarEl = document.getElementById('hud-boost-bar');
    this.speedValEl = document.getElementById('hud-speed-val');
    this.pingValEl = document.getElementById('hud-ping-val');
    this.roomCodeEl = document.getElementById('hud-room-code');

    this.hitmarkerEl = document.getElementById('hud-hitmarker');
    this.combatBannerEl = document.getElementById('hud-combat-banner');
    this.bannerTextEl = document.getElementById('hud-banner-text');

    this.targetLockEl = document.getElementById('hud-target-lock');
    this.lockNameEl = document.getElementById('hud-lock-name');
    this.lockDistEl = document.getElementById('hud-lock-dist');
    this.lockHealthEl = document.getElementById('hud-lock-health');

    this.offscreenContainer = document.getElementById('hud-offscreen-indicators');
    this.killFeedEl = document.getElementById('hud-kill-feed');

    this.radarCanvas = document.getElementById('hud-radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    this.chatBoxEl = document.getElementById('hud-chat-box');
    this.chatMessagesEl = document.getElementById('hud-chat-messages');
    this.chatFormEl = document.getElementById('hud-chat-form');
    this.chatInputEl = document.getElementById('hud-chat-input');

    this.scoreboardModalEl = document.getElementById('hud-scoreboard-modal');
    this.scoreboardTbodyEl = document.getElementById('hud-scoreboard-tbody');
    this.scoreboardRoomEl = document.getElementById('hud-scoreboard-room-name');

    this.respawnOverlayEl = document.getElementById('hud-respawn-overlay');
    this.killerTextEl = document.getElementById('hud-killer-text');
    this.respawnCountdownEl = document.getElementById('hud-respawn-countdown');
    this.manualRespawnBtn = document.getElementById('btn-manual-respawn');

    this.resultsOverlayEl = document.getElementById('hud-results-overlay');
    this.resultsTitleEl = document.getElementById('hud-results-title');
    this.resultsMvpEl = document.getElementById('hud-results-mvp');
    this.resultsStatsEl = document.getElementById('hud-results-stats');
    this.resultsLeaveBtn = document.getElementById('btn-results-leave');

    this.btnScore = document.getElementById('btn-hud-score');
    this.btnChat = document.getElementById('btn-hud-chat');
    this.btnCloseChat = document.getElementById('btn-close-chat');

    this._hitmarkerTimer = null;
    this._bannerTimer = null;
  }

  setupListeners() {
    this.btnScore?.addEventListener('click', () => this.toggleScoreboard());
    this.btnChat?.addEventListener('click', () => this.openChat());
    this.btnCloseChat?.addEventListener('click', () => this.closeChat());

    this.chatFormEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.chatInputEl?.value?.trim();
      if (text && this.onSendChat) {
        this.onSendChat(text);
        this.chatInputEl.value = '';
      }
      this.closeChat();
    });

    this.container.querySelectorAll('.quick-comm-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        if (msg && this.onSendChat) {
          this.onSendChat(msg);
        }
        this.closeChat();
      });
    });

    this.manualRespawnBtn?.addEventListener('click', () => {
      if (this.onRespawnRequest) {
        this.onRespawnRequest();
      }
    });

    this.resultsLeaveBtn?.addEventListener('click', () => {
      if (this.onLeaveMatch) {
        this.onLeaveMatch();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && e.target !== this.chatInputEl) return;

      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleScoreboard();
        return;
      }

      if (e.code === 'Enter') {
        if (!this.isChatOpen) {
          e.preventDefault();
          this.openChat();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (this.isChatOpen) {
          this.closeChat();
          return;
        }
        if (this.isScoreboardOpen) {
          this.toggleScoreboard(false);
          return;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab' && this.isScoreboardOpen) {
        this.toggleScoreboard(false);
      }
    });
  }

  show() {
    this.container.classList.add('visible');
  }

  hide() {
    this.container.classList.remove('visible');
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

  update(dt, camera, localShipPos, localShipQuat, remotePlayersManager, asteroidField) {
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

    // Target lock
    const target = remotePlayersManager ? remotePlayersManager.getNearestTargetInAim(camera, 0.16) : null;
    if (target && !target.player.isDestroyed) {
      this.targetLockEl?.classList.remove('hidden');
      const sx = (target.screenX * 0.5 + 0.5) * window.innerWidth;
      const sy = (-target.screenY * 0.5 + 0.5) * window.innerHeight;

      if (this.targetLockEl) {
        this.targetLockEl.style.left = `${sx}px`;
        this.targetLockEl.style.top = `${sy}px`;
      }
      if (this.lockNameEl) this.lockNameEl.textContent = target.player.name;
      if (this.lockDistEl) this.lockDistEl.textContent = `${Math.round(target.worldDistance)}m`;
      if (this.lockHealthEl) {
        const hpPct = Math.max(0, Math.min(100, (target.player.health / target.player.maxHealth) * 100));
        this.lockHealthEl.style.width = `${hpPct}%`;
      }
    } else {
      this.targetLockEl?.classList.add('hidden');
    }

    this.updateOffScreenIndicators(camera, localShipPos, remotePlayersManager);
    this.drawRadar(localShipPos, localShipQuat, remotePlayersManager, asteroidField);
  }

  updateOffScreenIndicators(camera, localShipPos, remotePlayersManager) {
    if (!this.offscreenContainer || !remotePlayersManager) return;
    const players = remotePlayersManager.getAllPlayers();
    this.offscreenContainer.innerHTML = '';

    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = 32;

    for (const p of players) {
      if (p.isDestroyed || !p.root.visible) continue;

      this._scratchVec.copy(p.root.position);
      this._screenVec.copy(this._scratchVec).project(camera);

      const isBehind = this._screenVec.z < 0 || this._screenVec.z > 1;
      const isOffScreen = isBehind || Math.abs(this._screenVec.x) > 0.95 || Math.abs(this._screenVec.y) > 0.95;

      if (isOffScreen) {
        let x = this._screenVec.x;
        let y = this._screenVec.y;

        if (isBehind) {
          x = -x;
          y = -y;
        }

        const angle = Math.atan2(y, x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        let edgeX, edgeY;
        if (Math.abs(cos * height) > Math.abs(sin * width)) {
          edgeX = cos > 0 ? width - margin : margin;
          edgeY = height / 2 - (cos > 0 ? (width / 2 - margin) : -(width / 2 - margin)) * Math.tan(angle);
        } else {
          edgeY = sin > 0 ? margin : height - margin;
          edgeX = width / 2 + (sin > 0 ? (height / 2 - margin) : -(height / 2 - margin)) / Math.tan(angle);
        }

        edgeX = Math.max(margin, Math.min(width - margin, edgeX));
        edgeY = Math.max(margin, Math.min(height - margin, edgeY));

        const dist = Math.round(localShipPos.distanceTo(p.root.position));
        const rotDeg = (Math.atan2(-sin, cos) * 180) / Math.PI;

        const arrowEl = document.createElement('div');
        arrowEl.className = 'clean-offscreen-arrow';
        arrowEl.style.left = `${edgeX}px`;
        arrowEl.style.top = `${edgeY}px`;
        arrowEl.innerHTML = `
          <div class="arrow-shape" style="transform: rotate(${rotDeg}deg);">▲</div>
          <div class="arrow-text">${escapeHTML(p.name)} · ${dist}m</div>
        `;
        this.offscreenContainer.appendChild(arrowEl);
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
    const radarRange = 400;
    const scale = (cx - 8) / radarRange;

    ctx.clearRect(0, 0, w, h);

    // Dark translucent circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx, h - 4);
    ctx.moveTo(4, cy);
    ctx.lineTo(w - 4, cy);
    ctx.stroke();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(localShipQuat);
    const shipYaw = Math.atan2(forward.x, -forward.z);

    // Draw Asteroids (dim dots)
    if (asteroidField && asteroidField.asteroids) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < Math.min(asteroidField.asteroids.length, 50); i++) {
        const a = asteroidField.asteroids[i];
        if (a.isDestroyed || !a.mesh.visible) continue;

        const dx = a.mesh.position.x - localShipPos.x;
        const dz = a.mesh.position.z - localShipPos.z;

        const rx = dx * Math.cos(shipYaw) - dz * Math.sin(shipYaw);
        const rz = dx * Math.sin(shipYaw) + dz * Math.cos(shipYaw);

        const px = cx + rx * scale;
        const py = cy + rz * scale;

        if (Math.hypot(px - cx, py - cy) < cx - 6) {
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Remote Players (clean white dots)
    if (remotePlayersManager) {
      const players = remotePlayersManager.getAllPlayers();
      ctx.fillStyle = '#ffffff';
      for (const p of players) {
        if (p.isDestroyed || !p.root.visible) continue;

        const dx = p.root.position.x - localShipPos.x;
        const dz = p.root.position.z - localShipPos.z;

        const rx = dx * Math.cos(shipYaw) - dz * Math.sin(shipYaw);
        const rz = dx * Math.sin(shipYaw) + dz * Math.cos(shipYaw);

        const px = cx + rx * scale;
        const py = cy + rz * scale;

        if (Math.hypot(px - cx, py - cy) < cx - 6) {
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Local Player (center triangle)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 3.5, cy + 4);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 3.5, cy + 4);
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
