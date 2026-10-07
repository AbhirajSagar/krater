/**
 * LobbyUI.js
 * Minimalist, monochromatic glassmorphic UI for StarSparrow.
 * Features a static 3D ship preview on the left and a clean, organized panel on the right.
 * No top-left title, pure neutral styling, and monochromatic Lucide icons.
 */

import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';
import { SPARROW_THEMES } from './StarSparrowMaterial.js';
import { sounds } from './SoundManager.js';
import { Icons } from './Icons.js';

const CALLSIGN_NAMES = [
  'Viper', 'Ghost', 'Phoenix', 'Nova', 'Shadow', 'Falcon', 'Reaper', 
  'Spectre', 'Titan', 'Valkyrie', 'Maverick', 'Apex', 'Storm', 'Raven'
];

export const COLOR_SWATCHES = [
  { key: 'White', name: 'White', hex: '#f8fafc' },
  { key: 'Black', name: 'Black', hex: '#1e293b' },
  { key: 'Grey', name: 'Grey', hex: '#64748b' },
  { key: 'Red', name: 'Red', hex: '#e11d48' },
  { key: 'Blue', name: 'Blue', hex: '#3b82f6' },
  { key: 'Cyan', name: 'Cyan', hex: '#06b6d4' },
  { key: 'Green', name: 'Green', hex: '#10b981' },
  { key: 'Orange', name: 'Orange', hex: '#f97316' },
  { key: 'Purple', name: 'Purple', hex: '#a855f7' },
  { key: 'Yellow', name: 'Gold', hex: '#eab308' },
];

export class LobbyUI {
  /**
   * @param {object} options
   */
  constructor(options = {}) {
    this.client = options.client;
    this.spaceship = options.spaceship;
    this.skyboxManager = options.skyboxManager;

    this.onStartSolo = options.onStartSolo || null;
    this.onEnterBattle = options.onEnterBattle || null;
    this.onLeaveToMenu = options.onLeaveToMenu || null;

    // Load saved settings
    this.callsign = localStorage.getItem('spacegame_callsign') || this.generateRandomCallsign();
    this.selectedShipIndex = parseInt(localStorage.getItem('spacegame_ship_index') || '0', 10);
    if (this.selectedShipIndex >= SPACESHIP_CONFIGS.length) this.selectedShipIndex = 0;

    this.selectedThemeKey = localStorage.getItem('spacegame_theme_key') || 'Cyan';

    this.currentScreen = 'main'; // 'main', 'lobby'
    this.isHost = false;
    this.isReady = false;
    this.isLoading = false;

    this.initDOM();
    this.setupListeners();
    this.checkDeepLink();
  }

  generateRandomCallsign() {
    const name = CALLSIGN_NAMES[Math.floor(Math.random() * CALLSIGN_NAMES.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${name}-${num}`;
  }

  initDOM() {
    let root = document.getElementById('lobby-ui-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'lobby-ui-root';
      root.className = 'lobby-ui-root visible';
      document.body.appendChild(root);
    }
    this.root = root;

    this.root.innerHTML = `
      <!-- ================= MAIN MENU SCREEN (Ship on Left, UI on Right) ================= -->
      <div class="lobby-screen screen-main screen-split-layout" id="screen-main">
        <!-- Open left space leaves 3D spaceship visible without obstruction -->
        <div class="ship-viewport-space" aria-hidden="true"></div>

        <!-- Right Side: Clean Organised Glassmorphic Panel -->
        <aside class="menu-right-panel">
          <div class="panel-glass-card">
            <!-- Header: Status indicator -->
            <div class="panel-top-row">
              <div class="nav-status" id="nav-status">
                <span class="status-indicator-dot"></span>
                <span class="status-indicator-text" id="nav-status-text">Connecting...</span>
              </div>
            </div>

            <!-- Pilot Profile: Callsign -->
            <div class="panel-section">
              <label for="input-callsign" class="panel-section-label">Callsign</label>
              <div class="minimal-input-wrap">
                <input type="text" id="input-callsign" maxlength="16" spellcheck="false" autocomplete="off" value="${this.callsign}" placeholder="Enter callsign" />
                <button id="btn-random-callsign" class="icon-btn-ghost" title="Generate Random Callsign" aria-label="Random Callsign">
                  ${Icons.shuffle(15)}
                </button>
              </div>
            </div>

            <!-- Vessel Selection Stepper -->
            <div class="panel-section">
              <span class="panel-section-label">Vessel</span>
              <div class="ship-stepper">
                <button id="btn-prev-ship" class="icon-btn-ghost stepper-btn" aria-label="Previous Ship">
                  ${Icons.chevronLeft(16)}
                </button>
                <div class="ship-details-text">
                  <span class="ship-title-text" id="ship-name-val">StarSparrow 1</span>
                  <span class="ship-class-text" id="ship-class-val">Assault Fighter</span>
                </div>
                <button id="btn-next-ship" class="icon-btn-ghost stepper-btn" aria-label="Next Ship">
                  ${Icons.chevronRight(16)}
                </button>
              </div>
            </div>

            <!-- Color Palette Swatches -->
            <div class="panel-section">
              <span class="panel-section-label">Paint Scheme</span>
              <div class="color-swatches-grid" id="color-swatches-grid">
                ${COLOR_SWATCHES.map(sw => `
                  <button class="color-swatch-circle ${sw.key === this.selectedThemeKey ? 'active' : ''}"
                          data-key="${sw.key}"
                          title="${sw.name}"
                          style="background-color: ${sw.hex};"
                          aria-label="${sw.name}">
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="panel-divider"></div>

            <!-- Action Buttons -->
            <div class="panel-section panel-actions-stack">
              <button id="btn-quick-play" class="btn-primary-solid btn-full">
                <span class="btn-icon-wrap" id="icon-quick-play">${Icons.play(16)}</span>
                <span id="text-quick-play">Quick Play</span>
              </button>

              <div class="action-grid-buttons">
                <button id="btn-browse-lobbies" class="btn-glass">
                  <span class="btn-icon-wrap">${Icons.list(15)}</span>
                  <span>Browse Rooms</span>
                </button>

                <button id="btn-create-lobby-modal" class="btn-glass">
                  <span class="btn-icon-wrap">${Icons.plus(15)}</span>
                  <span>Create Room</span>
                </button>

                <button id="btn-join-code-modal" class="btn-glass btn-col-span-2">
                  <span class="btn-icon-wrap">${Icons.hash(15)}</span>
                  <span>Join with Room Code</span>
                </button>
              </div>

              <button id="btn-solo-practice" class="btn-link-subtle">
                ${Icons.compass(14)}
                <span>Singleplayer Practice Flight</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <!-- ================= PUBLIC ROOMS BROWSER MODAL ================= -->
      <div class="modal-backdrop hidden" id="modal-browser">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3 class="modal-title">Active Rooms</h3>
              <span class="modal-subtitle">Browse and join open matches</span>
            </div>
            <div class="modal-header-actions">
              <button class="icon-btn-ghost" id="btn-browser-refresh" title="Refresh" aria-label="Refresh">
                ${Icons.refresh(16)}
              </button>
              <button class="icon-btn-ghost" id="btn-close-browser" title="Close" aria-label="Close">
                ${Icons.x(18)}
              </button>
            </div>
          </div>

          <div class="modal-search-row">
            <input type="text" id="input-browser-search" placeholder="Search by name or code..." spellcheck="false" autocomplete="off" />
          </div>

          <div class="modal-table-wrap">
            <table class="minimal-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Code</th>
                  <th>Players</th>
                  <th>Status</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody id="browser-tbody">
                <tr><td colspan="5" class="table-empty">${Icons.loader(16)} Loading rooms...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= CREATE ROOM MODAL ================= -->
      <div class="modal-backdrop hidden" id="modal-create">
        <div class="modal-card modal-card-sm">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3 class="modal-title">Create Room</h3>
              <span class="modal-subtitle">Configure match parameters</span>
            </div>
            <button class="icon-btn-ghost" id="btn-close-create" title="Close" aria-label="Close">
              ${Icons.x(18)}
            </button>
          </div>

          <form id="form-create-match" class="minimal-form">
            <div class="form-field">
              <label for="create-room-name">Room Name</label>
              <input type="text" id="create-room-name" value="${this.callsign}'s Game" maxlength="28" required />
            </div>

            <div class="form-grid-2">
              <div class="form-field">
                <label for="create-max-players">Max Players</label>
                <select id="create-max-players">
                  <option value="4">4 Players</option>
                  <option value="8" selected>8 Players</option>
                  <option value="12">12 Players</option>
                  <option value="16">16 Players</option>
                </select>
              </div>

              <div class="form-field">
                <label for="create-skybox">Environment</label>
                <select id="create-skybox">
                  <option value="blue_nebula">Blue Nebula</option>
                  <option value="deep_space">Deep Space</option>
                  <option value="golden_galaxy">Golden Galaxy</option>
                  <option value="purple_nebula">Purple Nebula</option>
                </select>
              </div>
            </div>

            <div class="form-field-checkbox">
              <label class="clean-checkbox-label">
                <input type="checkbox" id="create-is-private" />
                <span>Private Match (join via code only)</span>
              </label>
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn-glass" id="btn-cancel-create">Cancel</button>
              <button type="submit" class="btn-primary-solid" id="btn-submit-create">
                <span class="btn-icon-wrap" id="create-btn-icon">${Icons.plus(16)}</span>
                <span id="create-btn-text">Create Room</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================= JOIN BY CODE MODAL ================= -->
      <div class="modal-backdrop hidden" id="modal-join-code">
        <div class="modal-card modal-card-sm">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3 class="modal-title">Join by Code</h3>
              <span class="modal-subtitle">Enter 6-character room code</span>
            </div>
            <button class="icon-btn-ghost" id="btn-close-join-code" title="Close" aria-label="Close">
              ${Icons.x(18)}
            </button>
          </div>

          <form id="form-join-code" class="minimal-form">
            <div class="form-field">
              <label for="input-room-code-direct">Room Code</label>
              <input type="text" id="input-room-code-direct" class="code-input" placeholder="e.g. K7X9PQ" maxlength="8" spellcheck="false" autocomplete="off" required />
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn-glass" id="btn-cancel-join-code">Cancel</button>
              <button type="submit" class="btn-primary-solid" id="btn-submit-join-code">
                <span class="btn-icon-wrap" id="join-code-btn-icon">${Icons.play(16)}</span>
                <span id="join-code-btn-text">Join Room</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================= STAGING LOBBY ROOM SCREEN ================= -->
      <div class="lobby-screen screen-staging hidden" id="screen-staging">
        <header class="top-nav-bar">
          <div class="staging-title-group">
            <span class="staging-title-name" id="staging-room-name">Room</span>
            <span class="staging-title-badge">Lobby</span>
          </div>

          <div class="room-code-badge-wrap">
            <span class="room-code-label">Code:</span>
            <span class="room-code-value" id="staging-room-code">------</span>
            <button id="btn-copy-link" class="btn-glass-sm" title="Copy Invite Link" aria-label="Copy Invite Link">
              <span id="copy-link-icon">${Icons.copy(14)}</span>
              <span id="copy-link-text">Copy Link</span>
            </button>
          </div>
        </header>

        <div class="staging-content-layout">
          <!-- Left: Player Roster -->
          <div class="staging-panel roster-panel">
            <div class="panel-header-minimal">
              <span class="panel-title-text">Players (<span id="staging-player-count">1/8</span>)</span>
            </div>

            <div class="roster-pills-list" id="staging-roster-list">
              <!-- Player cards injected here -->
            </div>

            <div class="staging-bottom-actions">
              <button id="btn-staging-leave" class="btn-glass">Leave</button>
              <button id="btn-staging-ready" class="btn-glass ready-btn">Ready</button>
              <button id="btn-staging-launch" class="btn-primary-solid hidden">Start Game</button>
            </div>
          </div>

          <!-- Right: Lobby Chat -->
          <div class="staging-panel chat-panel">
            <div class="panel-header-minimal">
              <span class="panel-title-text">Chat</span>
            </div>
            <div class="staging-chat-messages" id="staging-chat-messages"></div>
            <form class="staging-chat-form" id="staging-chat-form">
              <input type="text" id="staging-chat-input" placeholder="Type a message..." maxlength="120" autocomplete="off" />
              <button type="submit" class="btn-glass-sm">Send</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Minimal Toast Notifications Container -->
      <div class="toast-container" id="toast-container"></div>
    `;

    // Cache elements
    this.navStatus = document.getElementById('nav-status');
    this.navStatusText = document.getElementById('nav-status-text');

    this.inputCallsign = document.getElementById('input-callsign');
    this.btnRandomCallsign = document.getElementById('btn-random-callsign');

    this.shipNameEl = document.getElementById('ship-name-val');
    this.shipClassEl = document.getElementById('ship-class-val');
    this.btnPrevShip = document.getElementById('btn-prev-ship');
    this.btnNextShip = document.getElementById('btn-next-ship');
    this.colorSwatchesGrid = document.getElementById('color-swatches-grid');

    this.btnQuickPlay = document.getElementById('btn-quick-play');
    this.iconQuickPlay = document.getElementById('icon-quick-play');
    this.textQuickPlay = document.getElementById('text-quick-play');

    this.btnBrowseLobbies = document.getElementById('btn-browse-lobbies');
    this.btnCreateLobbyModal = document.getElementById('btn-create-lobby-modal');
    this.btnJoinCodeModal = document.getElementById('btn-join-code-modal');
    this.btnSoloPractice = document.getElementById('btn-solo-practice');

    // Modals
    this.modalBrowser = document.getElementById('modal-browser');
    this.btnCloseBrowser = document.getElementById('btn-close-browser');
    this.btnBrowserRefresh = document.getElementById('btn-browser-refresh');
    this.inputBrowserSearch = document.getElementById('input-browser-search');
    this.browserTbody = document.getElementById('browser-tbody');

    this.modalCreate = document.getElementById('modal-create');
    this.btnCloseCreate = document.getElementById('btn-close-create');
    this.btnCancelCreate = document.getElementById('btn-cancel-create');
    this.formCreateMatch = document.getElementById('form-create-match');
    this.btnSubmitCreate = document.getElementById('btn-submit-create');
    this.createBtnIcon = document.getElementById('create-btn-icon');
    this.createBtnText = document.getElementById('create-btn-text');

    this.modalJoinCode = document.getElementById('modal-join-code');
    this.btnCloseJoinCode = document.getElementById('btn-close-join-code');
    this.btnCancelJoinCode = document.getElementById('btn-cancel-join-code');
    this.formJoinCode = document.getElementById('form-join-code');
    this.inputRoomCodeDirect = document.getElementById('input-room-code-direct');
    this.btnSubmitJoinCode = document.getElementById('btn-submit-join-code');
    this.joinCodeBtnIcon = document.getElementById('join-code-btn-icon');
    this.joinCodeBtnText = document.getElementById('join-code-btn-text');

    // Staging
    this.screenMain = document.getElementById('screen-main');
    this.screenStaging = document.getElementById('screen-staging');
    this.stagingRoomName = document.getElementById('staging-room-name');
    this.stagingRoomCode = document.getElementById('staging-room-code');
    this.btnCopyLink = document.getElementById('btn-copy-link');
    this.copyLinkIcon = document.getElementById('copy-link-icon');
    this.copyLinkText = document.getElementById('copy-link-text');
    this.stagingPlayerCount = document.getElementById('staging-player-count');
    this.stagingRosterList = document.getElementById('staging-roster-list');
    this.btnStagingLeave = document.getElementById('btn-staging-leave');
    this.btnStagingReady = document.getElementById('btn-staging-ready');
    this.btnStagingLaunch = document.getElementById('btn-staging-launch');
    this.stagingChatMessages = document.getElementById('staging-chat-messages');
    this.stagingChatForm = document.getElementById('staging-chat-form');
    this.stagingChatInput = document.getElementById('staging-chat-input');
    this.toastContainer = document.getElementById('toast-container');

    this.updateShipDisplay();
  }

  setupListeners() {
    // Callsign
    this.inputCallsign?.addEventListener('input', (e) => {
      this.callsign = e.target.value.trim() || 'Pilot';
      localStorage.setItem('spacegame_callsign', this.callsign);
    });

    this.btnRandomCallsign?.addEventListener('click', () => {
      sounds.playClick();
      this.callsign = this.generateRandomCallsign();
      if (this.inputCallsign) this.inputCallsign.value = this.callsign;
      localStorage.setItem('spacegame_callsign', this.callsign);
    });

    // Ship Stepper
    this.btnPrevShip?.addEventListener('click', () => this.cycleShip(-1));
    this.btnNextShip?.addEventListener('click', () => this.cycleShip(1));

    // Color Swatches
    this.colorSwatchesGrid?.querySelectorAll('.color-swatch-circle').forEach(btn => {
      btn.addEventListener('click', () => {
        const themeKey = btn.getAttribute('data-key');
        if (themeKey) {
          this.selectColorTheme(themeKey);
        }
      });
    });

    // Quick Play
    this.btnQuickPlay?.addEventListener('click', async () => {
      if (this.isLoading) return;
      sounds.playClick();
      await this.handleQuickPlay();
    });

    // Browse Rooms Modal
    this.btnBrowseLobbies?.addEventListener('click', () => {
      sounds.playClick();
      this.modalBrowser?.classList.remove('hidden');
      this.refreshBrowser();
    });

    this.btnCloseBrowser?.addEventListener('click', () => {
      this.modalBrowser?.classList.add('hidden');
    });

    this.btnBrowserRefresh?.addEventListener('click', () => {
      sounds.playClick();
      this.refreshBrowser();
    });

    this.inputBrowserSearch?.addEventListener('input', () => {
      this.refreshBrowser();
    });

    // Create Room Modal
    this.btnCreateLobbyModal?.addEventListener('click', () => {
      sounds.playClick();
      this.modalCreate?.classList.remove('hidden');
    });

    this.btnCloseCreate?.addEventListener('click', () => {
      this.modalCreate?.classList.add('hidden');
    });

    this.btnCancelCreate?.addEventListener('click', () => {
      this.modalCreate?.classList.add('hidden');
    });

    this.formCreateMatch?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateMatch();
    });

    // Join Code Modal
    this.btnJoinCodeModal?.addEventListener('click', () => {
      sounds.playClick();
      this.modalJoinCode?.classList.remove('hidden');
      setTimeout(() => this.inputRoomCodeDirect?.focus(), 50);
    });

    this.btnCloseJoinCode?.addEventListener('click', () => {
      this.modalJoinCode?.classList.add('hidden');
    });

    this.btnCancelJoinCode?.addEventListener('click', () => {
      this.modalJoinCode?.classList.add('hidden');
    });

    this.formJoinCode?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = this.inputRoomCodeDirect?.value?.trim().toUpperCase();
      if (code) await this.handleJoinRoom(code);
    });

    // Solo Flight
    this.btnSoloPractice?.addEventListener('click', () => {
      sounds.playClick();
      if (this.onStartSolo) this.onStartSolo();
    });

    // Staging Actions
    this.btnCopyLink?.addEventListener('click', () => {
      sounds.playClick();
      this.copyInviteLink();
    });

    this.btnStagingLeave?.addEventListener('click', async () => {
      sounds.playClick();
      await this.handleLeaveLobby();
    });

    this.btnStagingReady?.addEventListener('click', async () => {
      sounds.playClick();
      await this.handleToggleReady();
    });

    this.btnStagingLaunch?.addEventListener('click', async () => {
      sounds.playClick();
      await this.handleLaunchBattle();
    });

    // Staging Chat
    this.stagingChatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.stagingChatInput?.value?.trim();
      if (text && this.client) {
        this.client.relay('CHAT_MESSAGE', { sender: this.callsign, text }, 'all');
        this.stagingChatInput.value = '';
      }
    });
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  setServerStatus(isOnline, pingMs = 0) {
    if (!this.navStatus || !this.navStatusText) return;
    const dot = this.navStatus.querySelector('.status-indicator-dot');

    if (isOnline) {
      if (dot) dot.style.background = '#22c55e';
      this.navStatusText.textContent = `Connected · ${pingMs || 0}ms`;
    } else {
      if (dot) dot.style.background = '#e2e8f0';
      this.navStatusText.textContent = 'Connecting...';
    }
  }

  cycleShip(delta) {
    sounds.playClick();
    this.selectedShipIndex = (this.selectedShipIndex + delta + SPACESHIP_CONFIGS.length) % SPACESHIP_CONFIGS.length;
    localStorage.setItem('spacegame_ship_index', this.selectedShipIndex);
    this.updateShipDisplay();

    // Live update 3D ship in background
    if (this.spaceship && typeof this.spaceship.selectShip === 'function') {
      this.spaceship.selectShip(this.selectedShipIndex).then(() => {
        if (!this.spaceship.enabled) {
          this.spaceship.root.position.set(-1.8, -0.15, 0);
        }
        // Re-apply selected color theme to newly loaded model
        this.selectColorTheme(this.selectedThemeKey, false);
      }).catch(err => {
        console.warn('Failed to switch ship model in background:', err);
      });
    }

    if (this.client && this.client.room) {
      const cfg = SPACESHIP_CONFIGS[this.selectedShipIndex];
      this.client.updatePlayerState({
        shipIndex: this.selectedShipIndex,
        shipName: cfg.name,
      });
    }
  }

  selectColorTheme(themeKey, playSound = true) {
    if (playSound) sounds.playClick();
    this.selectedThemeKey = themeKey;
    localStorage.setItem('spacegame_theme_key', themeKey);

    // Update active state on swatch buttons
    this.colorSwatchesGrid?.querySelectorAll('.color-swatch-circle').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-key') === themeKey);
    });

    // Apply directly to 3D ship preview
    if (this.spaceship && typeof this.spaceship.setColorTheme === 'function') {
      this.spaceship.setColorTheme(themeKey);
    }
  }

  updateShipDisplay() {
    const config = SPACESHIP_CONFIGS[this.selectedShipIndex] || SPACESHIP_CONFIGS[0];
    if (this.shipNameEl) this.shipNameEl.textContent = config.name;
    if (this.shipClassEl) this.shipClassEl.textContent = config.class || 'Assault Fighter';
  }

  checkDeepLink() {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      const cleanCode = joinCode.trim().toUpperCase();
      this.showToast(`Found invite link for Room #${cleanCode}.`, 'info');
      this.handleJoinRoom(cleanCode);
    }
  }

  copyInviteLink() {
    if (!this.client || !this.client.room) return;
    const roomCode = this.client.room.code;
    const url = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      if (this.copyLinkIcon) this.copyLinkIcon.innerHTML = Icons.check(14);
      if (this.copyLinkText) this.copyLinkText.textContent = 'Copied!';
      setTimeout(() => {
        if (this.copyLinkIcon) this.copyLinkIcon.innerHTML = Icons.copy(14);
        if (this.copyLinkText) this.copyLinkText.textContent = 'Copy Link';
      }, 2000);
      this.showToast(`Invite link copied to clipboard.`, 'success');
    }).catch(() => {
      this.showToast(`Room Code: ${roomCode}`, 'info');
    });
  }

  // --- API & Matchmaking Actions ---
  async handleQuickPlay() {
    this.setButtonLoading(this.btnQuickPlay, this.iconQuickPlay, this.textQuickPlay, true, 'Searching...');
    try {
      await this.ensureConnected();

      const res = await this.client.quickJoin({
        player: {
          name: this.callsign,
          customData: {
            shipIndex: this.selectedShipIndex,
            shipName: SPACESHIP_CONFIGS[this.selectedShipIndex].name,
            themeKey: this.selectedThemeKey
          }
        },
        roomOptions: {
          name: 'Open Sector',
          gameType: 'spacebattle',
          maxPlayers: 8,
          customData: {
            skybox: 'blue_nebula',
            gameMode: 'Dogfight'
          }
        }
      });

      this.enterStagingLobby(res.room);
    } catch (err) {
      console.error('Quick play error:', err);
      this.showToast(err.message || 'Unable to join. Try creating a room.', 'error');
    } finally {
      this.setButtonLoading(this.btnQuickPlay, this.iconQuickPlay, this.textQuickPlay, false, 'Quick Play', Icons.play(16));
    }
  }

  async handleJoinRoom(roomCode) {
    this.setButtonLoading(this.btnSubmitJoinCode, this.joinCodeBtnIcon, this.joinCodeBtnText, true, 'Joining...');
    try {
      await this.ensureConnected();

      const res = await this.client.joinRoom({
        roomCode,
        player: {
          name: this.callsign,
          customData: {
            shipIndex: this.selectedShipIndex,
            shipName: SPACESHIP_CONFIGS[this.selectedShipIndex].name,
            themeKey: this.selectedThemeKey
          }
        }
      });

      this.modalJoinCode?.classList.add('hidden');
      this.enterStagingLobby(res.room);
    } catch (err) {
      console.error('Join error:', err);
      this.showToast(err.message || `Room #${roomCode} not found. Check code.`, 'error');
    } finally {
      this.setButtonLoading(this.btnSubmitJoinCode, this.joinCodeBtnIcon, this.joinCodeBtnText, false, 'Join Room', Icons.play(16));
    }
  }

  async handleCreateMatch() {
    this.setButtonLoading(this.btnSubmitCreate, this.createBtnIcon, this.createBtnText, true, 'Creating...');
    try {
      const name = document.getElementById('create-room-name')?.value?.trim() || `${this.callsign}'s Game`;
      const maxPlayers = parseInt(document.getElementById('create-max-players')?.value || '8', 10);
      const skybox = document.getElementById('create-skybox')?.value || 'blue_nebula';
      const isPrivate = document.getElementById('create-is-private')?.checked || false;

      await this.ensureConnected();

      const res = await this.client.createRoom({
        name,
        gameType: 'spacebattle',
        maxPlayers,
        isPrivate,
        customData: {
          skybox,
          gameMode: 'Dogfight',
        },
        player: {
          name: this.callsign,
          customData: {
            shipIndex: this.selectedShipIndex,
            shipName: SPACESHIP_CONFIGS[this.selectedShipIndex].name,
            themeKey: this.selectedThemeKey
          }
        }
      });

      this.modalCreate?.classList.add('hidden');
      this.enterStagingLobby(res.room);
    } catch (err) {
      console.error('Create room error:', err);
      this.showToast(err.message || 'Unable to create room.', 'error');
    } finally {
      this.setButtonLoading(this.btnSubmitCreate, this.createBtnIcon, this.createBtnText, false, 'Create Room', Icons.plus(16));
    }
  }

  async refreshBrowser() {
    if (!this.browserTbody) return;
    this.browserTbody.innerHTML = `<tr><td colspan="5" class="table-empty">${Icons.loader(16)} Loading rooms...</td></tr>`;

    try {
      const query = this.inputBrowserSearch?.value?.trim() || '';
      const rooms = await this.client.fetchPublicRooms({ gameType: 'spacebattle', search: query });

      if (rooms.length === 0) {
        this.browserTbody.innerHTML = `<tr><td colspan="5" class="table-empty">No active rooms found.</td></tr>`;
        return;
      }

      this.browserTbody.innerHTML = rooms.map(r => `
        <tr>
          <td><span class="cell-primary">${escapeHTML(r.name)}</span></td>
          <td><span class="code-pill">${escapeHTML(r.code)}</span></td>
          <td>${r.playerCount} / ${r.maxPlayers}</td>
          <td><span class="status-pill status-${r.status}">${r.status === 'playing' ? 'In Match' : 'Lobby'}</span></td>
          <td class="text-right">
            <button class="btn-glass-sm btn-join-table" data-code="${r.code}">
              Join
            </button>
          </td>
        </tr>
      `).join('');

      this.browserTbody.querySelectorAll('.btn-join-table').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-code');
          if (code) {
            this.modalBrowser?.classList.add('hidden');
            this.handleJoinRoom(code);
          }
        });
      });
    } catch (err) {
      this.browserTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load rooms. Please retry.</td></tr>`;
    }
  }

  setButtonLoading(btnEl, iconEl, textEl, loading, label, restoreIcon = null) {
    if (!btnEl) return;
    btnEl.disabled = loading;
    if (loading) {
      if (iconEl) iconEl.innerHTML = Icons.loader(15);
      if (textEl) textEl.textContent = label;
    } else {
      if (iconEl && restoreIcon) iconEl.innerHTML = restoreIcon;
      if (textEl) textEl.textContent = label;
    }
  }

  async ensureConnected() {
    if (!this.client.isConnected) {
      await this.client.connect();
    }
  }

  enterStagingLobby(room) {
    this.currentScreen = 'lobby';
    this.screenMain?.classList.add('hidden');
    this.screenStaging?.classList.remove('hidden');

    this.isHost = room.hostId === this.client.playerId;
    this.isReady = false;

    if (this.stagingRoomName) this.stagingRoomName.textContent = room.name;
    if (this.stagingRoomCode) this.stagingRoomCode.textContent = room.code;

    if (room.customData?.skybox && this.skyboxManager) {
      this.skyboxManager.loadSkybox(room.customData.skybox).catch(() => {});
    }

    this.updateRosterUI(room);

    if (this.btnStagingLaunch) {
      this.btnStagingLaunch.classList.toggle('hidden', !this.isHost);
    }

    this.showToast(`Joined Room #${room.code}.`, 'info');
  }

  updateRosterUI(room = this.client?.room) {
    if (!room || !this.stagingRosterList) return;

    const players = room.players || [];
    if (this.stagingPlayerCount) {
      this.stagingPlayerCount.textContent = `${players.length}/${room.maxPlayers}`;
    }

    this.isHost = room.hostId === this.client.playerId;
    if (this.btnStagingLaunch) {
      this.btnStagingLaunch.classList.toggle('hidden', !this.isHost);
    }

    this.stagingRosterList.innerHTML = players.map(p => {
      const isMe = p.id === this.client.playerId;
      const isPlayerHost = p.id === room.hostId;
      const isReady = p.ready;
      const shipName = p.customData?.shipName || 'StarSparrow';

      return `
        <div class="roster-pill-row ${isMe ? 'is-me' : ''}">
          <div class="roster-pill-left">
            <span class="roster-pilot-name">${escapeHTML(p.name)}</span>
            ${isPlayerHost ? '<span class="badge-neutral">Host</span>' : ''}
            ${isMe ? '<span class="badge-neutral">You</span>' : ''}
            <span class="roster-vessel-name">${escapeHTML(shipName)}</span>
          </div>
          <div class="roster-pill-right">
            <span class="ready-dot ${isReady ? 'is-ready' : ''}" title="${isReady ? 'Ready' : 'Not Ready'}"></span>
            ${this.isHost && !isMe ? `<button class="btn-kick-tiny" data-id="${p.id}" title="Remove player">×</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (this.isHost) {
      this.stagingRosterList.querySelectorAll('.btn-kick-tiny').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (id) {
            await this.client.kickPlayer(id);
            this.showToast('Player removed.', 'info');
          }
        });
      });
    }
  }

  addLobbyChatMessage(sender, text) {
    if (!this.stagingChatMessages) return;
    const msg = document.createElement('div');
    msg.className = 'chat-line';
    msg.innerHTML = `<span class="chat-author">${escapeHTML(sender)}:</span> <span class="chat-body">${escapeHTML(text)}</span>`;
    this.stagingChatMessages.appendChild(msg);
    this.stagingChatMessages.scrollTop = this.stagingChatMessages.scrollHeight;
  }

  async handleToggleReady() {
    this.isReady = !this.isReady;
    if (this.btnStagingReady) {
      this.btnStagingReady.textContent = this.isReady ? 'Unready' : 'Ready';
      this.btnStagingReady.classList.toggle('active', this.isReady);
    }
    await this.client.setReady(this.isReady);
  }

  async handleLaunchBattle() {
    try {
      await this.client.startGame({ lockRoom: true });
      if (this.onEnterBattle) {
        this.onEnterBattle(this.client.room);
      }
    } catch (err) {
      this.showToast(err.message || 'Unable to start match.', 'error');
    }
  }

  async handleLeaveLobby() {
    try {
      await this.client.leaveRoom();
    } catch {
      // ignore
    }
    this.returnToMainMenu();
  }

  returnToMainMenu() {
    this.currentScreen = 'main';
    this.screenStaging?.classList.add('hidden');
    this.screenMain?.classList.remove('hidden');
    this.root.classList.add('visible');
    if (this.onLeaveToMenu) {
      this.onLeaveToMenu();
    }
  }

  hideAll() {
    this.root.classList.remove('visible');
    this.screenMain?.classList.add('hidden');
    this.screenStaging?.classList.add('hidden');
  }

  showMenu() {
    this.root.classList.add('visible');
    if (this.currentScreen === 'lobby') {
      this.screenStaging?.classList.remove('hidden');
    } else {
      this.screenMain?.classList.remove('hidden');
    }
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
