import * as THREE from 'three';
import { sounds } from './SoundManager.js';

// Fast, high-quality 32-bit deterministic PRNG (Mulberry32 with FNV-1a string hashing)
function createPRNG(seedInput) {
  let s = 2166136261;
  const str = String(seedInput || 'spacegame_default_sector');
  for (let i = 0; i < str.length; i++) {
    s ^= str.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s = s >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reusable static calculation vectors to eliminate garbage collection in collision loops
const _seg = new THREE.Vector3();
const _v = new THREE.Vector3();
const _closest = new THREE.Vector3();

// Fast 3D Value/Perlin Noise for geometry deformation
function createNoise3D(seed = 101) {
  const p = new Uint8Array(512);
  let s = seed;
  function rnd() {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  }
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(h, x, y, z) {
    const u = (h & 15) < 8 ? x : y;
    const v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14 ? x : z);
    return (((h & 15) & 1) === 0 ? u : -u) + (((h & 15) & 2) === 0 ? v : -v);
  }

  return function(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const A  = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B  = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return lerp(w,
      lerp(v,
        lerp(u, grad(p[AA], xf, yf, zf), grad(p[BA], xf - 1, yf, zf)),
        lerp(u, grad(p[AB], xf, yf - 1, zf), grad(p[BB], xf - 1, yf - 1, zf))),
      lerp(v,
        lerp(u, grad(p[AA + 1], xf, yf, zf - 1), grad(p[BA + 1], xf - 1, yf, zf - 1)),
        lerp(u, grad(p[AB + 1], xf, yf - 1, zf - 1), grad(p[BB + 1], xf - 1, yf - 1, zf - 1))));
  };
}

const _globalNoise3D = createNoise3D(2026);

function fbm3D(x, y, z, octaves = 3, lac = 2.15, gain = 0.48) {
  let sum = 0, freq = 1.0, amp = 0.5;
  for (let i = 0; i < octaves; i++) {
    sum += _globalNoise3D(x * freq, y * freq, z * freq) * amp;
    freq *= lac;
    amp *= gain;
  }
  return sum;
}

// Computes smooth normals across adjacent faces while preserving sharp rock ridges
function smoothNormals(geom, creaseAngle = Math.PI / 4.2) {
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const count = pos.count;
  const cosCrease = Math.cos(creaseAngle);

  const map = new Map();
  for (let i = 0; i < count; i++) {
    const key = Math.round(pos.getX(i) * 1000) + '_' + Math.round(pos.getY(i) * 1000) + '_' + Math.round(pos.getZ(i) * 1000);
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(i);
  }

  const faceNorms = new Float32Array(count * 3);
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const cb = new THREE.Vector3(), ab = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);
    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();
    for (let j = 0; j < 3; j++) {
      faceNorms[(i + j) * 3 + 0] = cb.x;
      faceNorms[(i + j) * 3 + 1] = cb.y;
      faceNorms[(i + j) * 3 + 2] = cb.z;
    }
  }

  const fn = new THREE.Vector3(), otherFn = new THREE.Vector3(), avg = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const key = Math.round(pos.getX(i) * 1000) + '_' + Math.round(pos.getY(i) * 1000) + '_' + Math.round(pos.getZ(i) * 1000);
    const list = map.get(key);
    fn.set(faceNorms[i * 3 + 0], faceNorms[i * 3 + 1], faceNorms[i * 3 + 2]);
    avg.copy(fn);
    for (let k = 0; k < list.length; k++) {
      const otherIdx = list[k];
      if (otherIdx === i) continue;
      otherFn.set(faceNorms[otherIdx * 3 + 0], faceNorms[otherIdx * 3 + 1], faceNorms[otherIdx * 3 + 2]);
      if (fn.dot(otherFn) >= cosCrease) {
        avg.add(otherFn);
      }
    }
    avg.normalize();
    norm.setXYZ(i, avg.x, avg.y, avg.z);
  }
  norm.needsUpdate = true;
}

// Texture loader helper with cross-platform fallback for node testing
function loadRockTexture(path) {
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.repeat.set(2.0, 1.0);
    return tex;
  } else {
    const tex = new THREE.DataTexture(new Uint8Array(4 * 16 * 16), 16, 16, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }
}

export class AsteroidField {
  /**
   * High-performance, zero-allocation asteroid field with pre-pooled debris & shockwaves
   * Fully synchronized across multiplayer via deterministic seed-based layout.
   * Uses authentic Rock032 1K PBR textures from public/models/textures.
   * @param {THREE.Scene} scene
   * @param {number} count
   * @param {string|number} [seed='spacegame_default_sector']
   */
  constructor(scene, count = 450, seed = 'spacegame_default_sector') {
    this.scene = scene;
    this.count = count;
    this.asteroids = [];
    this.group = new THREE.Group();
    this.seed = seed;

    // 1. Load authentic Rock032 1K textures from public/models/textures
    const rockColorMap = loadRockTexture('/models/textures/Rock032_1K-JPG_Color.jpg');
    const rockNormalMap = loadRockTexture('/models/textures/Rock032_1K-JPG_NormalGL.jpg');
    const rockBumpMap = loadRockTexture('/models/textures/Rock032_1K-JPG_Displacement.jpg');

    // 2. Pre-create shared rock materials using the Rock032 texture set with subtle cosmic tints
    this.rockMaterials = [
      new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        normalScale: new THREE.Vector2(1.8, 1.8),
        bumpMap: rockBumpMap,
        bumpScale: 0.12,
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.10,
        flatShading: false
      }),
      new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        normalScale: new THREE.Vector2(2.0, 2.0),
        bumpMap: rockBumpMap,
        bumpScale: 0.14,
        color: 0xc8ced6, // Slate granite tint
        roughness: 0.88,
        metalness: 0.12,
        flatShading: false
      }),
      new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        normalScale: new THREE.Vector2(1.9, 1.9),
        bumpMap: rockBumpMap,
        bumpScale: 0.13,
        color: 0xded4c6, // Warm silicate sandstone tint
        roughness: 0.82,
        metalness: 0.15,
        flatShading: false
      }),
      new THREE.MeshStandardMaterial({
        map: rockColorMap,
        normalMap: rockNormalMap,
        normalScale: new THREE.Vector2(1.8, 1.8),
        bumpMap: rockBumpMap,
        bumpScale: 0.12,
        color: 0xa8b0bc, // Dark chondrite tint
        roughness: 0.90,
        metalness: 0.08,
        flatShading: false
      })
    ];

    this.fragmentMaterial = this.rockMaterials[0];

    // 3. Pre-create 6 distinct asteroid geometry variants keeping exact previous scale base radii [1.0, 1.4, 2.2, ...]
    this.geometries = [
      this.createAsteroidGeometry(1.0, 3, 0), // Eros Oblong (stretched peanut, saddle waist)
      this.createAsteroidGeometry(1.4, 3, 1), // Ryugu / Bennu Top (equatorial ridge, flat poles)
      this.createAsteroidGeometry(2.2, 3, 2), // Cratered Heavy Spheroid (impact basins with rims)
      this.createAsteroidGeometry(1.1, 3, 3), // Fractured Monolith (sheer cleavage cliffs)
      this.createAsteroidGeometry(1.5, 3, 4), // Contact Binary (two coalescing rock lobes)
      this.createAsteroidGeometry(2.0, 3, 5)  // Porous Cleaved Boulder (vesicular hollows & fault)
    ];

    // 4. Pre-create 6 fragment geometry variants (boulders, cleaved spalls, sharp chips)
    this.fragmentGeometries = [
      this.createAsteroidGeometry(0.40, 2, 0),
      this.createAsteroidGeometry(0.65, 2, 1),
      this.createAsteroidGeometry(0.90, 2, 2),
      this.createAsteroidGeometry(0.50, 2, 3),
      this.createAsteroidGeometry(0.70, 2, 4),
      this.createAsteroidGeometry(0.35, 2, 5)
    ];

    // 5. Pre-allocated Explosion Sparks particle buffer (1 draw call, zero runtime allocations)
    this.setupSparks();

    // 6. Pre-allocated Shockwave Ring pool (8 rings)
    this.setupShockwaves();

    // 6.5. Pre-allocated dynamic impact point lights
    this.setupFlashLights();

    // 7. Pre-allocated Fragment pool (96 fragments ready in scene, zero runtime allocations)
    this.setupFragmentPool(96);

    // 7.5. Pre-allocated Ship Wreckage pool (40 metallic hull shards)
    this.setupShipWreckagePool(40);

    this.onAsteroidDestroyed = null;
    this.onAsteroidDamaged = null;
    this.enabled = true;

    // 8. Instantiate asteroid mesh pool
    for (let i = 0; i < count; i++) {
      const geomIdx = i % this.geometries.length;
      const geom = this.geometries[geomIdx];
      const mat = this.rockMaterials[i % this.rockMaterials.length];
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      this.asteroids.push({
        mesh,
        rotSpeed: new THREE.Vector3(),
        effectiveRadius: 1.0,
        boundingRadius: 1.0,
        boundingRadiusSq: 1.0,
        maxHealth: 1,
        health: 1,
        isDestroyed: false
      });
    }

    this.scene.add(this.group);
    this._cachedMeshes = [];
    this._meshesNeedUpdate = true;

    // 9. Populate deterministically using initial seed
    this.reseed(seed);
  }

  /**
   * Toggles asteroid field visibility and collision processing
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    this.group.visible = this.enabled;
    if (!this.enabled) {
      if (this.fragmentPool) {
        for (const frag of this.fragmentPool) {
          frag.active = false;
          frag.mesh.visible = false;
        }
      }
      if (this.shipWreckagePool) {
        for (const w of this.shipWreckagePool) {
          w.active = false;
          w.mesh.visible = false;
        }
      }
      if (this.shockwaves) {
        for (const sw of this.shockwaves) {
          sw.active = false;
          sw.mesh.visible = false;
        }
      }
    }
    this._meshesNeedUpdate = true;
  }

  /**
   * Deterministically regenerates/aligns all asteroid positions, sizes, and orientations
   * ensuring 100% spatial and visual synchronization across all multiplayer clients.
   * Keeps exact previous asteroid sizing: scale = 1.5 + rnd() * 6.5, with base radii [1.0, 1.4, 2.2, ...]
   * @param {string|number} seedInput Room code or unique seed
   * @param {object} [config={}] Optional overrides for count, spawn radii, heightRange, enabled
   */
  reseed(seedInput = 'spacegame_default_sector', config = {}) {
    if (config.enabled === false) {
      this.setEnabled(false);
      return;
    }
    this.setEnabled(true);

    this.seed = seedInput;
    const rnd = createPRNG(seedInput);
    const spawnRadiusMin = config.spawnRadiusMin ?? 40;
    const spawnRadiusMax = config.spawnRadiusMax ?? 450;
    const heightRange = config.heightRange ?? 120;
    const activeCount = Math.min(this.asteroids.length, config.count ?? this.count);
    const baseRadii = [1.0, 1.4, 2.2, 1.1, 1.5, 2.0];

    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (!a) continue;

      if (i >= activeCount) {
        a.isDestroyed = true;
        a.mesh.visible = false;
        continue;
      }

      const angle = rnd() * Math.PI * 2;
      const dist = spawnRadiusMin + rnd() * (spawnRadiusMax - spawnRadiusMin);
      const height = (rnd() - 0.5) * heightRange;

      a.mesh.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );

      // Exact previous asteroid scale formula
      const scale = 1.5 + rnd() * 6.5;
      const sx = scale * (0.8 + rnd() * 0.4);
      const sy = scale * (0.8 + rnd() * 0.4);
      const sz = scale * (0.8 + rnd() * 0.4);
      a.mesh.scale.set(sx, sy, sz);

      a.mesh.rotation.set(
        rnd() * Math.PI * 2,
        rnd() * Math.PI * 2,
        rnd() * Math.PI * 2
      );

      a.rotSpeed.set(
        (rnd() - 0.5) * 0.3,
        (rnd() - 0.5) * 0.3,
        (rnd() - 0.5) * 0.3
      );

      const geomIdx = i % this.geometries.length;
      const baseRadius = baseRadii[geomIdx];
      const maxScale = Math.max(sx, sy, sz);
      const avgScale = (sx + sy + sz) / 3;
      a.effectiveRadius = baseRadius * avgScale;
      // Balanced collider radius fitted cleanly to visible rock surface (~15% reduction from old 1.15 multiplier)
      // so spaceship and lasers collide directly against the rock's visible ridges without clipping or invisible air gaps
      a.boundingRadius = baseRadius * maxScale * 0.98;
      a.boundingRadiusSq = a.boundingRadius * a.boundingRadius;

      a.maxHealth = Math.max(1, Math.round(a.effectiveRadius * 0.75));
      a.health = a.maxHealth;
      a.isDestroyed = false;
      a.mesh.visible = true;
    }

    // Reset fragment pool
    if (this.fragmentPool) {
      for (const frag of this.fragmentPool) {
        frag.active = false;
        frag.mesh.visible = false;
      }
    }

    // Reset ship wreckage pool
    if (this.shipWreckagePool) {
      for (const w of this.shipWreckagePool) {
        w.active = false;
        w.mesh.visible = false;
      }
    }

    this._meshesNeedUpdate = true;
  }

  /**
   * Generates organic asteroid geometries with realistic geological formations:
   * impact basins, ejecta lips, fault cliffs, contact lobes, and smooth creased normals.
   */
  createAsteroidGeometry(radius, detail = 3, archetypeIndex = 0) {
    const geom = new THREE.IcosahedronGeometry(1.0, detail);
    const pos = geom.attributes.position;
    const count = pos.count;
    const v = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      const len = v.length() || 1.0;
      const nx = v.x / len, ny = v.y / len, nz = v.z / len;
      let r = 1.0;

      // Base 3D FBM noise for organic rock mass
      const baseNoise = fbm3D(nx * 2.2, ny * 2.2, nz * 2.2, 4);
      r += baseNoise * 0.28;

      switch (archetypeIndex) {
        case 0: { // Eros Oblong (stretched Z body with saddle neck and asymmetric bulk)
          r *= (1.0 + 0.35 * (nz * nz - 0.5 * (nx * nx + ny * ny)));
          const waist = Math.exp(-(nz * nz) / 0.35);
          r *= (1.0 - 0.20 * waist);
          r *= (1.0 + 0.12 * nz);
          break;
        }
        case 1: { // Ryugu / Bennu Top (spinning-top equatorial diamond ridge, flat poles)
          const eqDist = Math.abs(ny);
          const eqRidge = Math.exp(-(eqDist * eqDist) / 0.14);
          r *= (1.0 + 0.38 * eqRidge);
          r *= (1.0 - 0.22 * (ny * ny));
          break;
        }
        case 2: { // Cratered Heavy Spheroid (large impact basins with raised rims)
          const craters = [
            { x: 0.7, y: 0.5, z: 0.5, rad: 0.55, depth: 0.20 },
            { x: -0.6, y: -0.4, z: 0.6, rad: 0.45, depth: 0.16 },
            { x: 0.0, y: -0.8, z: -0.5, rad: 0.60, depth: 0.22 },
            { x: -0.7, y: 0.6, z: -0.3, rad: 0.38, depth: 0.14 }
          ];
          for (const c of craters) {
            const d = Math.hypot(nx - c.x, ny - c.y, nz - c.z);
            if (d < c.rad) {
              r -= (1.0 - Math.pow(d / c.rad, 2)) * c.depth;
            }
            const rimDist = d - c.rad;
            r += Math.exp(-(rimDist * rimDist) / (2 * Math.pow(c.rad * 0.25, 2))) * (c.depth * 0.35);
          }
          break;
        }
        case 3: { // Fractured Monolith (sheer planar cleavage cliff cuts)
          const planes = [
            { x: 0.8, y: 0.5, z: 0.3, cut: 0.75 },
            { x: -0.7, y: -0.6, z: 0.4, cut: 0.70 },
            { x: 0.1, y: 0.9, z: -0.4, cut: 0.80 },
            { x: -0.2, y: 0.3, z: -0.9, cut: 0.75 }
          ];
          for (const p of planes) {
            const dot = nx * p.x + ny * p.y + nz * p.z;
            if (dot > p.cut) {
              r -= (dot - p.cut) * 0.60;
            }
          }
          break;
        }
        case 4: { // Contact Binary (two coalescing rock lobes fused at neck)
          const lobeZ = nz > 0 ? (nz * 0.38) : (-nz * 0.28);
          r *= (1.0 + lobeZ);
          if (Math.abs(nz) < 0.25) r *= 0.84;
          break;
        }
        case 5: { // Porous Cleaved Boulder (vesicular hollows & diagonal rift)
          const pits = [
            { x: 0.8, y: 0.2, z: 0.4, rad: 0.45 },
            { x: -0.5, y: 0.7, z: 0.3, rad: 0.40 },
            { x: -0.3, y: -0.7, z: 0.5, rad: 0.42 }
          ];
          for (const p of pits) {
            const d = Math.hypot(nx - p.x, ny - p.y, nz - p.z);
            if (d < p.rad) {
              r -= Math.sin((1.0 - d / p.rad) * Math.PI * 0.5) * 0.20;
            }
          }
          break;
        }
      }

      const finalR = r * radius;
      pos.setXYZ(i, nx * finalR, ny * finalR, nz * finalR);
    }

    smoothNormals(geom, Math.PI / 4.2);
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    return geom;
  }

  setupSparks() {
    this.maxSparks = 2400;
    this.sparkCursor = 0;
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkVelocities = new Float32Array(this.maxSparks * 3);
    this.sparkLifetimes = new Float32Array(this.maxSparks);
    this.sparkMaxLifetimes = new Float32Array(this.maxSparks);
    this.sparkSizes = new Float32Array(this.maxSparks);
    this.sparkAlphas = new Float32Array(this.maxSparks);
    this.sparkColors = new Float32Array(this.maxSparks * 3);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(this.sparkSizes, 1));
    geom.setAttribute('alpha', new THREE.BufferAttribute(this.sparkAlphas, 1));
    geom.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Crisp perspective projection for sharp sci-fi needle sparks
          float pSize = size * (420.0 / max(1.0, -mvPosition.z));
          // Clamped tight: fine spark 1.2px up to 38px max for optical flash - zero giant blurry discs
          gl_PointSize = clamp(pSize, 1.2, 38.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord) * 2.0;
          if (dist > 1.0) discard;

          // Razor-sharp energetic sci-fi spark profile:
          // Brilliant superheated optical core + tight glowing aura
          float core = exp(-dist * dist * 16.0);
          float aura = exp(-dist * 3.6);
          vec3 c = mix(vColor, vec3(1.0, 1.0, 1.0), core * 0.94);
          float alpha = vAlpha * (core * 0.78 + aura * 0.22);

          gl_FragColor = vec4(c, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparkPoints = new THREE.Points(geom, mat);
    // CRITICAL: Dynamic particle point clouds must never be frustum culled by origin bounding sphere
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);
  }

  setupShockwaves() {
    this.maxShockwaves = 8;
    this.shockwaves = [];
    const quadGeom = new THREE.PlaneGeometry(2.0, 2.0);

    for (let i = 0; i < this.maxShockwaves; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xff6618) },
          uOpacity: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 coord = vUv - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;
            // Soft feathered Gaussian energy band with glowing core - zero hard geometric borders
            float band = exp(-pow((dist - 0.74) / 0.14, 2.0));
            float innerFade = smoothstep(0.18, 0.60, dist);
            float alpha = band * innerFade * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(quadGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.shockwaves.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.32,
        maxScale: 1.0
      });
    }
  }

  setupFlashLights() {
    this.maxFlashLights = 8;
    this.flashLights = [];
    for (let i = 0; i < this.maxFlashLights; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 40, 2.0);
      light.visible = false;
      this.scene.add(light);
      this.flashLights.push({
        light,
        active: false,
        life: 0,
        maxLife: 0.10,
        baseIntensity: 14.0
      });
    }
  }

  spawnImpactLight(pos, colorHex = '#ff2244', intensity = 14.0, distance = 40.0, duration = 0.10) {
    if (!this.flashLights) return;
    let entry = null;
    for (const fl of this.flashLights) {
      if (!fl.active) {
        entry = fl;
        break;
      }
    }
    if (!entry) entry = this.flashLights[0];

    entry.active = true;
    entry.life = 0.0;
    entry.maxLife = duration;
    entry.baseIntensity = intensity;
    entry.light.color.set(colorHex);
    entry.light.distance = distance;
    entry.light.intensity = intensity;
    entry.light.position.copy(pos);
    entry.light.visible = true;
  }

  updateFlashLights(dt) {
    if (!this.flashLights) return;
    for (const fl of this.flashLights) {
      if (!fl.active) continue;
      fl.life += dt;
      if (fl.life >= fl.maxLife) {
        fl.active = false;
        fl.light.visible = false;
        fl.light.intensity = 0;
        continue;
      }
      const progress = fl.life / fl.maxLife;
      fl.light.intensity = fl.baseIntensity * Math.pow(1.0 - progress, 2);
    }
  }

  /**
   * Pre-allocates fragment debris meshes in scene, sharing Rock032 PBR rock materials
   * @param {number} size
   */
  setupFragmentPool(size = 96) {
    this.maxFragments = size;
    this.fragmentPool = [];
    this.fragmentCursor = 0;

    for (let i = 0; i < size; i++) {
      const geom = this.fragmentGeometries[i % this.fragmentGeometries.length];
      const mat = this.rockMaterials[i % this.rockMaterials.length];
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      mesh.castShadow = false; // Disable shadow pass on tiny debris for high FPS
      mesh.receiveShadow = false;

      this.group.add(mesh);

      this.fragmentPool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(),
        active: false,
        effectiveRadius: 1.0,
        boundingRadius: 1.0,
        boundingRadiusSq: 1.0,
        baseScale: 1.0,
        health: 1,
        life: 0.0,
        maxLife: 10.0
      });
    }
  }

  /**
   * Pre-allocates angular metallic spaceship hull wreckage meshes with hot sheared emissive edges
   * @param {number} size
   */
  setupShipWreckagePool(size = 40) {
    this.maxShipWreckage = size;
    this.shipWreckagePool = [];
    this.shipWreckageCursor = 0;

    // 1. Cleaved wing/fin shard (angular wedge)
    const wingGeom = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0.0, 1.4, 0.0,   -0.9, -0.7, 0.06,   0.9, -0.7, 0.06,
      0.0, 1.4, 0.0,    0.9, -0.7, -0.06, -0.9, -0.7, -0.06,
      -0.9, -0.7, 0.06, 0.9, -0.7, 0.06,   0.9, -0.7, -0.06,
      -0.9, -0.7, 0.06, 0.9, -0.7, -0.06, -0.9, -0.7, -0.06
    ]);
    wingGeom.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeom.computeVertexNormals();

    // 2. Sheared hull armor plate (faceted box)
    const plateGeom = new THREE.BoxGeometry(0.85, 0.12, 1.4);

    // 3. Structural girder strut (long beam)
    const strutGeom = new THREE.BoxGeometry(0.2, 0.2, 2.0);

    const wreckageGeoms = [wingGeom, plateGeom, strutGeom];

    const wreckageMat = new THREE.MeshStandardMaterial({
      color: 0x3d434d,
      roughness: 0.38,
      metalness: 0.88,
      emissive: 0xff3b00,
      emissiveIntensity: 0.45,
      flatShading: true
    });

    for (let i = 0; i < size; i++) {
      const geom = wreckageGeoms[i % wreckageGeoms.length];
      const mesh = new THREE.Mesh(geom, wreckageMat);
      mesh.visible = false;
      this.group.add(mesh);

      this.shipWreckagePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(),
        active: false,
        baseScale: 1.0,
        life: 0.0,
        maxLife: 6.0
      });
    }
  }

  spawnShipWreckage(parentPos, parentRadius = 3.5, count = 10) {
    if (!this.shipWreckagePool) return;
    const pieces = Math.min(14, Math.max(6, count));

    for (let p = 0; p < pieces; p++) {
      let w = null;
      for (let i = 0; i < this.maxShipWreckage; i++) {
        const idx = (this.shipWreckageCursor + i) % this.maxShipWreckage;
        if (!this.shipWreckagePool[idx].active) {
          w = this.shipWreckagePool[idx];
          this.shipWreckageCursor = (idx + 1) % this.maxShipWreckage;
          break;
        }
      }
      if (!w) {
        w = this.shipWreckagePool[this.shipWreckageCursor];
        this.shipWreckageCursor = (this.shipWreckageCursor + 1) % this.maxShipWreckage;
      }

      const dirX = (Math.random() - 0.5) * 2;
      const dirY = (Math.random() - 0.5) * 2;
      const dirZ = (Math.random() - 0.5) * 2;
      const len = Math.hypot(dirX, dirY, dirZ) || 1;
      const normX = dirX / len;
      const normY = dirY / len;
      const normZ = dirZ / len;

      const scale = 0.55 + Math.random() * 0.85;
      w.baseScale = scale;
      w.mesh.scale.set(scale, scale, scale);

      w.mesh.position.set(
        parentPos.x + normX * (0.3 + Math.random() * 0.7),
        parentPos.y + normY * (0.3 + Math.random() * 0.7),
        parentPos.z + normZ * (0.3 + Math.random() * 0.7)
      );

      w.mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const speed = 14.0 + Math.random() * 26.0;
      w.velocity.set(normX * speed, normY * speed, normZ * speed);

      w.rotSpeed.set(
        (Math.random() - 0.5) * 7.0,
        (Math.random() - 0.5) * 7.0,
        (Math.random() - 0.5) * 7.0
      );

      w.life = 0.0;
      w.maxLife = 5.0 + Math.random() * 3.0;
      w.active = true;
      w.mesh.visible = true;
    }
  }

  updateShipWreckage(dt) {
    if (!this.shipWreckagePool) return;
    const drag = Math.pow(0.96, dt * 60);

    for (let i = 0; i < this.maxShipWreckage; i++) {
      const w = this.shipWreckagePool[i];
      if (!w.active) continue;

      w.life += dt;
      if (w.life >= w.maxLife) {
        w.active = false;
        w.mesh.visible = false;
        continue;
      }

      w.mesh.position.addScaledVector(w.velocity, dt);
      w.velocity.multiplyScalar(drag);

      w.mesh.rotation.x += w.rotSpeed.x * dt;
      w.mesh.rotation.y += w.rotSpeed.y * dt;
      w.mesh.rotation.z += w.rotSpeed.z * dt;

      if (w.life > w.maxLife * 0.70) {
        const fade = 1.0 - (w.life - w.maxLife * 0.70) / (w.maxLife * 0.30);
        const s = w.baseScale * Math.max(0.05, fade);
        w.mesh.scale.set(s, s, s);
      }
    }
  }

  /**
   * Spawns rich energetic impact particles for laser strikes on asteroids or vessels
   * @param {THREE.Vector3} hitPoint World position of the hit
   * @param {THREE.Vector3} [surfaceNormal] Normal vector pointing outward from surface
   * @param {string|THREE.Color} [laserColorHex='#ff2244'] Color of laser bolt
   * @param {THREE.Vector3} [laserDir=null] Direction the laser was travelling
   */
  spawnLaserHitEffect(hitPoint, surfaceNormal = null, laserColorHex = '#ff2244', laserDir = null) {
    if (!hitPoint) return;
    const col = laserColorHex instanceof THREE.Color ? laserColorHex : new THREE.Color(laserColorHex);
    const norm = surfaceNormal ? surfaceNormal.clone().normalize() : new THREE.Vector3(0, 1, 0);

    // 1. Dynamic Point Light flash (illuminates 3D rock crags & ship hull)
    this.spawnImpactLight(hitPoint.clone().addScaledVector(norm, 0.4), col.getHex(), 14.0, 38.0, 0.09);

    // 2. Optical Plasma Core Flash (4 bright bloom sparks right at impact point)
    for (let f = 0; f < 4; f++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.15;
      this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.15;
      this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.15;

      this.sparkVelocities[i3 + 0] = norm.x * 2.0 + (Math.random() - 0.5) * 1.5;
      this.sparkVelocities[i3 + 1] = norm.y * 2.0 + (Math.random() - 0.5) * 1.5;
      this.sparkVelocities[i3 + 2] = norm.z * 2.0 + (Math.random() - 0.5) * 1.5;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.06 + Math.random() * 0.04;
      this.sparkSizes[idx] = 14.0 + Math.random() * 10.0;
      this.sparkAlphas[idx] = 1.0;

      const cMix = col.clone().lerp(new THREE.Color(1, 1, 1), 0.88);
      this.sparkColors[i3 + 0] = cMix.r;
      this.sparkColors[i3 + 1] = cMix.g;
      this.sparkColors[i3 + 2] = cMix.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    // 3. High-speed laser plasma sparks (28 sparks in conical plume)
    const plasmaCount = 28;
    for (let c = 0; c < plasmaCount; c++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      this.sparkPositions[i3 + 0] = hitPoint.x;
      this.sparkPositions[i3 + 1] = hitPoint.y;
      this.sparkPositions[i3 + 2] = hitPoint.z;

      // Conical spray biased along surface normal
      const randDir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8
      ).normalize();

      const sprayDir = new THREE.Vector3().addVectors(norm.clone().multiplyScalar(1.4), randDir).normalize();
      const speed = 22.0 + Math.random() * 42.0;

      this.sparkVelocities[i3 + 0] = sprayDir.x * speed;
      this.sparkVelocities[i3 + 1] = sprayDir.y * speed;
      this.sparkVelocities[i3 + 2] = sprayDir.z * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.16 + Math.random() * 0.22;
      this.sparkSizes[idx] = 2.2 + Math.random() * 2.4;
      this.sparkAlphas[idx] = 1.0;

      // Color variation: laser color with hot white / yellow highlights
      const whiteMix = Math.random() < 0.4 ? 0.9 : Math.random() * 0.45;
      const cMix = col.clone().lerp(new THREE.Color(1, 1, 1), whiteMix);
      this.sparkColors[i3 + 0] = cMix.r;
      this.sparkColors[i3 + 1] = cMix.g;
      this.sparkColors[i3 + 2] = cMix.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    // 4. Pulverized rock debris & glowing ember fragments (16 particles)
    const rockEmberColors = [
      new THREE.Color('#ffaa33'),
      new THREE.Color('#ff6611'),
      new THREE.Color('#d4a373'),
      new THREE.Color('#e0e0e0'),
      new THREE.Color('#8d99ae')
    ];
    const rockCount = 16;
    for (let c = 0; c < rockCount; c++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.25;
      this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.25;
      this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.25;

      const randDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0
      ).normalize();
      const sprayDir = new THREE.Vector3().addVectors(norm.clone().multiplyScalar(0.9), randDir).normalize();
      const speed = 7.0 + Math.random() * 20.0;

      this.sparkVelocities[i3 + 0] = sprayDir.x * speed;
      this.sparkVelocities[i3 + 1] = sprayDir.y * speed;
      this.sparkVelocities[i3 + 2] = sprayDir.z * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.30 + Math.random() * 0.35;
      this.sparkSizes[idx] = 3.2 + Math.random() * 3.5;
      this.sparkAlphas[idx] = 0.95;

      const rockCol = rockEmberColors[Math.floor(Math.random() * rockEmberColors.length)];
      this.sparkColors[i3 + 0] = rockCol.r;
      this.sparkColors[i3 + 1] = rockCol.g;
      this.sparkColors[i3 + 2] = rockCol.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    if (this.sparkPoints && this.sparkPoints.geometry) {
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;
      this.sparkPoints.geometry.attributes.color.needsUpdate = true;
      this.sparkPoints.geometry.attributes.alpha.needsUpdate = true;
      this.sparkPoints.geometry.attributes.size.needsUpdate = true;
    }
  }

  /**
   * Spawns physical collision VFX when a spaceship crashes or grinds against an asteroid
   * @param {THREE.Vector3} hitPoint Contact point between spaceship and asteroid
   * @param {THREE.Vector3} pushNormal Direction from asteroid to spaceship
   * @param {number} [speed=20.0] Collision impact velocity
   * @param {boolean} [isHeavyImpact=true] True if direct hit with damage, false if sliding/grinding scrape
   */
  spawnAsteroidCollisionEffect(hitPoint, pushNormal, speed = 20.0, isHeavyImpact = true) {
    if (!hitPoint) return;
    const norm = pushNormal ? pushNormal.clone().normalize() : new THREE.Vector3(0, 1, 0);

    // Tangent plane basis vectors for spreading friction sparks along the contact seam
    const up = Math.abs(norm.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangentX = new THREE.Vector3().crossVectors(norm, up).normalize();
    const tangentY = new THREE.Vector3().crossVectors(norm, tangentX).normalize();

    if (isHeavyImpact) {
      // 1. Dynamic Point Light flash (warm amber/white)
      this.spawnImpactLight(hitPoint.clone().addScaledVector(norm, 0.6), 0xff9933, 16.0, 45.0, 0.12);

      // 2. Optical Impact Flash Core (5 bright bloom sparks at contact point)
      for (let f = 0; f < 5; f++) {
        const idx = this.sparkCursor;
        const i3 = idx * 3;

        this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.3;
        this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.3;
        this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.3;

        this.sparkVelocities[i3 + 0] = norm.x * 3.0 + (Math.random() - 0.5) * 2.0;
        this.sparkVelocities[i3 + 1] = norm.y * 3.0 + (Math.random() - 0.5) * 2.0;
        this.sparkVelocities[i3 + 2] = norm.z * 3.0 + (Math.random() - 0.5) * 2.0;

        this.sparkLifetimes[idx] = 0.0;
        this.sparkMaxLifetimes[idx] = 0.08 + Math.random() * 0.04;
        this.sparkSizes[idx] = 18.0 + Math.random() * 10.0;
        this.sparkAlphas[idx] = 1.0;

        this.sparkColors[i3 + 0] = 1.0;
        this.sparkColors[i3 + 1] = 0.95;
        this.sparkColors[i3 + 2] = 0.85;

        this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
      }

      // 3. Heavy shower of friction metal sparks (45 to 65 sparks)
      const sparkCount = Math.min(65, Math.max(30, Math.round(speed * 1.0)));
      const metalColors = [
        new THREE.Color('#ffffff'), // White-hot
        new THREE.Color('#fff275'), // Bright incandescent yellow
        new THREE.Color('#ffaa00'), // Amber gold
        new THREE.Color('#ff5500'), // Fiery orange
        new THREE.Color('#38bdf8')  // Blue electric shield spark
      ];

      for (let c = 0; c < sparkCount; c++) {
        const idx = this.sparkCursor;
        const i3 = idx * 3;

        this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.4;
        this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.4;
        this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.4;

        // Spray in tangent disk + outward normal
        const angle = Math.random() * Math.PI * 2;
        const radialSpeed = 16.0 + Math.random() * (22.0 + speed * 0.65);
        const outwardSpeed = 8.0 + Math.random() * (16.0 + speed * 0.4);

        const vx = tangentX.x * Math.cos(angle) * radialSpeed + tangentY.x * Math.sin(angle) * radialSpeed + norm.x * outwardSpeed;
        const vy = tangentX.y * Math.cos(angle) * radialSpeed + tangentY.y * Math.sin(angle) * radialSpeed + norm.y * outwardSpeed;
        const vz = tangentX.z * Math.cos(angle) * radialSpeed + tangentY.z * Math.sin(angle) * radialSpeed + norm.z * outwardSpeed;

        this.sparkVelocities[i3 + 0] = vx;
        this.sparkVelocities[i3 + 1] = vy;
        this.sparkVelocities[i3 + 2] = vz;

        this.sparkLifetimes[idx] = 0.0;
        this.sparkMaxLifetimes[idx] = 0.20 + Math.random() * 0.32;
        this.sparkSizes[idx] = 2.4 + Math.random() * 3.0;
        this.sparkAlphas[idx] = 1.0;

        const col = metalColors[Math.floor(Math.random() * metalColors.length)];
        this.sparkColors[i3 + 0] = col.r;
        this.sparkColors[i3 + 1] = col.g;
        this.sparkColors[i3 + 2] = col.b;

        this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
      }

      // 4. Crushed asteroid rock dust & pulverized chunks (20 to 30 particles)
      const rockColors = [
        new THREE.Color('#ff8833'),
        new THREE.Color('#d4a373'),
        new THREE.Color('#a89f91'),
        new THREE.Color('#6c757d'),
        new THREE.Color('#343a40')
      ];
      const rockCount = Math.min(30, Math.max(14, Math.round(speed * 0.55)));

      for (let c = 0; c < rockCount; c++) {
        const idx = this.sparkCursor;
        const i3 = idx * 3;

        this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.6;
        this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.6;
        this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.6;

        const dir = new THREE.Vector3(
          norm.x + (Math.random() - 0.5) * 1.4,
          norm.y + (Math.random() - 0.5) * 1.4,
          norm.z + (Math.random() - 0.5) * 1.4
        ).normalize();
        const rSpeed = 6.0 + Math.random() * 20.0;

        this.sparkVelocities[i3 + 0] = dir.x * rSpeed;
        this.sparkVelocities[i3 + 1] = dir.y * rSpeed;
        this.sparkVelocities[i3 + 2] = dir.z * rSpeed;

        this.sparkLifetimes[idx] = 0.0;
        this.sparkMaxLifetimes[idx] = 0.35 + Math.random() * 0.45;
        this.sparkSizes[idx] = 4.0 + Math.random() * 4.5;
        this.sparkAlphas[idx] = 0.9;

        const col = rockColors[Math.floor(Math.random() * rockColors.length)];
        this.sparkColors[i3 + 0] = col.r;
        this.sparkColors[i3 + 1] = col.g;
        this.sparkColors[i3 + 2] = col.b;

        this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
      }
    } else {
      // Light continuous scraping stream (7 sparks) while sliding along the asteroid
      const scrapeCount = 7;
      for (let c = 0; c < scrapeCount; c++) {
        const idx = this.sparkCursor;
        const i3 = idx * 3;

        this.sparkPositions[i3 + 0] = hitPoint.x + (Math.random() - 0.5) * 0.3;
        this.sparkPositions[i3 + 1] = hitPoint.y + (Math.random() - 0.5) * 0.3;
        this.sparkPositions[i3 + 2] = hitPoint.z + (Math.random() - 0.5) * 0.3;

        const angle = Math.random() * Math.PI * 2;
        const rSpeed = 10.0 + Math.random() * 18.0;
        this.sparkVelocities[i3 + 0] = tangentX.x * Math.cos(angle) * rSpeed + norm.x * 6.0;
        this.sparkVelocities[i3 + 1] = tangentX.y * Math.cos(angle) * rSpeed + norm.y * 6.0;
        this.sparkVelocities[i3 + 2] = tangentX.z * Math.cos(angle) * rSpeed + norm.z * 6.0;

        this.sparkLifetimes[idx] = 0.0;
        this.sparkMaxLifetimes[idx] = 0.14 + Math.random() * 0.18;
        this.sparkSizes[idx] = 2.0 + Math.random() * 1.8;
        this.sparkAlphas[idx] = 0.85;

        // Warm yellow-gold scrape sparks
        this.sparkColors[i3 + 0] = 1.0;
        this.sparkColors[i3 + 1] = 0.75 + Math.random() * 0.25;
        this.sparkColors[i3 + 2] = 0.15;

        this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
      }
    }

    if (this.sparkPoints && this.sparkPoints.geometry) {
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;
      this.sparkPoints.geometry.attributes.color.needsUpdate = true;
      this.sparkPoints.geometry.attributes.alpha.needsUpdate = true;
      this.sparkPoints.geometry.attributes.size.needsUpdate = true;
    }
  }

  spawnImpactSparks(hitPoint, colorHex = '#ff2244') {
    this.spawnLaserHitEffect(hitPoint, null, colorHex);
  }

  /**
   * Spawns a high-energy sci-fi kinetic rupture VFX:
   * Razor-sharp needle sparks, brilliant optical detonation flash, and high-velocity plasma ejecta.
   * Zero blurry cartoon fireballs or flat 2D discs.
   *
   * @param {THREE.Vector3} center Explosion origin in world space
   * @param {number} [radius=4.0] Scale radius of the exploding body
   * @param {boolean} [isShip=false] True if vessel destruction, false if celestial asteroid
   */
  spawnExplosionSparks(center, radius = 4.0, isShip = false) {
    if (!center) return;
    const r = Math.max(1.8, radius);

    // 1. High-Intensity Dynamic Point Light (instantaneous 0.12s pulse)
    const lightIntensity = Math.min(38.0, Math.max(18.0, r * 4.2));
    const lightDist = Math.min(180.0, Math.max(60.0, r * 14.0));
    const lightColor = isShip ? 0x88ddff : 0xffaa44;
    this.spawnImpactLight(center, lightColor, lightIntensity, lightDist, 0.12);

    // 2. Optical Detonation Core Rupture (8 to 12 tight, brilliant white-hot sparks)
    const coreCount = Math.min(12, Math.max(7, Math.round(r * 1.5)));
    for (let f = 0; f < coreCount; f++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      this.sparkPositions[i3 + 0] = center.x + (Math.random() - 0.5) * (r * 0.25);
      this.sparkPositions[i3 + 1] = center.y + (Math.random() - 0.5) * (r * 0.25);
      this.sparkPositions[i3 + 2] = center.z + (Math.random() - 0.5) * (r * 0.25);

      this.sparkVelocities[i3 + 0] = (Math.random() - 0.5) * 4.0;
      this.sparkVelocities[i3 + 1] = (Math.random() - 0.5) * 4.0;
      this.sparkVelocities[i3 + 2] = (Math.random() - 0.5) * 4.0;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.07 + Math.random() * 0.05; // Ultra-fast punchy flash (4-7 frames)
      this.sparkSizes[idx] = Math.min(24.0, Math.max(14.0, r * 3.2));
      this.sparkAlphas[idx] = 1.0;

      if (isShip) {
        // Superheated blue-white reactor breach
        this.sparkColors[i3 + 0] = 0.90;
        this.sparkColors[i3 + 1] = 0.96;
        this.sparkColors[i3 + 2] = 1.0;
      } else {
        // Searing white-hot mineral rupture
        this.sparkColors[i3 + 0] = 1.0;
        this.sparkColors[i3 + 1] = 0.97;
        this.sparkColors[i3 + 2] = 0.90;
      }

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    // 3. High-Velocity Radial Kinetic Needle Sparks (90 to 150 fast sparks)
    // Searing molten metal & plasma needles blasting out at 35 to 85 m/s
    const needleCount = Math.min(150, Math.max(75, Math.round(r * 18.0)));
    const shipNeedleColors = [
      new THREE.Color('#00ffff'), // Cyan shield capacitor
      new THREE.Color('#38bdf8'), // Electric sky blue
      new THREE.Color('#ffffff'), // White-hot hull armor
      new THREE.Color('#ffaa00'), // Superheated copper
      new THREE.Color('#ff5500')  // Fiery propellant
    ];
    const asteroidNeedleColors = [
      new THREE.Color('#ffffff'), // White-hot rock spark
      new THREE.Color('#fff4b8'), // Incandescent golden yellow
      new THREE.Color('#ffaa00'), // Amber mineral ember
      new THREE.Color('#ff6600'), // Fiery basalt streak
      new THREE.Color('#ff3300')  // Deep incandescent red
    ];
    const needlePalette = isShip ? shipNeedleColors : asteroidNeedleColors;

    for (let c = 0; c < needleCount; c++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);

      const offsetDist = Math.random() * (r * 0.35);
      this.sparkPositions[i3 + 0] = center.x + dirX * offsetDist;
      this.sparkPositions[i3 + 1] = center.y + dirY * offsetDist;
      this.sparkPositions[i3 + 2] = center.z + dirZ * offsetDist;

      // High-velocity ballistic ejection
      const speed = 32.0 + Math.random() * (48.0 + r * 4.0);
      this.sparkVelocities[i3 + 0] = dirX * speed;
      this.sparkVelocities[i3 + 1] = dirY * speed;
      this.sparkVelocities[i3 + 2] = dirZ * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.22 + Math.random() * 0.28;
      // Tight, crisp needle point sizes (1.8 to 3.8px)
      this.sparkSizes[idx] = 1.8 + Math.random() * 2.2;
      this.sparkAlphas[idx] = 1.0;

      const col = needlePalette[Math.floor(Math.random() * needlePalette.length)];
      this.sparkColors[i3 + 0] = col.r;
      this.sparkColors[i3 + 1] = col.g;
      this.sparkColors[i3 + 2] = col.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    // 4. Directional Plasma Shrapnel & Molten Debris Flecks (35 to 60 medium particles)
    const debrisCount = Math.min(60, Math.max(25, Math.round(r * 7.5)));
    for (let s = 0; s < debrisCount; s++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);

      this.sparkPositions[i3 + 0] = center.x + dirX * (r * 0.4);
      this.sparkPositions[i3 + 1] = center.y + dirY * (r * 0.4);
      this.sparkPositions[i3 + 2] = center.z + dirZ * (r * 0.4);

      const speed = 12.0 + Math.random() * (24.0 + r * 2.0);
      this.sparkVelocities[i3 + 0] = dirX * speed;
      this.sparkVelocities[i3 + 1] = dirY * speed;
      this.sparkVelocities[i3 + 2] = dirZ * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.35 + Math.random() * 0.30;
      this.sparkSizes[idx] = 3.0 + Math.random() * 2.8;
      this.sparkAlphas[idx] = 0.95;

      const col = needlePalette[Math.floor(Math.random() * needlePalette.length)];
      this.sparkColors[i3 + 0] = col.r;
      this.sparkColors[i3 + 1] = col.g;
      this.sparkColors[i3 + 2] = col.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }

    // Immediately mark geometry buffer attributes dirty
    if (this.sparkPoints && this.sparkPoints.geometry) {
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;
      this.sparkPoints.geometry.attributes.color.needsUpdate = true;
      this.sparkPoints.geometry.attributes.alpha.needsUpdate = true;
      this.sparkPoints.geometry.attributes.size.needsUpdate = true;
    }
  }

  spawnShockwave(pos, radius, normal = null, colorHex = 0xff6618, duration = 0.32) {
    // Replaced flat 2D cardboard discs with dynamic omni-light flash
    this.spawnImpactLight(pos, colorHex, 20.0, Math.max(45.0, radius * 8.0), duration);
  }

  /**
   * Activates a pre-allocated fragment from the pool (0 memory allocations)
   * Exact previous fragment sizing: 20% to 35% of parent size
   */
  spawnFragmentFromPool(parentPos, parentRadius) {
    let frag = null;
    for (let i = 0; i < this.maxFragments; i++) {
      const idx = (this.fragmentCursor + i) % this.maxFragments;
      if (!this.fragmentPool[idx].active) {
        frag = this.fragmentPool[idx];
        this.fragmentCursor = (idx + 1) % this.maxFragments;
        break;
      }
    }
    if (!frag) {
      frag = this.fragmentPool[this.fragmentCursor];
      this.fragmentCursor = (this.fragmentCursor + 1) % this.maxFragments;
    }

    const dirX = (Math.random() - 0.5) * 2;
    const dirY = (Math.random() - 0.5) * 2;
    const dirZ = (Math.random() - 0.5) * 2;
    const len = Math.hypot(dirX, dirY, dirZ) || 1;
    const normX = dirX / len;
    const normY = dirY / len;
    const normZ = dirZ / len;

    const spawnDist = (0.15 + Math.random() * 0.45) * parentRadius;
    frag.mesh.position.set(
      parentPos.x + normX * spawnDist,
      parentPos.y + normY * spawnDist,
      parentPos.z + normZ * spawnDist
    );

    // Natural fragment size distribution: varied from sharp gravel chips (10%) to hefty boulders (35%)
    const sizeRatio = 0.10 + Math.random() * 0.25;
    const fragScale = Math.max(0.35, sizeRatio * parentRadius);
    frag.baseScale = fragScale;
    frag.mesh.scale.set(fragScale, fragScale, fragScale);

    frag.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Dynamic ejection speed: smaller fragments fly faster, larger chunks lumber outward
    const speed = (16.0 + Math.random() * 24.0) / Math.sqrt(sizeRatio * 3.5);
    frag.velocity.set(normX * speed, normY * speed, normZ * speed);

    // Heavy 3D tumbling rotation
    frag.rotSpeed.set(
      (Math.random() - 0.5) * 6.5,
      (Math.random() - 0.5) * 6.5,
      (Math.random() - 0.5) * 6.5
    );

    frag.effectiveRadius = fragScale;
    frag.boundingRadius = fragScale * 1.05;
    frag.boundingRadiusSq = frag.boundingRadius * frag.boundingRadius;
    frag.health = 1;
    frag.life = 0.0;
    frag.maxLife = 6.0 + Math.random() * 4.0;
    frag.active = true;
    frag.mesh.visible = true;
  }

  /**
   * Checks collision of a laser bolt segment [oldPos, newPos] with zero vector allocations
   * @param {THREE.Vector3} oldPos
   * @param {THREE.Vector3} newPos
   * @param {string} laserColorHex
   * @returns {boolean} True if hit
   */
  checkLaserHit(oldPos, newPos, laserColorHex = '#ff2244') {
    if (!this.enabled || !this.group.visible) return false;
    _seg.subVectors(newPos, oldPos);
    const segLenSq = _seg.lengthSq();
    if (segLenSq < 0.0001) return false;

    // 1. Check main asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.isDestroyed || !a.mesh.visible) continue;

      const aPos = a.mesh.position;
      const r = a.boundingRadius;

      // Fast AABB early rejection
      const pad = r + 2.0;
      if (oldPos.x > aPos.x + pad && newPos.x > aPos.x + pad) continue;
      if (oldPos.x < aPos.x - pad && newPos.x < aPos.x - pad) continue;
      if (oldPos.y > aPos.y + pad && newPos.y > aPos.y + pad) continue;
      if (oldPos.y < aPos.y - pad && newPos.y < aPos.y - pad) continue;
      if (oldPos.z > aPos.z + pad && newPos.z > aPos.z + pad) continue;
      if (oldPos.z < aPos.z - pad && newPos.z < aPos.z - pad) continue;

      _v.subVectors(aPos, oldPos);
      const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
      _closest.copy(oldPos).addScaledVector(_seg, t);

      const distSq = _closest.distanceToSquared(aPos);
      if (distSq <= a.boundingRadiusSq) {
        const norm = new THREE.Vector3().subVectors(_closest, aPos).normalize();
        this.handleHit(a, _closest, laserColorHex, i, norm);
        return true;
      }
    }

    // 2. Check active fragments
    for (let i = 0; i < this.maxFragments; i++) {
      const frag = this.fragmentPool[i];
      if (!frag.active || !frag.mesh.visible) continue;

      const fPos = frag.mesh.position;
      const r = frag.boundingRadius;

      const pad = r + 1.5;
      if (oldPos.x > fPos.x + pad && newPos.x > fPos.x + pad) continue;
      if (oldPos.x < fPos.x - pad && newPos.x < fPos.x - pad) continue;
      if (oldPos.y > fPos.y + pad && newPos.y > fPos.y + pad) continue;
      if (oldPos.y < fPos.y - pad && newPos.y < fPos.y - pad) continue;
      if (oldPos.z > fPos.z + pad && newPos.z > fPos.z + pad) continue;
      if (oldPos.z < fPos.z - pad && newPos.z < fPos.z - pad) continue;

      _v.subVectors(fPos, oldPos);
      const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
      _closest.copy(oldPos).addScaledVector(_seg, t);

      const distSq = _closest.distanceToSquared(fPos);
      if (distSq <= frag.boundingRadiusSq) {
        const norm = new THREE.Vector3().subVectors(_closest, fPos).normalize();
        this.handleFragmentHit(frag, _closest, laserColorHex, norm);
        return true;
      }
    }

    return false;
  }

  handleHit(a, hitPoint, laserColorHex, index = -1, surfaceNormal = null) {
    a.health -= 1;
    const norm = surfaceNormal || new THREE.Vector3().subVectors(hitPoint, a.mesh.position).normalize();
    this.spawnLaserHitEffect(hitPoint, norm, laserColorHex);

    if (this.onAsteroidDamaged && index >= 0) {
      this.onAsteroidDamaged(index, a.health, a.maxHealth, hitPoint.toArray(), laserColorHex);
    }

    if (a.health <= 0) {
      this.explodeAsteroid(a);
      if (this.onAsteroidDestroyed && index >= 0) {
        this.onAsteroidDestroyed(index, a.mesh.position.toArray());
      }
    }
  }

  handleFragmentHit(frag, hitPoint, laserColorHex, surfaceNormal = null) {
    frag.active = false;
    frag.mesh.visible = false;
    const worldPos = new THREE.Vector3();
    frag.mesh.getWorldPosition(worldPos);
    const norm = surfaceNormal || new THREE.Vector3().subVectors(hitPoint, worldPos).normalize();
    this.spawnLaserHitEffect(hitPoint, norm, laserColorHex);
    this.spawnExplosionSparks(worldPos, frag.effectiveRadius, false);
    sounds.playHit();
    this._meshesNeedUpdate = true;
  }

  damageAsteroidByIndex(index, health, hitPointArr = null, laserColorHex = '#ff2244') {
    if (!this.asteroids || !this.asteroids[index]) return;
    const a = this.asteroids[index];
    if (a.isDestroyed) return;
    if (typeof health === 'number') {
      a.health = health;
    } else {
      a.health -= 1;
    }
    if (hitPointArr) {
      const hitPoint = new THREE.Vector3().fromArray(hitPointArr);
      const norm = new THREE.Vector3().subVectors(hitPoint, a.mesh.position).normalize();
      this.spawnLaserHitEffect(hitPoint, norm, laserColorHex);
    }
    if (a.health <= 0) {
      this.explodeAsteroid(a);
    }
  }

  destroySilent(index) {
    if (this.asteroids && this.asteroids[index]) {
      const a = this.asteroids[index];
      if (!a.isDestroyed) {
        a.isDestroyed = true;
        a.mesh.visible = false;
        this._meshesNeedUpdate = true;
      }
    }
  }

  getDestroyedIndices() {
    const list = [];
    for (let i = 0; i < this.asteroids.length; i++) {
      if (this.asteroids[i].isDestroyed) {
        list.push(i);
      }
    }
    return list;
  }

  explodeAsteroidByIndex(index) {
    if (this.asteroids && this.asteroids[index]) {
      this.explodeAsteroid(this.asteroids[index]);
    }
  }

  /**
   * Explodes asteroid instantly without scene graph changes or allocations
   */
  explodeAsteroid(a) {
    if (a.isDestroyed) return;
    a.isDestroyed = true;
    a.mesh.visible = false;

    sounds.playExplosion(0.85);

    // Trigger visual effects: crisp optical rupture flash and high-speed needle sparks
    const worldPos = new THREE.Vector3();
    a.mesh.getWorldPosition(worldPos);
    this.spawnExplosionSparks(worldPos, a.effectiveRadius, false);

    // Visceral 3D physical shatter: asteroid fractures into 8 to 16 physical tumbling boulders & shards!
    const numPieces = Math.min(16, Math.max(7, Math.round(a.effectiveRadius * 2.8)));
    for (let p = 0; p < numPieces; p++) {
      this.spawnFragmentFromPool(worldPos, a.effectiveRadius);
    }

    this._meshesNeedUpdate = true;
  }

  /**
   * Reuses internal array to eliminate garbage collection
   */
  getMeshes() {
    if (!this.enabled || !this.group.visible) return [];
    if (this._meshesNeedUpdate) {
      this._cachedMeshes.length = 0;

      for (let i = 0; i < this.asteroids.length; i++) {
        const a = this.asteroids[i];
        if (!a.isDestroyed && a.mesh.visible) {
          this._cachedMeshes.push(a.mesh);
        }
      }

      for (let i = 0; i < this.maxFragments; i++) {
        const f = this.fragmentPool[i];
        if (f.active && f.mesh.visible) {
          this._cachedMeshes.push(f.mesh);
        }
      }

      this._meshesNeedUpdate = false;
    }
    return this._cachedMeshes;
  }

  update(dt) {
    if (!this.enabled || !this.group.visible) return;
    // 1. Update sparks
    this.updateSparks(dt);

    // 2. Update shockwaves
    this.updateShockwaves(dt);

    // 2.5. Update dynamic impact lights
    this.updateFlashLights(dt);

    // 3. Update active asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.isDestroyed || !a.mesh.visible) continue;

      a.mesh.rotation.x += a.rotSpeed.x * dt;
      a.mesh.rotation.y += a.rotSpeed.y * dt;
      a.mesh.rotation.z += a.rotSpeed.z * dt;
    }

    // 4. Update fragments from pool
    const drag = Math.pow(0.96, dt * 60);
    for (let i = 0; i < this.maxFragments; i++) {
      const frag = this.fragmentPool[i];
      if (!frag.active) continue;

      frag.life += dt;
      if (frag.life >= frag.maxLife) {
        frag.active = false;
        frag.mesh.visible = false;
        this._meshesNeedUpdate = true;
        continue;
      }

      frag.mesh.position.addScaledVector(frag.velocity, dt);
      frag.velocity.multiplyScalar(drag);

      frag.mesh.rotation.x += frag.rotSpeed.x * dt;
      frag.mesh.rotation.y += frag.rotSpeed.y * dt;
      frag.mesh.rotation.z += frag.rotSpeed.z * dt;

      // Shrink gently near end of life
      if (frag.life > frag.maxLife * 0.75) {
        const fade = 1.0 - (frag.life - frag.maxLife * 0.75) / (frag.maxLife * 0.25);
        const s = frag.baseScale * Math.max(0.05, fade);
        frag.mesh.scale.set(s, s, s);
      }
    }

    // 5. Update ship wreckage
    this.updateShipWreckage(dt);
  }

  updateSparks(dt) {
    const posAttr = this.sparkPoints.geometry.attributes.position;
    const alphaAttr = this.sparkPoints.geometry.attributes.alpha;
    const sizeAttr = this.sparkPoints.geometry.attributes.size;
    const colorAttr = this.sparkPoints.geometry.attributes.color;

    let hasActive = false;

    for (let i = 0; i < this.maxSparks; i++) {
      if (this.sparkAlphas[i] <= 0) continue;
      hasActive = true;

      this.sparkLifetimes[i] += dt;
      if (this.sparkLifetimes[i] >= this.sparkMaxLifetimes[i]) {
        this.sparkAlphas[i] = 0;
        alphaAttr.setX(i, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      const progress = this.sparkLifetimes[i] / this.sparkMaxLifetimes[i];
      const i3 = i * 3;

      this.sparkPositions[i3 + 0] += this.sparkVelocities[i3 + 0] * dt;
      this.sparkPositions[i3 + 1] += this.sparkVelocities[i3 + 1] * dt;
      this.sparkPositions[i3 + 2] += this.sparkVelocities[i3 + 2] * dt;

      this.sparkVelocities[i3 + 0] *= 0.95;
      this.sparkVelocities[i3 + 1] *= 0.95;
      this.sparkVelocities[i3 + 2] *= 0.95;

      posAttr.setXYZ(i, this.sparkPositions[i3 + 0], this.sparkPositions[i3 + 1], this.sparkPositions[i3 + 2]);

      // Sharp spark size taper: maintains needle crispness then tapers out
      const sizeScale = Math.max(0.18, 1.0 - progress * 0.72);
      sizeAttr.setX(i, this.sparkSizes[i] * sizeScale);

      // Fast, punchy energetic decay
      alphaAttr.setX(i, (1.0 - progress) * (1.0 - progress * 0.45));
    }

    if (hasActive) {
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    }
  }

  updateShockwaves(dt) {
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }

      const progress = sw.life / sw.maxLife;
      const easeOut = 1.0 - Math.pow(1.0 - progress, 3);
      const curScale = sw.maxScale * easeOut;
      sw.mesh.scale.set(curScale, curScale, curScale);
      if (sw.mat.uniforms && sw.mat.uniforms.uOpacity) {
        sw.mat.uniforms.uOpacity.value = (1.0 - progress) * 0.95;
      } else if (sw.mat.opacity !== undefined) {
        sw.mat.opacity = (1.0 - progress) * 0.95;
      }
    }
  }
}
