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
import { sounds } from './SoundManager.js';
import { SPACESHIP_CONFIGS } from './spaceshipConfig.js';

// 1. Initialize Loading Screen
const loadingScreen = new LoadingScreen();
loadingScreen.setProgress(5);

// 2. Canvas & Scene Setup
const canvas = document.getElementById('app');
const scene = new THREE.Scene();

// 3. Camera Setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 10);

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
const optionsMenu = new OptionsMenu();
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

// Game Flow State
let currentGameState = 'MENU'; // 'MENU', 'STAGING', 'BATTLE'
let localKills = 0;
let localDeaths = 0;
let localScore = 0;

// 6. Pipeline Initialization
async function initPipeline() {
  // Phase 1: Skybox Textures
  const skyboxManager = new SkyboxManager(scene, renderer);
  await skyboxManager.loadRandomSkybox((progress) => {
    const pct = 15 + Math.round((progress.loaded / progress.total) * 25);
    loadingScreen.setProgress(pct);
  }).catch((err) => {
    console.warn('Initial skybox load fallback:', err);
  });

  // Phase 2: Local Spaceship Controller
  const spaceship = new SpaceshipController(scene, camera, canvas, { autoLoad: false });
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
  spaceship.root.position.set(-1.8, -0.15, 0);
  spaceship.root.rotation.set(0.08, 0.45, 0);

  // Phase 4: Hazards, Space Dust, Controls
  loadingScreen.setProgress(84);
  const asteroidField = new AsteroidField(scene, 140);
  spaceship.setAsteroidField(asteroidField);

  loadingScreen.setProgress(88);
  const spaceDust = new SpaceDust(scene, 1800, 160);

  // Touch Controls
  new TouchControls(spaceship, skyboxManager);

  // Phase 5: Multiplayer Client & Remote Opponents
  const client = new MultiplayerClient();
  const remotePlayersManager = new RemotePlayerManager(scene, asteroidField);
  spaceship.setRemotePlayersManager(remotePlayersManager);

  // Phase 6: Combat HUD & Lobby UI
  const combatHUD = new CombatHUD({
    onSendChat: (text) => {
      client.relay('CHAT_MESSAGE', { sender: lobbyUI.callsign, text }, 'all');
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
      client.leaveRoom();
      enterMainMenu();
    }
  });

  const lobbyUI = new LobbyUI({
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
    }
  });

  // Shader Warmup
  loadingScreen.setProgress(95);
  await new Promise(r => setTimeout(r, 40));
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  // Finish Loading
  loadingScreen.setProgress(100);
  await loadingScreen.finish();

  optionsMenu.showToggleButton();
  gameplayRecorder.showToggleButton();

  return {
    spaceship,
    spaceDust,
    asteroidField,
    skyboxManager,
    client,
    remotePlayersManager,
    combatHUD,
    lobbyUI
  };
}

// 7. Initialize Game & Bind Multiplayer Networking
initPipeline().then(({
  spaceship,
  spaceDust,
  asteroidField,
  skyboxManager,
  client,
  remotePlayersManager,
  combatHUD,
  lobbyUI
}) => {
  const crosshairContainer = document.getElementById('crosshair-container');
  const touchControlsContainer = document.getElementById('touch-controls');

  // Start initially parked in Menu
  enterMainMenu();

  // Connect to backend in background
  client.connect().then(() => {
    lobbyUI.setServerStatus(true, client.pingMs);
  }).catch((err) => {
    console.warn('Backend connection notice:', err);
    lobbyUI.setServerStatus(false);
  });

  // Client Ping & Connection Events
  client.on('connected', () => {
    lobbyUI.setServerStatus(true, client.pingMs);
  });

  client.on('disconnected', ({ wasConnected }) => {
    lobbyUI.setServerStatus(false);
    if (wasConnected && currentGameState === 'BATTLE') {
      lobbyUI.showToast('Connection interrupted. Resuming session...', 'info');
    }
  });

  client.on('ping', (ms) => {
    combatHUD.setPing(ms);
    lobbyUI.setServerStatus(true, ms);
  });

  // Room Events
  client.on('roomCreated', (payload) => {
    lobbyUI.enterStagingLobby(payload.room);
  });

  client.on('roomJoined', (payload) => {
    if (payload.room.status === 'playing') {
      startBattle(payload.room, false);
    } else {
      lobbyUI.enterStagingLobby(payload.room);
    }
  });

  client.on('playerJoined', (player) => {
    lobbyUI.updateRosterUI();
    if (currentGameState === 'BATTLE') {
      remotePlayersManager.addPlayer(player);
      combatHUD.showCombatBanner(`PILOT ${player.name.toUpperCase()} ENTERED SECTOR`);
      combatHUD.addChatMessage('SYSTEM', `${player.name} joined the dogfight`, true);
    }
  });

  client.on('playerLeft', (payload) => {
    lobbyUI.updateRosterUI();
    if (currentGameState === 'BATTLE') {
      const p = remotePlayersManager.getPlayer(payload.playerId);
      const name = p ? p.name : 'Unknown Pilot';
      remotePlayersManager.removePlayer(payload.playerId);
      combatHUD.addChatMessage('SYSTEM', `${name} left the arena`, true);
    }
  });

  client.on('playerReadyChanged', () => {
    lobbyUI.updateRosterUI();
  });

  client.on('hostChanged', () => {
    lobbyUI.updateRosterUI();
  });

  client.on('gameStarted', (payload) => {
    startBattle(client.room, false);
  });

  client.on('gameEnded', () => {
    combatHUD.showResults('BATTLE CONCLUDED', 'ALL PILOTS', '<p>Sector secured. Good fight!</p>');
  });

  client.on('kicked', () => {
    lobbyUI.showToast('You were dismissed from the arena by the host.', 'error');
    enterMainMenu();
  });

  // Combat Relays
  client.on('relay:PLAYER_TRANSFORM', (data, senderId) => {
    remotePlayersManager.handleTransform(senderId, data);
  });

  client.on('relay:FIRE_LASER', (data, senderId) => {
    remotePlayersManager.fireRemoteLasers(senderId, data);
  });

  client.on('relay:PLAYER_HIT', (data) => {
    // Check if local player was target
    if (data.victimId === client.playerId) {
      spaceship.takeDamage(data.damage, data.attackerId, data.hitPoint);
    }
  });

  client.on('relay:PLAYER_DAMAGED', (data) => {
    remotePlayersManager.handlePlayerDamaged(data.playerId, data.shield, data.hull);
  });

  client.on('relay:PLAYER_KILLED', (data) => {
    remotePlayersManager.handlePlayerKilled(data.victimId);

    const isLocalKiller = data.killerId === client.playerId;
    const isLocalVictim = data.victimId === client.playerId;

    const killerPlayer = isLocalKiller
      ? { name: lobbyUI.callsign }
      : remotePlayersManager.getPlayer(data.killerId);
    const victimPlayer = isLocalVictim
      ? { name: lobbyUI.callsign }
      : remotePlayersManager.getPlayer(data.victimId);

    const killerName = killerPlayer ? killerPlayer.name : 'Combatant';
    const victimName = victimPlayer ? victimPlayer.name : 'Vessel';

    combatHUD.addKillFeedEntry(killerName, victimName, isLocalKiller, isLocalVictim);

    if (isLocalKiller) {
      localKills += 1;
      localScore += 100;
      client.updatePlayerState({ kills: localKills, score: localScore });
    }

    syncScoreboard();
  });

  client.on('relay:PLAYER_RESPAWNED', (data) => {
    remotePlayersManager.handlePlayerRespawned(data.playerId, data.pos);
  });

  client.on('relay:ASTEROID_DESTROYED', (data) => {
    asteroidField.explodeAsteroidByIndex(data.asteroidIndex);
  });

  client.on('relay:CHAT_MESSAGE', (data) => {
    combatHUD.addChatMessage(data.sender, data.text);
    lobbyUI.addLobbyChatMessage(data.sender, data.text);
  });

  // Local Spaceship Combat Callbacks
  spaceship.onLaserFired = (laserData) => {
    if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
      client.relay('FIRE_LASER', laserData);
    }
  };

  spaceship.onLaserHitEnemy = (enemyPlayer, hitPoint, damage) => {
    combatHUD.triggerHitmarker();
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
    combatHUD.updateLocalVitals({ shield, hull });
    if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
      client.relay('PLAYER_DAMAGED', { playerId: client.playerId, shield, hull });
      client.updatePlayerState({ shield, hull });
    }
  };

  spaceship.onDestroyed = (killerId) => {
    localDeaths += 1;
    if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
      client.relay('PLAYER_KILLED', { victimId: client.playerId, killerId });
      client.updatePlayerState({ deaths: localDeaths, isDestroyed: true });
    }
    const killer = killerId ? remotePlayersManager.getPlayer(killerId) : null;
    const killerName = killer ? killer.name : 'Enemy Fire';
    combatHUD.showDestroyedOverlay(killerName, 5);
  };

  // Asteroid Destruction Sync
  asteroidField.onAsteroidDestroyed = (index, pos) => {
    if (currentGameState === 'BATTLE' && client.isConnected && client.room) {
      client.relay('ASTEROID_DESTROYED', { asteroidIndex: index, pos });
    }
  };

  // Game State Switching Functions
  function enterMainMenu() {
    currentGameState = 'MENU';
    spaceship.enabled = false;
    combatHUD.hide();
    lobbyUI.showMenu();
    if (crosshairContainer) crosshairContainer.classList.remove('visible');
    if (touchControlsContainer) touchControlsContainer.classList.remove('visible');
    remotePlayersManager.clear();

    // Position ship cleanly on the left for inspection preview
    spaceship.root.position.set(-1.8, -0.15, 0);
    spaceship.root.rotation.set(0.08, 0.45, 0);
    spaceship.velocity.set(0, 0, 0);
    spaceship.currentSpeed = 0;

    // Static camera angle for menu screen (aligned so ship is on left, UI on right)
    camera.position.set(0, 0.8, 5.8);
    camera.lookAt(0, 0.2, 0);
  }

  function startBattle(room = null, isSolo = false) {
    currentGameState = 'BATTLE';
    lobbyUI.hideAll();
    combatHUD.show();

    // Enable local ship flight controls
    spaceship.enabled = true;
    spaceship.respawn(new THREE.Vector3(0, 0, 0));

    // Ensure selected color theme is active
    if (typeof spaceship.setColorTheme === 'function') {
      spaceship.setColorTheme(lobbyUI.selectedThemeKey);
    }

    if (crosshairContainer) crosshairContainer.classList.add('visible');
    if (touchControlsContainer) touchControlsContainer.classList.add('visible');

    // Reset local stats
    localKills = 0;
    localDeaths = 0;
    localScore = 0;

    if (room) {
      combatHUD.setRoomInfo(room.code);
      if (room.customData?.skybox) {
        skyboxManager.loadSkybox(room.customData.skybox).catch(() => {});
      }

      // Populate remote players
      remotePlayersManager.clear();
      for (const p of (room.players || [])) {
        if (p.id !== client.playerId) {
          remotePlayersManager.addPlayer(p);
        }
      }

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
    } else {
      combatHUD.setRoomInfo(null);
    }

    combatHUD.showCombatBanner('Flight Systems Online', 1800);
    syncScoreboard();
  }

  function syncScoreboard() {
    if (!client.room) return;
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

  // Network Transform Sync Throttler (~25Hz)
  let lastTransformSync = 0;

  // 8. Main Render & Simulation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Update Local Spaceship & Environment
    spaceship.update(dt);
    spaceDust.update(spaceship.root.position);
    asteroidField.update(dt);

    // Keep sunlight shadow camera focused near player
    sunLight.target.position.copy(spaceship.root.position);
    sunLight.target.updateMatrixWorld();

    // Update Remote Opponents
    remotePlayersManager.update(dt, camera);

    // Update Tactical Combat HUD
    if (currentGameState === 'BATTLE') {
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

      // Broadcast Transform at ~25Hz (every 40ms)
      const now = performance.now();
      if (now - lastTransformSync > 40 && client.isConnected && client.room) {
        lastTransformSync = now;
        client.relay('PLAYER_TRANSFORM', {
          pos: [spaceship.root.position.x, spaceship.root.position.y, spaceship.root.position.z],
          quat: [spaceship.root.quaternion.x, spaceship.root.quaternion.y, spaceship.root.quaternion.z, spaceship.root.quaternion.w],
          vel: [spaceship.velocity.x, spaceship.velocity.y, spaceship.velocity.z],
          speed: spaceship.currentSpeed,
          isBoosting: spaceship.isBoosting,
          bankAngle: spaceship.bankAngle
        });
      }
    } else if (currentGameState === 'MENU') {
      // Gentle turntable rotation of ship in place on the left for inspection
      spaceship.root.rotation.y += dt * 0.22;
      // Camera remains completely static
    }

    renderer.render(scene, camera);
    gameplayRecorder.recordFrame(canvas);
  }

  animate();

  // Handle URL Deep-Linking Auto-Join
  const urlParams = new URLSearchParams(window.location.search);
  const joinParam = urlParams.get('join');
  if (joinParam) {
    lobbyUI.handleJoinRoom(joinParam.trim().toUpperCase());
  }

}).catch((err) => {
  console.error('Fatal initialization error:', err);
  if (loadingScreen) {
    loadingScreen.setProgress(100);
    loadingScreen.finish();
  }
});

// Responsive window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (currentGameState === 'MENU') {
    camera.position.set(0, 0.8, 5.8);
    camera.lookAt(0, 0.2, 0);
  }
});