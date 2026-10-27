/**
 * LobbyUI.js
 * High-octane sci-fi UI for StarSparrow / Kraters.
 * Remade layout: 3D Spaceship showcase on the LEFT, clean progressive Step/Submenu options on the RIGHT.
 * Supported across mobile landscape, tablets, laptops, and ultra-wide desktops.
 */

import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';
import { SPARROW_THEMES } from './StarSparrowMaterial.js';
import { sounds } from './SoundManager.js';
import { Icons } from './Icons.js';
import { MAPS_CONFIG, getMapById, getDefaultMap } from './mapsConfig.js';

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
  constructor(options = {}) {
    this.client = options.client;
    this.spaceship = options.spaceship;
    this.skyboxManager = options.skyboxManager;
    this.mapManager = options.mapManager || null;

    this.onStartSolo = options.onStartSolo || null;
    this.onEnterBattle = options.onEnterBattle || null;
    this.onLeaveToMenu = options.onLeaveToMenu || null;
    this.onOpenSettings = options.onOpenSettings || null;

    // Load saved settings
    this.callsign = localStorage.getItem('spacegame_callsign') || this.generateRandomCallsign();
    this.selectedShipIndex = parseInt(localStorage.getItem('spacegame_ship_index') || '0', 10);
    if (this.selectedShipIndex >= SPACESHIP_CONFIGS.length) this.selectedShipIndex = 0;

    this.selectedThemeKey = localStorage.getItem('spacegame_theme_key') || 'Cyan';

    this.currentScreen = 'main'; // 'main', 'lobby'
    this.currentStep = 'main';   // 'main', 'play', 'solo-map', 'multiplayer', 'hangar', 'pilot', 'controls', 'settings', 'credits'
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

    const activeMap = this.mapManager?.getCurrentMap?.() 
      || getMapById(this.mapManager?.getStoredMapId?.())
      || getDefaultMap();
    const activeMapId = activeMap.id;

    this.root.innerHTML = `
      <!-- ================= MAIN MENU SCREEN (Spaceship on Left, Menu Steps on Right) ================= -->
      <div class="lobby-screen screen-main screen-split-layout" id="screen-main">

        <!-- ================= LEFT SIDE: OPEN 3D SHIP VIEWPORT & TELEMETRY ================= -->
        <div class="menu-left-viewport" id="ship-viewport-space">
          <!-- Sleek Tactical Vessel Watermark Overlay -->
          <div class="vessel-watermark-overlay" id="vessel-watermark">
            <div class="watermark-badge-row">
              <span class="watermark-badge">VESSEL IN HANGAR</span>
              <span class="watermark-counter" id="watermark-ship-counter">01 / ${SPACESHIP_CONFIGS.length}</span>
            </div>
            <div class="watermark-ship-name" id="watermark-ship-name">StarSparrow 1</div>
            <div class="watermark-stats-line">
              <span class="wm-stat"><span class="wm-stat-lbl">SPD</span> <span class="wm-stat-val" id="watermark-spd-val">55</span></span>
              <span class="wm-divider">/</span>
              <span class="wm-stat"><span class="wm-stat-lbl">BST</span> <span class="wm-stat-val" id="watermark-bst-val">121</span></span>
              <span class="wm-divider">/</span>
              <span class="wm-stat"><span class="wm-stat-lbl">AGL</span> <span class="wm-stat-val" id="watermark-agl-val">88%</span></span>
            </div>
            <div class="watermark-hint">
              ${Icons.refresh(13)}
              <span>DRAG TO INSPECT 360°</span>
            </div>
          </div>
        </div>

        <!-- ================= RIGHT SIDE: MENU OPTIONS (STEP / SUBMENU SYSTEM) ================= -->
        <aside class="menu-right-panel" id="panel-menu">
          <div class="arcade-card main-nav-card" id="menu-nav-card">

            <!-- ================= STEP 1: ROOT TITLE & MAIN MENU ================= -->
            <div class="menu-step-container active" id="step-main">
              <!-- Game Title Header Block -->
              <div class="menu-title-block">
                <h1 class="title-logo-text">KRATERS</h1>
                <div class="title-meta-bar">
                  <div class="meta-status-pill" id="nav-status">
                    <span class="status-indicator-dot"></span>
                    <span class="status-indicator-text" id="nav-status-text">Connected</span>
                  </div>
                  <div class="meta-pilot-input-wrap" title="Edit Pilot Callsign">
                    <span class="pilot-tag-label">PILOT</span>
                    <input type="text" id="input-callsign" class="pilot-tag-input" maxlength="16" spellcheck="false" autocomplete="off" value="${escapeHTML(this.callsign)}" placeholder="Callsign" />
                    <button id="btn-random-callsign" class="icon-btn-ghost btn-random-pilot" title="Random Callsign" aria-label="Random Callsign" type="button">
                      ${Icons.shuffle(13)}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Primary Action Stack -->
              <div class="nav-options-stack">
                <!-- 1. Play Mission (Primary Radiant CTA) -->
                <button id="btn-goto-play" class="arcade-btn arcade-btn-sp" type="button">
                  <span class="arcade-btn-icon">${Icons.play(18)}</span>
                  <span class="arcade-btn-label">PLAY MISSION</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(18)}</span>
                </button>

                <!-- 2. Fleet Hangar (Ship Customization) -->
                <button id="btn-goto-hangar" class="arcade-btn arcade-btn-sub" type="button">
                  <span class="arcade-btn-icon">${Icons.rocket(18)}</span>
                  <span class="arcade-btn-label">FLEET HANGAR</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(16)}</span>
                </button>

                <!-- 4. Flight Controls -->
                <button id="btn-goto-controls" class="arcade-btn arcade-btn-sub" type="button">
                  <span class="arcade-btn-icon">${Icons.gamepad(18)}</span>
                  <span class="arcade-btn-label">FLIGHT CONTROLS</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(16)}</span>
                </button>

                <!-- 5. Settings -->
                <button id="btn-goto-settings" class="arcade-btn arcade-btn-sub" type="button">
                  <span class="arcade-btn-icon">${Icons.settings(18)}</span>
                  <span class="arcade-btn-label">SETTINGS</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(16)}</span>
                </button>

                <!-- 6. Credits -->
                <button id="btn-goto-credits" class="arcade-btn arcade-btn-sub" type="button">
                  <span class="arcade-btn-icon">${Icons.info(18)}</span>
                  <span class="arcade-btn-label">CREDITS</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(16)}</span>
                </button>
              </div>
            </div>

            <!-- ================= STEP 2: PLAY MODE SELECTION (STEP 01 // 02) ================= -->
            <div class="menu-step-container" id="step-play">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="main" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>MAIN</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">STEP 01 // 02</span>
                  <span class="subnav-title">MISSION MODE</span>
                </div>
              </div>

              <div class="nav-options-stack">
                <!-- Solo Mode Card -->
                <button id="btn-select-solo" class="step-card-btn mode-card-solo" type="button">
                  <div class="step-card-content">
                    <div class="step-card-title-row">
                      <span class="step-card-title">SINGLEPLAYER</span>
                    </div>
                    <p class="step-card-desc">Survive waves of enemy ships as long as you can</p>
                  </div>
                  <span class="step-card-chevron">${Icons.chevronRight(18)}</span>
                </button>

                <!-- Multiplayer Mode Card -->
                <button id="btn-select-multiplayer" class="step-card-btn mode-card-mp" type="button">
                  <div class="step-card-content">
                    <div class="step-card-title-row">
                      <span class="step-card-title">MULTIPLAYER ARENA</span>
                    </div>
                    <p class="step-card-desc">Real-time multiplayer gameplay, instant matchmaking, and custom private rooms.</p>
                  </div>
                  <span class="step-card-chevron">${Icons.chevronRight(18)}</span>
                </button>
              </div>
            </div>

            <!-- ================= STEP 3: SOLO MAP SELECTION & LAUNCH (STEP 02 // 02) ================= -->
            <div class="menu-step-container" id="step-solo-map">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="play" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>BACK</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">STEP 02 // 02</span>
                  <span class="subnav-title">DEPLOY SECTOR</span>
                </div>
              </div>

              <!-- Selected Map Hero Card -->
              <div class="sector-preview-hero" id="solo-sector-hero">
                <div class="sector-hero-top">
                  <span class="sector-hero-badge" id="solo-sector-badge">${activeMap.badge}</span>
                  <span class="sector-hazard-badge" id="solo-sector-hazard">
                    ${activeMap.asteroids?.enabled !== false ? 'Asteroids Active' : 'Clear Space'}
                  </span>
                </div>
                <div class="sector-hero-name" id="solo-sector-name">${activeMap.name}</div>
                <div class="sector-hero-desc" id="solo-sector-desc">${activeMap.description}</div>
              </div>

              <!-- Arena Map Selection Section -->
              <div class="sector-selector-section">
                <span class="panel-section-label">SELECT COMBAT ZONE</span>
                <div class="menu-skybox-grid menu-map-grid" id="menu-map-grid">
                  ${MAPS_CONFIG.map(m => `
                    <button class="menu-skybox-btn menu-map-btn ${m.id === activeMapId ? 'active' : ''}" 
                            data-map-id="${m.id}" 
                            type="button" 
                            title="${m.description}">
                      <span class="menu-skybox-dot menu-map-dot" style="background: ${m.color}; box-shadow: 0 0 8px ${m.glow};"></span>
                      <span class="menu-skybox-label menu-map-label">${m.shortName}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Launch Solo Battle CTA Button -->
              <button id="btn-launch-solo" class="arcade-btn arcade-btn-sp arcade-btn-launch" type="button">
                <span class="arcade-btn-icon">${Icons.zap(20)}</span>
                <span class="arcade-btn-label">LAUNCH MISSION</span>
                <span class="arcade-btn-chevron">${Icons.chevronRight(18)}</span>
              </button>
            </div>

            <!-- ================= STEP 4: MULTIPLAYER HUB (STEP 02 // 02) ================= -->
            <div class="menu-step-container" id="step-multiplayer">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="play" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>BACK</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">STEP 02 // 02</span>
                  <span class="subnav-title">MULTIPLAYER</span>
                </div>
              </div>

              <div class="nav-options-stack">
                <!-- Quick Play -->
                <button id="btn-quick-play" class="arcade-btn arcade-btn-sp" type="button">
                  <span class="arcade-btn-icon" id="icon-quick-play">${Icons.play(18)}</span>
                  <span class="arcade-btn-label" id="text-quick-play">QUICK PLAY</span>
                </button>

                <!-- Browse & Create Grid -->
                <div class="action-grid-buttons">
                  <button id="btn-browse-lobbies" class="arcade-btn arcade-btn-sub" type="button">
                    <span class="arcade-btn-icon">${Icons.list(15)}</span>
                    <span class="arcade-btn-label">BROWSE</span>
                  </button>

                  <button id="btn-create-lobby-modal" class="arcade-btn arcade-btn-sub" type="button">
                    <span class="arcade-btn-icon">${Icons.plus(15)}</span>
                    <span class="arcade-btn-label">CREATE</span>
                  </button>

                  <button id="btn-join-code-modal" class="arcade-btn arcade-btn-sub btn-col-span-2" type="button">
                    <span class="arcade-btn-icon">${Icons.hash(15)}</span>
                    <span class="arcade-btn-label">JOIN VIA CODE</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ================= STEP 5: FLEET HANGAR (SHIP CUSTOMIZATION) ================= -->
            <div class="menu-step-container" id="step-hangar">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="main" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>MAIN</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">FIGHTERS</span>
                  <span class="subnav-title">CUSTOMIZE SHIP</span>
                </div>
              </div>

              <!-- Vessel Selection Stepper -->
              <div class="ship-selector-hero">
                <button id="btn-prev-ship" class="arcade-stepper-btn" aria-label="Previous Ship">
                  ${Icons.chevronLeft(20)}
                </button>
                <div class="ship-hero-info">
                  <h2 class="ship-title-text" id="ship-name-val">StarSparrow 1</h2>
                  <span class="ship-counter-badge" id="ship-counter-badge">01 / ${SPACESHIP_CONFIGS.length}</span>
                </div>
                <button id="btn-next-ship" class="arcade-stepper-btn" aria-label="Next Ship">
                  ${Icons.chevronRight(20)}
                </button>
              </div>

              <!-- Tactical Specifications -->
              <div class="ship-specs-container">
                <div class="spec-row">
                  <div class="spec-header">
                    <span class="spec-label">TOP SPEED</span>
                    <span class="spec-val" id="spec-speed-val">55 m/s</span>
                  </div>
                  <div class="spec-track">
                    <div class="spec-fill" id="spec-speed-fill" style="width: 70%;"></div>
                  </div>
                </div>

                <div class="spec-row">
                  <div class="spec-header">
                    <span class="spec-label">BOOST TURBO</span>
                    <span class="spec-val" id="spec-boost-val">121 m/s</span>
                  </div>
                  <div class="spec-track">
                    <div class="spec-fill spec-fill-boost" id="spec-boost-fill" style="width: 80%;"></div>
                  </div>
                </div>

                <div class="spec-row">
                  <div class="spec-header">
                    <span class="spec-label">AGILITY / ROLL</span>
                    <span class="spec-val" id="spec-agility-val">88%</span>
                  </div>
                  <div class="spec-track">
                    <div class="spec-fill spec-fill-agility" id="spec-agility-fill" style="width: 88%;"></div>
                  </div>
                </div>
              </div>

              <!-- Paint Scheme Swatches -->
              <div class="panel-section">
                <span class="panel-section-label">HULL PAINT SCHEME</span>
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
            </div>

            <!-- ================= FLIGHT CONTROLS ================= -->
            <div class="menu-step-container" id="step-controls">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="main" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>MAIN</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">FLIGHT MANUAL</span>
                  <span class="subnav-title">CONTROLS GUIDE</span>
                </div>
              </div>

              <div class="controls-guide-body">
                <div class="controls-section-title">KEYBOARD & MOUSE</div>
                <div class="control-key-item"><span class="control-key-badge">W / S</span><span class="control-key-desc">Throttle Up / Reverse</span></div>
                <div class="control-key-item"><span class="control-key-badge">A / D</span><span class="control-key-desc">Turn Left / Right (Bank)</span></div>
                <div class="control-key-item"><span class="control-key-badge">Up / Down</span><span class="control-key-desc">Pitch Dive / Climb</span></div>
                <div class="control-key-item"><span class="control-key-badge">Q / E</span><span class="control-key-desc">Yaw Rudder Left / Right</span></div>
                <div class="control-key-item"><span class="control-key-badge">Space / Shift</span><span class="control-key-desc">Afterburner Boost Turbo</span></div>
                <div class="control-key-item"><span class="control-key-badge">Enter / F / Click</span><span class="control-key-desc">Fire Pulse Lasers</span></div>
                <div class="control-key-item"><span class="control-key-badge">Esc / O</span><span class="control-key-desc">In-Game Tactical Options</span></div>

                <div class="controls-section-title" style="margin-top: 10px;">MOBILE & TOUCH</div>
                <div class="control-key-item"><span class="control-key-badge">Left Joystick</span><span class="control-key-desc">Flight Steering & Throttle</span></div>
                <div class="control-key-item"><span class="control-key-badge">Right Button</span><span class="control-key-desc">Rapid Weapon Fire</span></div>
              </div>
            </div>

            <!-- ================= STEP 8: SYSTEM SETTINGS ================= -->
            <div class="menu-step-container" id="step-settings">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="main" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>MAIN</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">SYSTEM CONFIG</span>
                  <span class="subnav-title">SETTINGS</span>
                </div>
              </div>

              <div class="settings-guide-body">
                <!-- Fullscreen Toggle -->
                <div class="settings-action-row">
                  <div class="settings-info">
                    <span class="settings-title">FULLSCREEN</span>
                    <span class="settings-desc">Borderless display mode</span>
                  </div>
                  <button id="btn-toggle-fullscreen-menu" class="btn-glass-sm" type="button">Toggle</button>
                </div>

                <!-- Dev Stats HUD -->
                <div class="settings-action-row">
                  <div class="settings-info">
                    <span class="settings-title">DEV STATS HUD</span>
                    <span class="settings-desc">FPS, latency, draw calls</span>
                  </div>
                  <button id="btn-toggle-devstats-menu" class="btn-glass-sm" type="button">Toggle</button>
                </div>

                <!-- Open Full In-Game Options Modal -->
                <button id="btn-open-full-settings" class="arcade-btn arcade-btn-sub" style="margin-top: 10px;" type="button">
                  <span class="arcade-btn-icon">${Icons.settings(16)}</span>
                  <span class="arcade-btn-label">ADVANCED OPTIONS</span>
                  <span class="arcade-btn-chevron">${Icons.chevronRight(16)}</span>
                </button>
              </div>
            </div>

            <!-- ================= STEP 9: CREDITS ================= -->
            <div class="menu-step-container" id="step-credits">
              <div class="subnav-header">
                <button class="btn-subnav-back" data-back-to="main" type="button">
                  ${Icons.arrowLeft(15)}
                  <span>MAIN</span>
                </button>
                <div class="subnav-title-group">
                  <span class="subnav-step-badge">TRANSMISSION</span>
                  <span class="subnav-title">CREDITS</span>
                </div>
              </div>

              <div class="credits-body">
                <div class="credits-item"><span class="credits-role">Engine</span><span class="credits-val">Three.js PBR WebGL</span></div>
                <div class="credits-item"><span class="credits-role">Vessels</span><span class="credits-val">StarSparrow Modular Fleet</span></div>
                <div class="credits-item"><span class="credits-role">Audio</span><span class="credits-val">Web Audio API Synthesizer</span></div>
                <div class="credits-item"><span class="credits-role">Network</span><span class="credits-val">WebSocket Real-Time Protocol</span></div>
                <div class="credits-item"><span class="credits-role">Typography</span><span class="credits-val">Outfit Variable Sans</span></div>
              </div>
            </div>

          </div>
        </aside>
      </div>

      <!-- ================= PUBLIC ROOMS BROWSER MODAL ================= -->
      <div class="modal-backdrop hidden" id="modal-browser">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">ROOMS</h3>
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
            <h3 class="modal-title">CREATE ROOM</h3>
            <button class="icon-btn-ghost" id="btn-close-create" title="Close" aria-label="Close">
              ${Icons.x(18)}
            </button>
          </div>

          <form id="form-create-match" class="minimal-form">
            <div class="form-field">
              <label for="create-room-name">Room Name</label>
              <input type="text" id="create-room-name" value="${escapeHTML(this.callsign)}'s Game" maxlength="28" required />
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
                <label for="create-map">Arena Map</label>
                <select id="create-map">
                  ${MAPS_CONFIG.map(m => `
                    <option value="${m.id}" ${m.id === activeMapId ? 'selected' : ''}>${m.name} (${m.badge})</option>
                  `).join('')}
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
            <h3 class="modal-title">JOIN ROOM</h3>
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
    this.screenMain = document.getElementById('screen-main');
    this.panelMenu = document.getElementById('panel-menu');

    // Left Viewport Watermark elements
    this.watermarkShipCounter = document.getElementById('watermark-ship-counter');
    this.watermarkShipName = document.getElementById('watermark-ship-name');
    this.watermarkSpdVal = document.getElementById('watermark-spd-val');
    this.watermarkBstVal = document.getElementById('watermark-bst-val');
    this.watermarkAglVal = document.getElementById('watermark-agl-val');

    // Title / Status elements
    this.navStatus = document.getElementById('nav-status');
    this.navStatusText = document.getElementById('nav-status-text');
    this.inputCallsign = document.getElementById('input-callsign');
    this.btnRandomCallsign = document.getElementById('btn-random-callsign');

    // Hangar elements
    this.shipCounterEl = document.getElementById('ship-counter-badge');
    this.shipNameEl = document.getElementById('ship-name-val');
    this.btnPrevShip = document.getElementById('btn-prev-ship');
    this.btnNextShip = document.getElementById('btn-next-ship');
    this.colorSwatchesGrid = document.getElementById('color-swatches-grid');

    // Tactical Specs elements
    this.specSpeedVal = document.getElementById('spec-speed-val');
    this.specSpeedFill = document.getElementById('spec-speed-fill');
    this.specBoostVal = document.getElementById('spec-boost-val');
    this.specBoostFill = document.getElementById('spec-boost-fill');
    this.specAgilityVal = document.getElementById('spec-agility-val');
    this.specAgilityFill = document.getElementById('spec-agility-fill');

    // Solo Map Preview elements
    this.soloSectorBadge = document.getElementById('solo-sector-badge');
    this.soloSectorHazard = document.getElementById('solo-sector-hazard');
    this.soloSectorName = document.getElementById('solo-sector-name');
    this.soloSectorDesc = document.getElementById('solo-sector-desc');

    // Multiplayer actions
    this.btnQuickPlay = document.getElementById('btn-quick-play');
    this.iconQuickPlay = document.getElementById('icon-quick-play');
    this.textQuickPlay = document.getElementById('text-quick-play');
    this.btnBrowseLobbies = document.getElementById('btn-browse-lobbies');
    this.btnCreateLobbyModal = document.getElementById('btn-create-lobby-modal');
    this.btnJoinCodeModal = document.getElementById('btn-join-code-modal');

    // Browser Modal
    this.modalBrowser = document.getElementById('modal-browser');
    this.btnCloseBrowser = document.getElementById('btn-close-browser');
    this.btnBrowserRefresh = document.getElementById('btn-browser-refresh');
    this.inputBrowserSearch = document.getElementById('input-browser-search');
    this.browserTbody = document.getElementById('browser-tbody');

    // Create Modal
    this.modalCreate = document.getElementById('modal-create');
    this.btnCloseCreate = document.getElementById('btn-close-create');
    this.btnCancelCreate = document.getElementById('btn-cancel-create');
    this.formCreateMatch = document.getElementById('form-create-match');
    this.btnSubmitCreate = document.getElementById('btn-submit-create');
    this.createBtnIcon = document.getElementById('create-btn-icon');
    this.createBtnText = document.getElementById('create-btn-text');

    // Join Code Modal
    this.modalJoinCode = document.getElementById('modal-join-code');
    this.btnCloseJoinCode = document.getElementById('btn-close-join-code');
    this.btnCancelJoinCode = document.getElementById('btn-cancel-join-code');
    this.formJoinCode = document.getElementById('form-join-code');
    this.inputRoomCodeDirect = document.getElementById('input-room-code-direct');
    this.btnSubmitJoinCode = document.getElementById('btn-submit-join-code');
    this.joinCodeBtnIcon = document.getElementById('join-code-btn-icon');
    this.joinCodeBtnText = document.getElementById('join-code-btn-text');

    // Staging
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
    // 1. Step Navigation: Back Buttons
    this.root?.querySelectorAll('.btn-subnav-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-back-to') || 'main';
        this.navigateToStep(target);
      });
    });

    // 2. Main Step Buttons
    document.getElementById('btn-goto-play')?.addEventListener('click', () => this.navigateToStep('play'));
    document.getElementById('btn-goto-hangar')?.addEventListener('click', () => this.navigateToStep('hangar'));
    document.getElementById('btn-goto-controls')?.addEventListener('click', () => this.navigateToStep('controls'));
    document.getElementById('btn-goto-settings')?.addEventListener('click', () => this.navigateToStep('settings'));
    document.getElementById('btn-goto-credits')?.addEventListener('click', () => this.navigateToStep('credits'));

    // 3. Play Mode Choices
    document.getElementById('btn-select-solo')?.addEventListener('click', () => this.navigateToStep('solo-map'));
    document.getElementById('btn-select-multiplayer')?.addEventListener('click', () => this.navigateToStep('multiplayer'));

    // 4. Solo Battle Launch
    document.getElementById('btn-launch-solo')?.addEventListener('click', () => {
      sounds.playClick();
      if (this.onStartSolo) this.onStartSolo();
    });

    // 5. Callsign input & randomize (directly in default menu)
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

    // 6. Ship Steppers
    this.btnPrevShip?.addEventListener('click', () => this.cycleShip(-1));
    this.btnNextShip?.addEventListener('click', () => this.cycleShip(1));

    // 7. Color Swatches
    this.colorSwatchesGrid?.querySelectorAll('.color-swatch-circle').forEach(btn => {
      btn.addEventListener('click', () => {
        const themeKey = btn.getAttribute('data-key');
        if (themeKey) this.selectColorTheme(themeKey);
      });
    });

    // 8. Arena Map Selection
    this.root?.querySelectorAll('.menu-map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        const mapId = btn.getAttribute('data-map-id');
        if (mapId) this.selectMap(mapId);
      });
    });

    // Sync when create-map select in Create modal changes
    document.getElementById('create-map')?.addEventListener('change', (e) => {
      this.selectMap(e.target.value);
    });

    // Listen to changes from MapManager
    if (this.mapManager && typeof this.mapManager.onMapChange === 'function') {
      this.mapManager.onMapChange((map) => {
        if (map && map.id) {
          this.updateActiveMapUI(map.id, map.name);
        }
      });
    } else if (this.skyboxManager && typeof this.skyboxManager.onSkyboxChange === 'function') {
      this.skyboxManager.onSkyboxChange((skybox) => {
        if (skybox && skybox.id) {
          this.updateActiveMapUI(skybox.id, skybox.name);
        }
      });
    }

    // 9. Interactive 360 Drag-to-Inspect Vessel on Left Viewport
    const viewportEl = document.getElementById('ship-viewport-space');
    if (viewportEl) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startRotY = 0;
      let startRotX = 0;

      viewportEl.addEventListener('pointerdown', (e) => {
        if (this.currentScreen !== 'main') return;
        isDragging = true;
        window._isUserDraggingShip = true;
        startX = e.clientX;
        startY = e.clientY;
        if (this.spaceship && this.spaceship.root) {
          startRotY = this.spaceship.root.rotation.y;
          startRotX = this.spaceship.root.rotation.x;
        }
        try {
          viewportEl.setPointerCapture?.(e.pointerId);
        } catch {}
      });

      viewportEl.addEventListener('pointermove', (e) => {
        if (!isDragging || !this.spaceship || !this.spaceship.root) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        this.spaceship.root.rotation.y = startRotY + dx * 0.008;
        this.spaceship.root.rotation.x = Math.max(-0.4, Math.min(0.4, startRotX + dy * 0.004));
      });

      const stopDragging = (e) => {
        if (!isDragging) return;
        isDragging = false;
        setTimeout(() => {
          window._isUserDraggingShip = false;
        }, 350);
        try {
          viewportEl.releasePointerCapture?.(e.pointerId);
        } catch {}
      };

      viewportEl.addEventListener('pointerup', stopDragging);
      viewportEl.addEventListener('pointercancel', stopDragging);
    }

    // 10. Settings Toggles
    document.getElementById('btn-toggle-fullscreen-menu')?.addEventListener('click', async () => {
      sounds.playClick();
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          this.showToast('Fullscreen enabled', 'info');
        } else {
          await document.exitFullscreen();
          this.showToast('Fullscreen disabled', 'info');
        }
      } catch (err) {
        this.showToast('Fullscreen request rejected by browser', 'error');
      }
    });

    document.getElementById('btn-toggle-devstats-menu')?.addEventListener('click', () => {
      sounds.playClick();
      const current = localStorage.getItem('spacegame_dev_stats') === 'true';
      const next = !current;
      localStorage.setItem('spacegame_dev_stats', String(next));
      if (this.onOpenSettings) {
        // OptionsMenu listens to devStatsEnabled
      }
      this.showToast(`Dev Stats ${next ? 'enabled' : 'disabled'}`, 'info');
      // Trigger dev stats toggle if global reference exists
      const optBtn = document.getElementById('btn-options-toggle');
      if (optBtn) {
        // Toggle HUD directly if possible
        const hud = document.getElementById('dev-stats-hud');
        if (hud) hud.classList.toggle('visible', next);
      }
    });

    document.getElementById('btn-open-full-settings')?.addEventListener('click', () => {
      sounds.playClick();
      if (this.onOpenSettings) {
        this.onOpenSettings();
      } else {
        const optionsToggle = document.getElementById('btn-options-toggle');
        if (optionsToggle) optionsToggle.click();
      }
    });

    // 11. Multiplayer Actions
    this.btnQuickPlay?.addEventListener('click', async () => {
      if (this.isLoading) return;
      sounds.playClick();
      await this.handleQuickPlay();
    });

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

    this.btnCreateLobbyModal?.addEventListener('click', () => {
      sounds.playClick();
      const currentId = this.skyboxManager?.currentSkybox?.id || this.mapManager?.getCurrentMap?.()?.id;
      if (currentId) {
        const sel = document.getElementById('create-map');
        if (sel) sel.value = currentId;
      }
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

    // 12. Staging Actions
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

  navigateToStep(stepId) {
    if (this.currentStep === stepId) return;
    sounds.playClick();

    const currentEl = document.getElementById(`step-${this.currentStep}`);
    if (currentEl) currentEl.classList.remove('active');

    const nextEl = document.getElementById(`step-${stepId}`);
    if (nextEl) nextEl.classList.add('active');

    this.currentStep = stepId;

    if (stepId === 'solo-map') {
      const activeMap = this.mapManager?.getCurrentMap?.() || getDefaultMap();
      this.updateActiveMapUI(activeMap.id, activeMap.name);
    } else if (stepId === 'hangar') {
      this.updateShipDisplay();
    }
  }

  updateShipDisplay() {
    const config = SPACESHIP_CONFIGS[this.selectedShipIndex] || SPACESHIP_CONFIGS[0];
    if (this.shipNameEl) this.shipNameEl.textContent = config.name;

    const idxStr = String(this.selectedShipIndex + 1).padStart(2, '0');
    const totalStr = String(SPACESHIP_CONFIGS.length).padStart(2, '0');
    if (this.shipCounterEl) {
      this.shipCounterEl.textContent = `${idxStr} / ${totalStr}`;
    }

    // Dynamic specs
    const handling = config.handling || {};
    const maxSpeed = handling.maxSpeed || 50;
    const boostSpeed = handling.boostSpeed || 110;
    const rollSpeed = handling.rollSpeed || 1.35;

    const speedPct = Math.min(100, Math.max(25, Math.round((maxSpeed / 70) * 100)));
    const boostPct = Math.min(100, Math.max(30, Math.round((boostSpeed / 140) * 100)));
    const agilityPct = Math.min(100, Math.max(30, Math.round((rollSpeed / 1.6) * 100)));

    if (this.specSpeedVal) this.specSpeedVal.textContent = `${Math.round(maxSpeed)} m/s`;
    if (this.specSpeedFill) this.specSpeedFill.style.width = `${speedPct}%`;

    if (this.specBoostVal) this.specBoostVal.textContent = `${Math.round(boostSpeed)} m/s`;
    if (this.specBoostFill) this.specBoostFill.style.width = `${boostPct}%`;

    if (this.specAgilityVal) this.specAgilityVal.textContent = `${agilityPct}%`;
    if (this.specAgilityFill) this.specAgilityFill.style.width = `${agilityPct}%`;

    // Live update left-side tactical watermark overlay
    if (this.watermarkShipName) this.watermarkShipName.textContent = config.name;
    if (this.watermarkShipCounter) this.watermarkShipCounter.textContent = `${idxStr} / ${totalStr}`;
    if (this.watermarkSpdVal) this.watermarkSpdVal.textContent = Math.round(maxSpeed);
    if (this.watermarkBstVal) this.watermarkBstVal.textContent = Math.round(boostSpeed);
    if (this.watermarkAglVal) this.watermarkAglVal.textContent = `${agilityPct}%`;
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
      if (dot) dot.style.background = '#94a3b8';
      this.navStatusText.textContent = 'Connecting...';
    }
  }

  cycleShip(delta) {
    if (this.currentScreen !== 'main' || (this.spaceship && this.spaceship.enabled)) {
      return;
    }

    sounds.playClick();
    this.selectedShipIndex = (this.selectedShipIndex + delta + SPACESHIP_CONFIGS.length) % SPACESHIP_CONFIGS.length;
    localStorage.setItem('spacegame_ship_index', this.selectedShipIndex);
    this.updateShipDisplay();

    // Live update 3D ship in background
    if (this.spaceship && typeof this.spaceship.selectShip === 'function') {
      this.spaceship.selectShip(this.selectedShipIndex).then(() => {
        this.selectColorTheme(this.selectedThemeKey, false);
      }).catch(err => {
        console.warn('Failed to switch ship model:', err);
      });
    }

    if (this.client && this.client.room) {
      const cfg = SPACESHIP_CONFIGS[this.selectedShipIndex];
      this.client.updatePlayerState({
        shipIndex: this.selectedShipIndex,
        shipName: cfg.name,
        themeKey: this.selectedThemeKey
      });
    }
  }

  selectColorTheme(themeKey, playSound = true) {
    if (this.currentScreen !== 'main' || (this.spaceship && this.spaceship.enabled)) {
      return;
    }

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

    if (this.client && this.client.room) {
      this.client.updatePlayerState({
        themeKey: this.selectedThemeKey
      });
    }
  }

  selectMap(mapId) {
    if (this.mapManager) {
      this.mapManager.loadMapById(mapId).catch(err => {
        console.warn('Failed to load map:', err);
      });
    } else if (this.skyboxManager) {
      this.skyboxManager.loadById(mapId).catch(err => {
        console.warn('Failed to load skybox:', err);
      });
    }
    this.updateActiveMapUI(mapId);
  }

  updateActiveMapUI(mapId, mapName = null) {
    if (!mapId) return;
    const grid = document.getElementById('menu-map-grid');
    if (grid) {
      grid.querySelectorAll('.menu-map-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-map-id') === mapId);
      });
    }

    const map = getMapById(mapId);
    if (map) {
      if (this.soloSectorBadge) this.soloSectorBadge.textContent = map.badge || 'COMBAT ZONE';
      if (this.soloSectorHazard) {
        this.soloSectorHazard.textContent = map.asteroids?.enabled !== false ? 'Asteroids Active' : 'Clear Space';
      }
      if (this.soloSectorName) this.soloSectorName.textContent = mapName || map.name;
      if (this.soloSectorDesc) this.soloSectorDesc.textContent = map.description || '';
    }

    // Also sync the dropdown in Create Room modal if present
    const createSelect = document.getElementById('create-map');
    if (createSelect && createSelect.value !== mapId) {
      createSelect.value = mapId;
    }
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

      const activeMap = this.mapManager?.getCurrentMap?.() || getDefaultMap();
      const defaultMapId = activeMap.id;
      const defaultSkybox = activeMap.skybox?.id || 'deep_space';

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
            mapId: defaultMapId,
            skybox: defaultSkybox,
            gameMode: 'Dogfight'
          }
        }
      });

      this.enterStagingLobby(res.room);
    } catch (err) {
      console.error('Quick play error:', err);
      this.showToast(err.message || 'Unable to join. Try creating a room.', 'error');
    } finally {
      this.setButtonLoading(this.btnQuickPlay, this.iconQuickPlay, this.textQuickPlay, false, 'QUICK PLAY', Icons.play(18));
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
      const activeMap = this.mapManager?.getCurrentMap?.() || getDefaultMap();
      const defaultMapId = activeMap.id;
      const mapId = document.getElementById('create-map')?.value || defaultMapId;
      const targetMap = getMapById(mapId);
      const skybox = targetMap.skybox?.id || 'deep_space';
      const isPrivate = document.getElementById('create-is-private')?.checked || false;

      await this.ensureConnected();

      const res = await this.client.createRoom({
        name,
        gameType: 'spacebattle',
        maxPlayers,
        isPrivate,
        customData: {
          mapId,
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
    if (this.screenMain) {
      this.screenMain.classList.add('hidden');
      this.screenMain.style.display = 'none';
    }
    if (this.screenStaging) {
      this.screenStaging.classList.remove('hidden');
      this.screenStaging.style.display = 'flex';
    }

    this.isHost = room.hostId === this.client.playerId;
    this.isReady = false;

    if (this.stagingRoomName) this.stagingRoomName.textContent = room.name;
    if (this.stagingRoomCode) this.stagingRoomCode.textContent = room.code;

    if (room.customData?.mapId && this.mapManager) {
      this.mapManager.loadMapById(room.customData.mapId).catch(() => {});
    } else if (room.customData?.skybox && this.skyboxManager) {
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
      const shipName = p.state?.shipName || p.customData?.shipName || (typeof p.state?.shipIndex === 'number' ? SPACESHIP_CONFIGS[p.state.shipIndex]?.name : 'StarSparrow');

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
    if (this.screenStaging) {
      this.screenStaging.classList.add('hidden');
      this.screenStaging.style.display = 'none';
    }
    if (this.screenMain) {
      this.screenMain.classList.remove('hidden');
      this.screenMain.style.display = 'flex';
    }
    this.navigateToStep('main');
    this.root.classList.add('visible');
    if (this.onLeaveToMenu) {
      this.onLeaveToMenu();
    }
  }

  hideAll() {
    this.root.classList.remove('visible');
    if (this.screenMain) {
      this.screenMain.classList.add('hidden');
      this.screenMain.style.display = 'none';
    }
    if (this.screenStaging) {
      this.screenStaging.classList.add('hidden');
      this.screenStaging.style.display = 'none';
    }
  }

  showMenu() {
    this.root.classList.add('visible');
    if (this.currentScreen === 'lobby') {
      if (this.screenMain) {
        this.screenMain.classList.add('hidden');
        this.screenMain.style.display = 'none';
      }
      if (this.screenStaging) {
        this.screenStaging.classList.remove('hidden');
        this.screenStaging.style.display = 'flex';
      }
    } else {
      if (this.screenStaging) {
        this.screenStaging.classList.add('hidden');
        this.screenStaging.style.display = 'none';
      }
      if (this.screenMain) {
        this.screenMain.classList.remove('hidden');
        this.screenMain.style.display = 'flex';
      }
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
