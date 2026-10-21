import * as THREE from 'three';
import './style.css';
import { LoadingScreen } from './LoadingScreen.js';
import { SkyboxManager } from './SkyboxManager.js';
import { SpaceshipController } from './SpaceshipController.js';
import { SpaceDust } from './SpaceDust.js';
import { AsteroidField } from './AsteroidField.js';
import { TouchControls } from './TouchControls.js';
import { OptionsMenu } from './OptionsMenu.js';
import { GameplayRecorder } from './GameplayRecorder.js';

// Multiplayer Modules
import { MultiplayerClient } from './MultiplayerClient.js';
import { RemotePlayerManager } from './RemotePlayerManager.js';
import { CombatHUD } from './CombatHUD.js';
import { LobbyUI } from './LobbyUI.js';
import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';

// 1. Initialize Loading Screen
const loadingScreen = new LoadingScreen();
loadingScreen.setProgress(5);

// 2. Canvas & Scene Setup
const canvas = document.getElementById('app');
const scene = new THREE.Scene();

// 3. Camera Setup & Floating Menu Positions
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 10);

const baseCamPos = new THREE.Vector3(0, 0.8, 5.8);
const baseCamLook = new THREE.Vector3(0, 0.2, 0);

// Recorder toggle
const ENABLE_RECORDER = false;

// 4. Renderer Setup
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: ENABLE_RECORDER
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Options & Recorder
const optionsMenu = new OptionsMenu({
  onLeaveMatch: () => {
    if (client) client.leaveRoom();
    enterMainMenu(true);
  }
});
const gameplayRecorder = new GameplayRecorder(canvas, { enabled: ENABLE_RECORDER });

// 5. Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1e38, 0.4);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
sunLight.position.set(200, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 600;
const d = 50;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

loadingScreen.setProgress(15);

// Game Flow State & Runtime Component References
let currentGameState = 'MENU'; // 'MENU', 'STAGING', 'BATTLE'
let localKills = 0;
let localDeaths = 0;
let localScore = 0;

let spaceship = null;
let spaceDust = null;
let asteroidField = null;
let skyboxManager = null;
let client = null;
let remotePlayersManager = null;
let combatHUD = null;
let lobbyUI = null;

let crosshairContainer = null;
let touchControlsContainer = null;

// Game State Switching Functions & Floating Menu Layout
function updateMenuLayout() {
  if (currentGameState !== 'MENU') return;
  const isSmall = window.innerWidth <= 900;
  if (isSmall) {
    if (spaceship) spaceship.root.position.set(0, 0.1, 0);
    baseCamPos.set(0, 0.75, 6.2);
    baseCamLook.set(0, 0.1, 0);
  } else {
    // Desktop: ship is centered in viewport between left hangar and right menu panels
    if (spaceship) spaceship.root.position.set(-0.75, -0.15, 0);
    baseCamPos.set(0, 0.8, 5.8);
    baseCamLook.set(0, 0.2, 0);
  }
  camera.position.copy(baseCamPos);
  camera.lookAt(baseCamLook);
}
window._updateMenuLayout = updateMenuLayout;

function enterMainMenu(advanceSkybox = false) {
  currentGameState = 'MENU';
  if (optionsMenu) optionsMenu.setInBattle(false);
  if (spaceship) {
    spaceship.enabled = false;
    spaceship.root.rotation.set(0.08, 0.45, 0);
    spaceship.velocity.set(0, 0, 0);
    spaceship.currentSpeed = 0;
  }
  if (combatHUD) combatHUD.hide();
  if (lobbyUI) lobbyUI.showMenu();
  if (crosshairContainer) crosshairContainer.classList.remove('visible');
  if (touchControlsContainer) touchControlsContainer.classList.remove('visible');
  if (remotePlayersManager) remotePlayersManager.clear();
  if (asteroidField) asteroidField.reseed('spacegame_menu_sector');

  // If returning from battle, advance sequentially to the next skybox for the next match
  if (advanceSkybox && skyboxManager) {
    skyboxManager.loadNextSequentialSkybox().catch(() => {});
  }

  updateMenuLayout();
}

function startBattle(room = null, isSolo = false) {
  currentGameState = 'BATTLE';
  if (optionsMenu) optionsMenu.setInBattle(true);
  if (lobbyUI) lobbyUI.hideAll();
  if (combatHUD) combatHUD.hide();

  // Keep the exact same skybox that is currently displayed in the menu for gameplay

  // Enable local ship flight controls (locks ship model and color theme during gameplay)
  if (spaceship) {
    // Ensure selected color theme is locked in for battle
    if (typeof spaceship.setColorTheme === 'function' && lobbyUI) {
      spaceship.setColorTheme(lobbyUI.selectedThemeKey, true);
    }

    spaceship.enabled = true;
    spaceship.respawn(new THREE.Vector3(0, 0, 0));
  }

  // Keep crosshair hidden during gameplay per user specification
  if (crosshairContainer) crosshairContainer.classList.remove('visible');

  // Reset local stats
  localKills = 0;
  localDeaths = 0;
  localScore = 0;

  if (room && client) {
    if (combatHUD) combatHUD.setRoomInfo(room.code);
    if (room.customData?.skybox && skyboxManager) {
      skyboxManager.loadSkybox(room.customData.skybox).catch(() => {});
    }

    // Deterministically synchronize asteroid field layout across all pilots in this room
    if (asteroidField) {
      const roomSeed = room.customData?.seed || room.code || room.id || 'default_space_sector';
      asteroidField.reseed(roomSeed);
    }

    // Populate remote players
    if (remotePlayersManager) {
      remotePlayersManager.clear();
      for (const p of (room.players || [])) {
        if (p.id !== client.playerId) {
          remotePlayersManager.addPlayer(p);
        }
      }
    }

    if (lobbyUI) {
      client.updatePlayerState({
        shield: 100,
        health: 100,
        kills: 0,
        deaths: 0,
        score: 0,
        isDestroyed: false,
        shipIndex: lobbyUI.selectedShipIndex,
        shipName: SPACESHIP_CONFIGS[lobbyUI.selectedShipIndex].name,
        themeKey: lobbyUI.selectedThemeKey
      });
    }

    // Request destroyed asteroids list from any existing room pilots
    client.relay('REQUEST_WORLD_STATE', { from: client.playerId });
  } else {
    if (combatHUD) combatHUD.setRoomInfo(null);
    if (asteroidField) asteroidField.reseed('spacegame_solo_sector');
  }
}

function syncScoreboard() {
  if (!client || !client.room || !combatHUD) return;
  const all = [...(client.room.players || [])];
  const me = all.find(p => p.id === client.playerId);
  if (me) {
    me.state = {
      ...(me.state || {}),
      kills: localKills,
      deaths: localDeaths,
      score: localScore,
    };
  }
  combatHUD.updateScoreboard(all, client.playerId);
}

// 6. Main Render & Simulation Loop (Runs immediately so no black screen can occur)
const clock = new THREE.Clock();
let menuFloatTime = 0;
let lastTransformSync = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  // Update Local Spaceship & Environment
  if (spaceship) {
    spaceship.update(dt);
    if (spaceDust) {
      spaceDust.update(
        spaceship.root.position,
        dt,
        spaceship.velocity,
        spaceship.currentSpeed,
        spaceship.isBoosting ? 1.0 : 0.0
      );
    }
    if (asteroidField) asteroidField.update(dt);

    // Keep sunlight shadow camera focused near player
    sunLight.target.position.copy(spaceship.root.position);
    sunLight.target.updateMatrixWorld();
  }

  // Update Remote Opponents
  if (remotePlayersManager) {
    remotePlayersManager.update(dt, camera);
  }

  // Update Tactical Combat HUD
  if (currentGameState === 'BATTLE') {
    if (combatHUD && spaceship) {
      combatHUD.updateLocalVitals({
        shield: spaceship.shield,
        hull: spaceship.health,
        boostEnergy: spaceship.boostEnergy,
        maxBoostEnergy: spaceship.maxBoostEnergy,
        speed: spaceship.currentSpeed
      });

      combatHUD.update(
        dt,
        camera,
        spaceship.root.position,
        spaceship.root.quaternion,
        remotePlayersManager,
        asteroidField
      );
    }

    // Broadcast Transform at ~25Hz (every 40ms)
    const now = performance.now();
    if (now - lastTransformSync > 40 && client && client.isConnected && client.room && spaceship) {
      lastTransformSync = now;
      client.relay('PLAYER_TRANSFORM', {
        pos: [spaceship.root.position.x, spaceship.root.position.y, spaceship.root.position.z],
        quat: [spaceship.root.quaternion.x, spaceship.root.quaternion.y, spaceship.root.quaternion.z, spaceship.root.quaternion.w],
        vel: [spaceship.velocity.x, spaceship.velocity.y, spaceship.velocity.z],
        speed: spaceship.currentSpeed,
        isBoosting: spaceship.isBoosting,
        bankAngle: spaceship.bankAngle,
        shipIndex: lobbyUI ? lobbyUI.selectedShipIndex : 0,
        themeKey: lobbyUI ? lobbyUI.selectedThemeKey : 'Cyan'
      });
    }
  } else if (currentGameState === 'MENU') {
    if (spaceship) {
      spaceship.root.rotation.y += dt * 0.22;
    }

    // Organic zero-g floating & breathing handheld camera drift
    menuFloatTime += dt;
    const t = menuFloatTime;

    // Multi-harmonic gentle drift simulating zero-g float and natural breathing heave
    const floatX = Math.sin(t * 0.31) * 0.12 + Math.cos(t * 0.53) * 0.05;
    const floatY = Math.sin(t * 0.44) * 0.08 + Math.cos(t * 0.22) * 0.04; // breathing heave
    const floatZ = Math.cos(t * 0.28) * 0.10;

    camera.position.x = baseCamPos.x + floatX;
    camera.position.y = baseCamPos.y + floatY;
    camera.position.z = baseCamPos.z + floatZ;

    // Subtle breathing look target sway
    const lookX = baseCamLook.x + Math.sin(t * 0.25) * 0.06;
    const lookY = baseCamLook.y + Math.cos(t * 0.38) * 0.04;
    camera.lookAt(lookX, lookY, baseCamLook.z);

    // Micro handheld breathing roll tilt (subtle ~0.35 deg sway)
    camera.rotation.z += Math.sin(t * 0.29) * 0.006;
  }

  renderer.render(scene, camera);
  if (gameplayRecorder) gameplayRecorder.recordFrame(canvas);
}

// Start render loop immediately
animate();

// 7. Network and Combat Event Bindings
function bindNetworkEvents() {
  if (!client) return;

  client.on('connected', () => {
    if (lobbyUI) lobbyUI.setServerStatus(true, client.pingMs);
  });

  client.on('disconnected', ({ wasConnected }) => {
    if (lobbyUI) lobbyUI.setServerStatus(false);
    if (wasConnected && currentGameState === 'BATTLE' && lobbyUI) {
      lobbyUI.showToast('Connection interrupted. Resuming session...', 'info');
    }
  });

  client.on('ping', (ms) => {
    if (combatHUD) combatHUD.setPing(ms);
    if (lobbyUI) lobbyUI.setServerStatus(true, ms);
  });

  // Room Events
  client.on('roomCreated', (payload) => {
    if (lobbyUI) lobbyUI.enterStagingLobby(payload.room);
  });

  client.on('roomJoined', (payload) => {
    if (payload.room.status === 'playing') {
      startBattle(payload.room, false);
    } else {
      if (lobbyUI) lobbyUI.enterStagingLobby(payload.room);
    }
  });

  client.on('playerJoined', (player) => {
    if (lobbyUI) lobbyUI.updateRosterUI();
    if (currentGameState === 'BATTLE' && remotePlayersManager && combatHUD) {
      remotePlayersManager.addPlayer(player);
      combatHUD.showCombatBanner(`PILOT ${player.name.toUpperCase()} ENTERED SECTOR`);
      combatHUD.addChatMessage('SYSTEM', `${player.name} joined the dogfight`, true);
    }
  });

  client.on('playerLeft', (payload) => {
    if (lobbyUI) lobbyUI.updateRosterUI();
    if (currentGameState === 'BATTLE' && remotePlayersManager && combatHUD) {
      const p = remotePlayersManager.getPlayer(payload.playerId);
      const name = p ? p.name : 'Unknown Pilot';
      remotePlayersManager.removePlayer(payload.playerId);
      combatHUD.addChatMessage('SYSTEM', `${name} left the arena`, true);
    }
  });

  client.on('playerReadyChanged', () => {
    if (lobbyUI) lobbyUI.updateRosterUI();
  });

  client.on('hostChanged', () => {
    if (lobbyUI) lobbyUI.updateRosterUI();
  });

  client.on('gameStarted', () => {
    startBattle(client.room, false);
  });

  client.on('gameEnded', () => {
    if (combatHUD) combatHUD.showResults('BATTLE CONCLUDED', 'ALL PILOTS', '<p>Sector secured. Good fight!</p>');
  });

  client.on('kicked', () => {
    if (lobbyUI) lobbyUI.showToast('You were dismissed from the arena by the host.', 'error');
    enterMainMenu(true);
  });

  client.on('playerStateUpdated', (payload) => {
    if (remotePlayersManager && payload.playerId !== client.playerId) {
      const p = remotePlayersManager.getPlayer(payload.playerId);
      if (p && payload.state) {
        const shipIdx = payload.state.shipIndex;
        const themeKey = payload.state.themeKey;
        if (typeof shipIdx === 'number') {
          p.setShip(shipIdx, themeKey);
        } else if (themeKey) {
          p.applyTheme(themeKey);
        }
      }
    }
    syncScoreboard();
  });

  // Combat Relays
  client.on('relay:PLAYER_TRANSFORM', (data, senderId) => {
    if (remotePlayersManager) remotePlayersManager.handleTransform(senderId, data);
  });

  client.on('relay:FIRE_LASER', (data, senderId) => {
    if (remotePlayersManager) remotePlayersManager.fireRemoteLasers(senderId, data);
  });

  client.on('relay:PLAYER_HIT', (data) => {
    if (data.victimId === client.playerId && spaceship) {
      spaceship.takeDamage(data.damage, data.attackerId, data.hitPoint);
    }
  });

  client.on('relay:PLAYER_DAMAGED', (data) => {
    if (remotePlayersManager) remotePlayersManager.handlePlayerDamaged(data.playerId, data.shield, data.hull);
  });

  client.on('relay:PLAYER_KILLED', (data) => {
    if (remotePlayersManager) remotePlayersManager.handlePlayerKilled(data.victimId);

    const isLocalKiller = data.killerId === client.playerId;
    const isLocalVictim = data.victimId === client.playerId;

    const killerPlayer = isLocalKiller
      ? { name: lobbyUI ? lobbyUI.callsign : 'Local Pilot' }
      : (remotePlayersManager ? remotePlayersManager.getPlayer(data.killerId) : null);
    const victimPlayer = isLocalVictim
      ? { name: lobbyUI ? lobbyUI.callsign : 'Local Pilot' }
      : (remotePlayersManager ? remotePlayersManager.getPlayer(data.victimId) : null);

    const killerName = killerPlayer ? killerPlayer.name : 'Combatant';
    const victimName = victimPlayer ? victimPlayer.name : 'Vessel';

    if (combatHUD) combatHUD.addKillFeedEntry(killerName, victimName, isLocalKiller, isLocalVictim);

    if (isLocalKiller) {
      localKills += 1;
      localScore += 100;
      client.updatePlayerState({ kills: localKills, score: localScore });
    }

    syncScoreboard();
  });

  client.on('relay:PLAYER_RESPAWNED', (data) => {
    if (remotePlayersManager) remotePlayersManager.handlePlayerRespawned(data.playerId, data.pos);
  });

  client.on('relay:REQUEST_WORLD_STATE', (data, senderId) => {
    if (asteroidField && currentGameState === 'BATTLE') {
      client.relay('SYNC_WORLD_STATE', {
        destroyedAsteroids: asteroidField.getDestroyedIndices(),
        targetPlayerId: senderId
      });
    }
  });

  client.on('relay:SYNC_WORLD_STATE', (data) => {
    if (data.targetPlayerId && data.targetPlayerId !== client.playerId) return;
    if (asteroidField && Array.isArray(data.destroyedAsteroids)) {
      for (const idx of data.destroyedAsteroids) {
        asteroidField.destroySilent(idx);
      }
    }
  });

  client.on('relay:ASTEROID_DESTROYED', (data) => {
    if (asteroidField) asteroidField.explodeAsteroidByIndex(data.asteroidIndex);
  });

  client.on('relay:ASTEROID_DAMAGED', (data) => {
    if (asteroidField) {
      asteroidField.damageAsteroidByIndex(data.asteroidIndex, data.health, data.hitPoint, data.laserColorHex);
    }
  });

  client.on('relay:CHAT_MESSAGE', (data) => {
    if (combatHUD) combatHUD.addChatMessage(data.sender, data.text);
    if (lobbyUI) lobbyUI.addLobbyChatMessage(data.sender, data.text);
  });

  // Local Spaceship Combat Callbacks
  if (spaceship) {
    spaceship.onLaserFired = (laserData) => {
      if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
        client.relay('FIRE_LASER', laserData);
      }
    };

    spaceship.onLaserHitEnemy = (enemyPlayer, hitPoint, damage) => {
      if (combatHUD) combatHUD.triggerHitmarker();
      if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
        client.relay('PLAYER_HIT', {
          victimId: enemyPlayer.id,
          attackerId: client.playerId,
          damage,
          hitPoint: hitPoint.toArray()
        }, enemyPlayer.id);
      }
    };

    spaceship.onDamaged = (shield, hull, attackerId) => {
      if (combatHUD) combatHUD.updateLocalVitals({ shield, hull });
      if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
        client.relay('PLAYER_DAMAGED', { playerId: client.playerId, shield, hull });
        client.updatePlayerState({ shield, hull });
      }
    };

    spaceship.onDestroyed = (killerId) => {
      localDeaths += 1;
      if (currentGameState === 'BATTLE' && client && client.isConnected && client.room) {
        client.relay('PLAYER_KILLED', { victimId: client.playerId, killerId });
        client.updatePlayerState({ deaths: localDeaths, isDestroyed: true });
      }
      // Seamless auto-respawn after 3s without displaying any destroyed overlay screens
      setTimeout(() => {
        if (currentGameState === 'BATTLE' && spaceship) {
          spaceship.respawn();
          if (client && client.isConnected && client.room) {
            client.relay('PLAYER_RESPAWNED', { playerId: client.playerId, pos: spaceship.root.position.toArray() });
            client.updatePlayerState({
              shield: 100,
              health: 100,
              isDestroyed: false,
              score: localScore,
              kills: localKills,
              deaths: localDeaths,
            });
          }
        }
      }, 3000);
    };
  }

  // Asteroid Destruction & Damage Sync
  if (asteroidField) {
    asteroidField.onAsteroidDestroyed = (index, pos) => {
      if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
        client.relay('ASTEROID_DESTROYED', { asteroidIndex: index, pos });
      }
    };
    asteroidField.onAsteroidDamaged = (index, health, maxHealth, hitPoint, laserColorHex) => {
      if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
        client.relay('ASTEROID_DAMAGED', { asteroidIndex: index, health, maxHealth, hitPoint, laserColorHex });
      }
    };
  }
}

// 8. Pipeline Initialization
async function initPipeline() {
  crosshairContainer = document.getElementById('crosshair-container');
  touchControlsContainer = document.getElementById('touch-controls');

  // Phase 1: Skybox Textures (Sequential selection so each skybox gets its turn)
  skyboxManager = new SkyboxManager(scene, renderer);
  await skyboxManager.loadNextSequentialSkybox((progress) => {
    const pct = 15 + Math.round((progress.loaded / progress.total) * 25);
    loadingScreen.setProgress(pct);
  }).catch((err) => {
    console.warn('Initial skybox load fallback:', err);
  });

  // Phase 2: Local Spaceship Controller
  spaceship = new SpaceshipController(scene, camera, canvas, { autoLoad: false });
  optionsMenu.setSpaceship(spaceship);

  // Phase 3: StarSparrow 3D Mesh
  const initialShipIdx = parseInt(localStorage.getItem('spacegame_ship_index') || '0', 10);
  await spaceship.selectShip(initialShipIdx, (progress) => {
    if (progress.phase === 'model_start') {
      loadingScreen.setProgress(42);
    } else if (progress.phase === 'model_loaded') {
      loadingScreen.setProgress(55);
    } else if (progress.phase === 'texture') {
      const pct = 55 + Math.round((progress.loaded / progress.total) * 26);
      loadingScreen.setProgress(pct);
    }
  });

  // Apply saved color theme to initial ship
  const initialThemeKey = localStorage.getItem('spacegame_theme_key') || 'Cyan';
  if (typeof spaceship.setColorTheme === 'function') {
    spaceship.setColorTheme(initialThemeKey);
  }

  // Park ship on the left for menu presentation
  updateMenuLayout();

  // Proactively preload adjacent vessels in background
  spaceship.preloadAdjacentShips(initialShipIdx, 3);

  // Phase 4: Hazards, Space Dust, Controls
  loadingScreen.setProgress(84);
  asteroidField = new AsteroidField(scene, 140, 'spacegame_menu_sector');
  spaceship.setAsteroidField(asteroidField);

  loadingScreen.setProgress(88);
  spaceDust = new SpaceDust(scene);
  if (skyboxManager) {
    if (skyboxManager.currentSkybox) {
      spaceDust.setTheme(skyboxManager.currentSkybox.id);
    }
    skyboxManager.onSkyboxChange((skybox) => {
      if (spaceDust && skybox) {
        spaceDust.setTheme(skybox.id);
      }
    });
  }

  // Touch Controls
  new TouchControls(spaceship, skyboxManager);

  // Phase 5: Multiplayer Client & Remote Opponents
  client = new MultiplayerClient();
  remotePlayersManager = new RemotePlayerManager(scene, asteroidField);
  spaceship.setRemotePlayersManager(remotePlayersManager);

  // Phase 6: Combat HUD & Lobby UI
  combatHUD = new CombatHUD({
    onSendChat: (text) => {
      if (client && lobbyUI) client.relay('CHAT_MESSAGE', { sender: lobbyUI.callsign, text }, 'all');
    },
    onRespawnRequest: () => {
      combatHUD.hideDestroyedOverlay();
      spaceship.respawn();
      client.relay('PLAYER_RESPAWNED', { playerId: client.playerId, pos: spaceship.root.position.toArray() });
      client.updatePlayerState({
        shield: 100,
        health: 100,
        isDestroyed: false,
        score: localScore,
        kills: localKills,
        deaths: localDeaths,
      });
      combatHUD.showCombatBanner('SYSTEMS RESTORED - SHIELD MATRIX CHARGED');
    },
    onLeaveMatch: () => {
      if (client) client.leaveRoom();
      enterMainMenu();
    }
  });

  lobbyUI = new LobbyUI({
    client,
    spaceship,
    skyboxManager,
    onStartSolo: () => {
      startBattle(null, true);
    },
    onEnterBattle: (room) => {
      startBattle(room, false);
    },
    onLeaveToMenu: () => {
      enterMainMenu();
    },
    onOpenSettings: () => {
      optionsMenu.open();
    }
  });

  // Bind network & combat events
  bindNetworkEvents();

  // Initialize main menu state right away (active behind loading screen)
  enterMainMenu();

  // Shader Warmup
  loadingScreen.setProgress(90);
  loadingScreen.setStatus('COMPILING VISUAL SHADERS...');
  await new Promise(r => setTimeout(r, 40));
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  // Connect to Backend (Keep loading until connection is completed)
  loadingScreen.setProgress(94);
  loadingScreen.setStatus('CONNECTING TO STARSPARROW BACKEND...');
  try {
    await client.connectWithRetry({
      maxRetries: 15,
      retryDelayMs: 2000,
      onStatus: (msg) => {
        loadingScreen.setStatus(msg);
      }
    });
    loadingScreen.setStatus('BACKEND CONNECTED · FLIGHT SYSTEMS READY');
    if (lobbyUI) lobbyUI.setServerStatus(true, client.pingMs);
  } catch (err) {
    console.warn('Backend connection notice:', err);
    loadingScreen.setStatus('OFFLINE MODE · SOLO FLIGHT READY');
    if (lobbyUI) lobbyUI.setServerStatus(false);
  }

  // Finish Loading
  loadingScreen.setProgress(100);
  await loadingScreen.finish();

  optionsMenu.showToggleButton();
  gameplayRecorder.showToggleButton();

  // Handle URL Deep-Linking Auto-Join
  const urlParams = new URLSearchParams(window.location.search);
  const joinParam = urlParams.get('join');
  if (joinParam && lobbyUI) {
    lobbyUI.handleJoinRoom(joinParam.trim().toUpperCase());
  }
}

// 9. Launch Pipeline with Resilient Fallback
initPipeline().catch((err) => {
  console.error('Fatal initialization error:', err);
  if (loadingScreen) {
    loadingScreen.setProgress(100);
    loadingScreen.finish();
  }
  enterMainMenu();
});

// Responsive window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateMenuLayout();
});