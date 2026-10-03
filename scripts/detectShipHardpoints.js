import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import fs from 'fs';
import path from 'path';

/**
 * Geometric circle fit in 2D (Kasa/Pratt algebraic method)
 * Given points [{x, y}], returns { x: centerX, y: centerY, r: radius, relError, count }
 */
function fitCircle2D(points) {
  if (points.length < 6) return null;
  const n = points.length;

  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let mXX = 0, mYY = 0, mXY = 0, mXZ = 0, mYZ = 0;
  for (let i = 0; i < n; i++) {
    const u = points[i].x - meanX;
    const v = points[i].y - meanY;
    const z = u * u + v * v;
    mXX += u * u;
    mYY += v * v;
    mXY += u * v;
    mXZ += u * z;
    mYZ += v * z;
  }

  const det = mXX * mYY - mXY * mXY;
  if (Math.abs(det) < 1e-7) return null;

  const u0 = (mXZ * mYY - mYZ * mXY) / (2 * det);
  const v0 = (mYZ * mXX - mXZ * mXY) / (2 * det);

  const cx = u0 + meanX;
  const cy = v0 + meanY;
  const r = Math.sqrt(u0 * u0 + v0 * v0 + (mXX + mYY) / n);

  if (isNaN(r) || r < 0.05 || r > 0.40) return null;

  let errorSum = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(points[i].x - cx, points[i].y - cy);
    errorSum += Math.abs(d - r);
  }
  const relError = errorSum / (n * r);

  return {
    x: cx,
    y: cy,
    r,
    relError,
    count: n
  };
}

/**
 * Analyzes the 3D FBX mesh geometry of a StarSparrow spaceship
 * and extracts accurate engine nozzle thruster positions and weapon hardpoints.
 */
export async function analyzeShipGeometry(fbxPath, scaleFactor = 4.0) {
  const buffer = fs.readFileSync(fbxPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new FBXLoader();
  const fbx = loader.parse(arrayBuffer, '');

  // 1. Exact transformation applied by SpaceshipController.js
  const initialBox = new THREE.Box3().setFromObject(fbx);
  const size = new THREE.Vector3();
  initialBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = scaleFactor / maxDim;

  fbx.scale.setScalar(scale);
  fbx.rotation.y = Math.PI; // Face forward along -Z, tail along +Z

  const container = new THREE.Group();
  container.add(fbx);
  container.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(fbx);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  fbx.position.sub(center);
  container.updateMatrixWorld(true);

  // 2. Collect all world vertices and normals
  const allVerts = [];
  container.traverse((child) => {
    if (child.isMesh) {
      const posAttr = child.geometry.attributes.position;
      const normAttr = child.geometry.attributes.normal;
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
        if (normAttr) {
          n.fromBufferAttribute(normAttr, i).transformDirection(child.matrixWorld);
        }
        allVerts.push({ pos: v.clone(), norm: n.clone() });
      }
    }
  });

  const finalBox = new THREE.Box3().setFromObject(container);
  const zMin = finalBox.min.z;
  const zMax = finalBox.max.z;
  const zLen = zMax - zMin;
  const xSpan = finalBox.max.x - finalBox.min.x;
  const halfSpan = xSpan / 2;

  // 3. Detect Engine Thrusters
  // Slice rear vertices in the rear 25% of the ship
  const rearThreshold = zMax - 0.25 * zLen;
  const rearVerts = allVerts.filter((v) => v.pos.z > rearThreshold);

  const zStep = 0.02;
  const zBins = new Map();
  rearVerts.forEach((item) => {
    const key = Math.round(item.pos.z / zStep) * zStep;
    if (!zBins.has(key)) zBins.set(key, []);
    zBins.get(key).push(item.pos);
  });

  const detectedRings = [];
  for (const [zVal, pts] of zBins.entries()) {
    if (pts.length < 8) continue;

    // Cluster points in (X, Y) space
    const clusters = [];
    pts.forEach((p) => {
      let matched = clusters.find((cl) =>
        cl.some((cp) => Math.hypot(cp.x - p.x, cp.y - p.y) < 0.18)
      );
      if (!matched) {
        matched = [];
        clusters.push(matched);
      }
      matched.push(p);
    });

    clusters.forEach((cl) => {
      if (cl.length >= 8) {
        const circle = fitCircle2D(cl);
        if (circle && circle.relError < 0.17 && circle.r >= 0.06 && circle.r <= 0.35) {
          detectedRings.push({
            x: circle.x,
            y: circle.y,
            z: zVal,
            radius: circle.r,
            relError: circle.relError,
            count: circle.count
          });
        }
      }
    });
  }

  // Deduplicate rings by (X, Y) proximity, keeping the rearmost circle (maximum Z = exit nozzle bell)
  detectedRings.sort((a, b) => b.z - a.z);
  const nozzleCandidates = [];
  detectedRings.forEach((ring) => {
    const existing = nozzleCandidates.find(
      (n) => Math.hypot(n.x - ring.x, n.y - ring.y) < 0.20
    );
    if (!existing) {
      nozzleCandidates.push(ring);
    }
  });

  // Separate and pair nozzles symmetrically
  const finalThrusters = [];
  const paired = new Set();

  // A. Center engine (|X| < 0.10)
  for (let i = 0; i < nozzleCandidates.length; i++) {
    const cand = nozzleCandidates[i];
    if (Math.abs(cand.x) < 0.10 && !paired.has(i)) {
      const radius = +cand.radius.toFixed(3);
      const length = +(Math.max(0.65, radius * 4.0)).toFixed(2);
      finalThrusters.push({
        id: 'center',
        position: { x: 0, y: +cand.y.toFixed(3), z: +cand.z.toFixed(3) },
        size: { radius, length },
        color: '#38bdf8',
        coreColor: '#ffffff',
        lightIntensity: 2.5
      });
      paired.add(i);
      break; // At most one primary center engine
    }
  }

  // B. Symmetric twin engines
  const symmetricPairs = [];
  for (let i = 0; i < nozzleCandidates.length; i++) {
    if (paired.has(i)) continue;
    const a = nozzleCandidates[i];

    for (let j = i + 1; j < nozzleCandidates.length; j++) {
      if (paired.has(j)) continue;
      const b = nozzleCandidates[j];

      // Must be on opposite sides of centerline with similar Y and Z
      if (
        Math.abs(Math.abs(a.x) - Math.abs(b.x)) < 0.18 &&
        Math.sign(a.x) !== Math.sign(b.x) &&
        Math.abs(a.y - b.y) < 0.15 &&
        Math.abs(a.z - b.z) < 0.20
      ) {
        const avgX = (Math.abs(a.x) + Math.abs(b.x)) / 2;
        const avgY = (a.y + b.y) / 2;
        const avgZ = Math.max(a.z, b.z);
        const avgR = (a.radius + b.radius) / 2;

        symmetricPairs.push({
          x: avgX,
          y: avgY,
          z: avgZ,
          radius: avgR
        });
        paired.add(i);
        paired.add(j);
        break;
      }
    }
  }

  // Sort pairs by primary engine (largest radius or rearmost Z)
  symmetricPairs.sort((a, b) => (b.z * 2 + b.radius) - (a.z * 2 + a.radius));

  // Take AT MOST 1 symmetric pair (port & starboard).
  // 1 center + 1 pair = 3 engines max; or no center + 1 pair = 2 engines max.
  if (symmetricPairs.length > 0) {
    const pair = symmetricPairs[0];
    const radius = +pair.radius.toFixed(3);
    const length = +(Math.max(0.65, radius * 4.0)).toFixed(2);

    finalThrusters.push(
      {
        id: 'port',
        position: { x: -+pair.x.toFixed(3), y: +pair.y.toFixed(3), z: +pair.z.toFixed(3) },
        size: { radius, length },
        color: '#38bdf8',
        coreColor: '#ffffff',
        lightIntensity: 2.2
      },
      {
        id: 'starboard',
        position: { x: +pair.x.toFixed(3), y: +pair.y.toFixed(3), z: +pair.z.toFixed(3) },
        size: { radius, length },
        color: '#38bdf8',
        coreColor: '#ffffff',
        lightIntensity: 2.2
      }
    );
  }

  // Fallback if geometric circle detection found nothing
  if (finalThrusters.length === 0) {
    const rearBackVerts = rearVerts.filter((v) => v.pos.z > zMax - 0.08 * zLen);
    const avgY = rearBackVerts.reduce((s, v) => s + v.pos.y, 0) / (rearBackVerts.length || 1);
    const spreadVerts = rearBackVerts.filter((v) => v.pos.x > 0.2);
    const spreadX = spreadVerts.length > 0
      ? spreadVerts.reduce((s, v) => s + v.pos.x, 0) / spreadVerts.length
      : 0.65;

    finalThrusters.push(
      {
        id: 'port',
        position: { x: -+spreadX.toFixed(3), y: +avgY.toFixed(3), z: +(zMax - 0.05).toFixed(3) },
        size: { radius: 0.20, length: 0.80 },
        color: '#38bdf8',
        coreColor: '#ffffff',
        lightIntensity: 2.2
      },
      {
        id: 'starboard',
        position: { x: +spreadX.toFixed(3), y: +avgY.toFixed(3), z: +(zMax - 0.05).toFixed(3) },
        size: { radius: 0.20, length: 0.80 },
        color: '#38bdf8',
        coreColor: '#ffffff',
        lightIntensity: 2.2
      }
    );
  }

  // Hard clamp: Ensure NO ship can ever have more than 3 thrusters
  if (finalThrusters.length > 3) {
    finalThrusters.length = 3;
  }

  // 4. Detect Shooting Points (Guns & Weapon Hardpoints)
  const shootingPoints = [];

  // A. Nose Cannon: forward-most point near center line
  const nosePts = allVerts.filter((v) => Math.abs(v.pos.x) < 0.18 && v.pos.z < zMin + 0.12 * zLen);
  if (nosePts.length > 0) {
    nosePts.sort((a, b) => a.pos.z - b.pos.z);
    const noseTip = nosePts[0].pos;
    shootingPoints.push({
      id: 'gun_nose',
      name: 'Nose Cannon',
      position: { x: 0, y: +noseTip.y.toFixed(3), z: +(noseTip.z - 0.05).toFixed(3) },
      color: '#ff2244',
      size: 0.14,
      type: 'laser'
    });
  }

  // B. Wing Cannons: lateral wing leading edges
  const wingVerts = allVerts.filter((v) => v.pos.x < -0.30 * halfSpan && v.pos.x > -0.88 * halfSpan);
  if (wingVerts.length > 0) {
    wingVerts.sort((a, b) => a.pos.z - b.pos.z);
    const wingGun = wingVerts[0].pos;
    const wingX = Math.abs(wingGun.x);
    const wingY = wingGun.y;
    const wingZ = wingGun.z - 0.05;

    shootingPoints.push(
      {
        id: 'gun_port',
        name: 'Port Wing Cannon',
        position: { x: -+wingX.toFixed(3), y: +wingY.toFixed(3), z: +wingZ.toFixed(3) },
        color: '#ff2244',
        size: 0.12,
        type: 'laser'
      },
      {
        id: 'gun_starboard',
        name: 'Starboard Wing Cannon',
        position: { x: +wingX.toFixed(3), y: +wingY.toFixed(3), z: +wingZ.toFixed(3) },
        color: '#ff2244',
        size: 0.12,
        type: 'laser'
      }
    );
  }

  return {
    dimensions: {
      width: +(xSpan).toFixed(2),
      height: +(finalBox.max.y - finalBox.min.y).toFixed(2),
      length: +zLen.toFixed(2)
    },
    thrusters: finalThrusters,
    shootingPoints
  };
}

/**
 * Main script runner
 * Can display results or directly update src/spaceshipConfig.js
 */
async function main() {
  const shouldUpdate = process.argv.includes('--update');
  console.log(`Starting spaceship geometry hardpoint analysis (update=${shouldUpdate})...\n`);

  const results = {};
  for (let i = 1; i <= 40; i++) {
    const fbxPath = path.join('public', 'models', `StarSparrow${i}.fbx`);
    if (!fs.existsSync(fbxPath)) {
      console.warn(`Model public/models/StarSparrow${i}.fbx not found, skipping.`);
      continue;
    }

    const data = await analyzeShipGeometry(fbxPath);
    results[i] = data;

    const tDesc = data.thrusters.map((t) => `${t.id} [${t.position.x}, ${t.position.y}, ${t.position.z}] r=${t.size.radius}`).join(' | ');
    const gDesc = data.shootingPoints.map((g) => `${g.id} [${g.position.x}, ${g.position.y}, ${g.position.z}]`).join(' | ');
    console.log(`Ship ${i} (${data.dimensions.width}m x ${data.dimensions.height}m x ${data.dimensions.length}m):`);
    console.log(`  Thrusters (${data.thrusters.length}): ${tDesc}`);
    console.log(`  Weapons   (${data.shootingPoints.length}): ${gDesc}\n`);
  }

  if (shouldUpdate) {
    const configPath = path.join('src', 'spaceshipConfig.js');
    console.log(`Updating ${configPath} with detected geometry hardpoints...`);
    const configModule = await import('../src/spaceshipConfig.js');
    const existingConfigs = configModule.SPACESHIP_CONFIGS;

    const updatedConfigs = existingConfigs.map((shipConfig, idx) => {
      const shipNum = idx + 1;
      const detected = results[shipNum];
      if (!detected) return shipConfig;

      // Color matching: preserve preset thruster color if present, else default
      const shipThrusterColor = shipConfig.thrusters?.[0]?.color || '#38bdf8';
      const updatedThrusters = detected.thrusters.map((t) => ({
        ...t,
        color: shipThrusterColor
      }));

      // Weapon color: preserve weapon color or default to red/orange laser
      const shipWeaponColor = shipConfig.shootingPoints?.[0]?.color || '#ff2244';
      const updatedShootingPoints = detected.shootingPoints.map((g) => ({
        ...g,
        color: shipWeaponColor
      }));

      return {
        ...shipConfig,
        thrusters: updatedThrusters,
        shootingPoints: updatedShootingPoints
      };
    });

    const fileContent = `/**
 * Spaceship Fleet Configuration
 * 
 * Defines full declarative configs for all 40 spaceships in the fleet:
 * - Model path & scale
 * - Texture paths (BaseColor masks, Logos/Cockpit, Wearout, Metallic/Smoothness, Emission, Normal map)
 * - Color channels matching Unity's EbalStudios_ColorizeSparrow shader
 * - Surface wearout properties (dirt, darken, logos, emission multipliers)
 * - Thrusters array: arbitrary thruster count, sizes, colors, and 3D offset positions from center (automatically calculated via mesh geometry detection)
 * - Shooting points array: weapon hardpoints, nozzle offsets, projectile colors, sizes, and types (automatically calculated via mesh geometry detection)
 * - Flight handling and physics dynamics (speed, acceleration, turn rates, boost energy)
 */

export const DEFAULT_SPARROW_TEXTURES = ${JSON.stringify(configModule.DEFAULT_SPARROW_TEXTURES, null, 2)};

export const SPACESHIP_CONFIGS = ${JSON.stringify(updatedConfigs, null, 2)};

/**
 * Retrieves spaceship configuration by index or ID
 * @param {number|string} indexOrId 
 * @returns {object}
 */
export function getSpaceshipConfig(indexOrId) {
  if (typeof indexOrId === 'number') {
    return SPACESHIP_CONFIGS[indexOrId] || SPACESHIP_CONFIGS[0];
  }
  return SPACESHIP_CONFIGS.find((c) => c.id === indexOrId) || SPACESHIP_CONFIGS[0];
}

/**
 * Returns summary list of all available spaceships
 * @returns {Array<{index: number, id: string, name: string, title: string, class: string, description: string}>}
 */
export function getSpaceshipList() {
  return SPACESHIP_CONFIGS.map((c, idx) => ({
    index: idx,
    id: c.id,
    name: c.name,
    title: c.title,
    class: c.class,
    description: c.description
  }));
}
`;

    fs.writeFileSync(configPath, fileContent, 'utf-8');
    console.log(`Successfully updated ${configPath} for all 40 ships!`);
  }
}

main().catch(console.error);
