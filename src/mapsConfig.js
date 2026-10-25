/**
 * mapsConfig.js
 * Comprehensive Arena Maps Configuration for StarSparrow.
 * 
 * Edit this file to customize, balance, or define new combat arenas.
 * 
 * Each map configuration defines:
 *  - id: Unique string identifier (used in networking, room state, and storage)
 *  - name: Full human-readable arena name
 *  - shortName: Condensed name for HUD tags and buttons
 *  - description: Tactical lore and environment briefing
 *  - badge: Category pill (e.g., 'Asteroid Belt', 'Deep Void', 'Nebula Station')
 *  - color: UI theme accent color (hex)
 *  - glow: UI glow color (rgba)
 * 
 *  - skybox: Cubemap configuration:
 *      - id: Skybox folder identifier (public/skyboxes/{id}/)
 *      - path: Path to folder containing the 6 cubemap face textures
 *      - files: [px, nx, py, ny, pz, nz] texture filenames
 * 
 *  - asteroids: Procedural asteroid field configuration:
 *      - enabled: boolean (whether asteroid hazards spawn in this map)
 *      - count: Number of asteroid bodies
 *      - seed: Deterministic seed string for synchronized multiplayer layouts
 *      - spawnRadiusMin: Inner safe zone boundary radius (meters)
 *      - spawnRadiusMax: Outer perimeter boundary radius (meters)
 *      - heightRange: Vertical drift spread (meters)
 * 
 *  - environmentModels: Array of static 3D models to load into the arena
 *      (e.g., space stations, warp gates, communication arrays, derelicts).
 *      Each item structure:
 *      {
 *        id: 'station_alpha',
 *        path: '/models/Station.fbx', // Supports .fbx, .glb, .gltf
 *        position: [0, 0, -250],      // [x, y, z] in world meters
 *        rotation: [0, 0, 0],         // [rx, ry, rz] in radians
 *        scale: 1.0,                  // Uniform scalar or [sx, sy, sz]
 *        castShadow: true,
 *        receiveShadow: true
 *      }
 * 
 *  - lighting:
 *      - ambientColor: Ambient light hex color
 *      - ambientIntensity: Ambient brightness
 *      - directionalColor: Primary sun directional light hex
 *      - directionalIntensity: Sun brightness
 *      - sunPosition: [x, y, z] position of directional light
 * 
 *  - spaceDustTheme: Palette identifier for cosmic particle dust ('deep_space', 'purple_nebula', 'blue_nebula', 'golden_galaxy', 'blue_pink')
 *  - arenaRadius: Combat engagement boundary perimeter in meters
 */

export const MAPS_CONFIG = [
  {
    id: 'deep_space_belt',
    name: 'Deep Space Belt',
    shortName: 'Asteroid Belt',
    description: 'Dense planetary debris belt in cold deep space. Heavy asteroid cover enables intense tactical dogfights and evasive maneuvers.',
    badge: 'Asteroid Belt',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.45)',
    skybox: {
      id: 'deep_space',
      path: '/skyboxes/deep_space/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: true,
      count: 450,
      seed: 'deep_space_belt_sector',
      spawnRadiusMin: 40,
      spawnRadiusMax: 460,
      heightRange: 130
    },
    // User-customizable 3D environment models (stations, gates, satellites, etc.)
    environmentModels: [
      // Example:
      // { id: 'outpost_core', path: '/models/Station.fbx', position: [0, 60, -250], rotation: [0, 0.4, 0], scale: 3.5 }
    ],
    lighting: {
      ambientColor: 0x334155,
      ambientIntensity: 0.52,
      directionalColor: 0xfff7ed,
      directionalIntensity: 2.3,
      sunPosition: [250, 180, 150]
    },
    spaceDustTheme: 'deep_space',
    arenaRadius: 550
  },
  {
    id: 'purple_nebula_station',
    name: 'Purple Nebula Outpost',
    shortName: 'Purple Nebula',
    description: 'High-energy ionized gas nebula with vibrant violet dust and moderate asteroid clusters. Ideal for medium-range dogfights.',
    badge: 'Cosmic Nebula',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.45)',
    skybox: {
      id: 'purple_nebula',
      path: '/skyboxes/purple_nebula/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: true,
      count: 280,
      seed: 'purple_nebula_outpost_sector',
      spawnRadiusMin: 45,
      spawnRadiusMax: 420,
      heightRange: 100
    },
    environmentModels: [],
    lighting: {
      ambientColor: 0x4a1d96,
      ambientIntensity: 0.65,
      directionalColor: 0xf3e8ff,
      directionalIntensity: 2.1,
      sunPosition: [-200, 220, 200]
    },
    spaceDustTheme: 'purple_nebula',
    arenaRadius: 550
  },
  {
    id: 'blue_nebula_void',
    name: 'Blue Nebula Expanse',
    shortName: 'Blue Nebula',
    description: 'Crystalline azure nebula with sparse tactical asteroid clusters, providing high pilot visibility and wide engagement angles.',
    badge: 'High Visibility',
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.45)',
    skybox: {
      id: 'blue_nebula',
      path: '/skyboxes/blue_nebula/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: true,
      count: 180,
      seed: 'blue_nebula_expanse_sector',
      spawnRadiusMin: 50,
      spawnRadiusMax: 400,
      heightRange: 90
    },
    environmentModels: [],
    lighting: {
      ambientColor: 0x0c4a6e,
      ambientIntensity: 0.60,
      directionalColor: 0xe0f2fe,
      directionalIntensity: 2.3,
      sunPosition: [200, 160, -180]
    },
    spaceDustTheme: 'blue_nebula',
    arenaRadius: 500
  },
  {
    id: 'golden_galaxy_core',
    name: 'Golden Galaxy Core',
    shortName: 'Golden Galaxy',
    description: 'Luminous galactic core bathed in warm stellar radiation with heavy orbital rock formations.',
    badge: 'Solar Sector',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.45)',
    skybox: {
      id: 'golden_galaxy',
      path: '/skyboxes/golden_galaxy/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: true,
      count: 340,
      seed: 'golden_galaxy_core_sector',
      spawnRadiusMin: 40,
      spawnRadiusMax: 460,
      heightRange: 120
    },
    environmentModels: [],
    lighting: {
      ambientColor: 0x78350f,
      ambientIntensity: 0.55,
      directionalColor: 0xfef3c7,
      directionalIntensity: 2.4,
      sunPosition: [180, 250, 100]
    },
    spaceDustTheme: 'golden_galaxy',
    arenaRadius: 600
  },
  {
    id: 'blue_pink_nebula',
    name: 'Bifrost Nebula Drift',
    shortName: 'Bifrost Nebula',
    description: 'Spectacular dual-tone cosmic nebula where magenta and turquoise stellar winds collide. Medium asteroid coverage.',
    badge: 'Chromatic Void',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.45)',
    skybox: {
      id: 'blue_pink',
      path: '/skyboxes/blue_pink/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: true,
      count: 240,
      seed: 'bifrost_nebula_sector',
      spawnRadiusMin: 45,
      spawnRadiusMax: 440,
      heightRange: 110
    },
    environmentModels: [],
    lighting: {
      ambientColor: 0x581c87,
      ambientIntensity: 0.58,
      directionalColor: 0xfdf4ff,
      directionalIntensity: 2.2,
      sunPosition: [-160, 200, -160]
    },
    spaceDustTheme: 'blue_pink',
    arenaRadius: 550
  },
  {
    id: 'open_void_duel',
    name: 'Open Void Arena',
    shortName: 'Open Void',
    description: 'Empty deep space sector with zero asteroid obstructions. Pure high-speed dogfighting for skilled pilots.',
    badge: 'Zero Debris / Pure Duel',
    color: '#e2e8f0',
    glow: 'rgba(226, 232, 240, 0.45)',
    skybox: {
      id: 'deep_space',
      path: '/skyboxes/deep_space/',
      files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
    },
    asteroids: {
      enabled: false,
      count: 0,
      seed: 'open_void_sector'
    },
    environmentModels: [],
    lighting: {
      ambientColor: 0x1e293b,
      ambientIntensity: 0.48,
      directionalColor: 0xffffff,
      directionalIntensity: 2.5,
      sunPosition: [200, 200, 200]
    },
    spaceDustTheme: 'deep_space',
    arenaRadius: 650
  }
];

export function getMapById(id) {
  return MAPS_CONFIG.find(m => m.id === id) || MAPS_CONFIG[0];
}

export function getDefaultMap() {
  return MAPS_CONFIG[0];
}
