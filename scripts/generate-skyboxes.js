import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal pure Node.js PNG encoder
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function writePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    scanlines[offset++] = 0;
    rgba.copy(scanlines, offset, y * w * 4, (y + 1) * w * 4);
    offset += w * 4;
  }
  const idatData = zlib.deflateSync(scanlines, { level: 6 });
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Fast 3D Simplex-style Value Noise
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function noise3D(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = smoothstep(fx), v = smoothstep(fy), w = smoothstep(fz);

  const h000 = hash3(ix, iy, iz), h100 = hash3(ix + 1, iy, iz);
  const h010 = hash3(ix, iy + 1, iz), h110 = hash3(ix + 1, iy + 1, iz);
  const h001 = hash3(ix, iy, iz + 1), h101 = hash3(ix + 1, iy, iz + 1);
  const h011 = hash3(ix, iy + 1, iz + 1), h111 = hash3(ix + 1, iy + 1, iz + 1);

  const x00 = (1 - u) * (h000 & 255) + u * (h100 & 255);
  const x10 = (1 - u) * (h010 & 255) + u * (h110 & 255);
  const x01 = (1 - u) * (h001 & 255) + u * (h101 & 255);
  const x11 = (1 - u) * (h011 & 255) + u * (h111 & 255);

  const y0 = (1 - v) * x00 + v * x10;
  const y1 = (1 - v) * x01 + v * x11;

  return ((1 - w) * y0 + w * y1) / 255.0;
}

function fbm3D(x, y, z, octaves = 4) {
  let val = 0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise3D(x * freq, y * freq, z * freq);
    freq *= 2.1;
    amp *= 0.48;
  }
  return val;
}

// 1024x1024 per cubemap face (high-definition 6-megapixel cubemap)
const RESOLUTION = 1024;
const OUT_DIR = path.resolve('public', 'skyboxes');

const faceDirections = {
  px: (u, v) => [1, -v, -u],
  nx: (u, v) => [-1, -v, u],
  py: (u, v) => [u, 1, v],
  ny: (u, v) => [u, -1, -v],
  pz: (u, v) => [u, -v, 1],
  nz: (u, v) => [-u, -v, -1]
};

function projectDirToFace(x, y, z) {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let face, u, v;
  if (ax >= ay && ax >= az) {
    if (x > 0) { face = 'px'; u = -z / x; v = -y / x; }
    else { face = 'nx'; u = z / (-x); v = -y / (-x); }
  } else if (ay >= ax && ay >= az) {
    if (y > 0) { face = 'py'; u = x / y; v = z / y; }
    else { face = 'ny'; u = x / (-y); v = -z / (-y); }
  } else {
    if (z > 0) { face = 'pz'; u = x / z; v = -y / z; }
    else { face = 'nz'; u = -x / (-z); v = -y / (-z); }
  }
  return { face, u, v };
}

// Presets
const presets = {
  purple_nebula: {
    name: 'Purple Nebula',
    starCount: 22000,
    evalNebula(dx, dy, dz) {
      // Intricate cosmic dust clouds with domain warping
      const qx = fbm3D(dx * 2.5 + 1.2, dy * 2.5, dz * 2.5, 3);
      const qy = fbm3D(dx * 2.5, dy * 2.5 + 2.7, dz * 2.5, 3);
      const qz = fbm3D(dx * 2.5, dy * 2.5, dz * 2.5 + 4.1, 3);
      const cloud = Math.max(0, fbm3D(dx * 2.8 + qx * 1.2, dy * 2.8 + qy * 1.2, dz * 2.8 + qz * 1.2, 4) - 0.28) * 1.7;

      const r = cloud * 160 + cloud * cloud * 80;
      const g = cloud * 35 + cloud * cloud * 120;
      const b = cloud * 220 + cloud * cloud * 50;
      return [r, g, b];
    }
  },
  blue_nebula: {
    name: 'Blue Nebula',
    starCount: 24000,
    evalNebula(dx, dy, dz) {
      const qx = fbm3D(dx * 2.2 + 3.1, dy * 2.2, dz * 2.2, 3);
      const qy = fbm3D(dx * 2.2, dy * 2.2 + 1.4, dz * 2.2, 3);
      const qz = fbm3D(dx * 2.2, dy * 2.2, dz * 2.2 + 5.2, 3);
      const cloud = Math.max(0, fbm3D(dx * 2.6 + qx * 1.1, dy * 2.6 + qy * 1.1, dz * 2.6 + qz * 1.1, 4) - 0.25) * 1.6;

      const r = cloud * 30 + cloud * cloud * 90;
      const g = cloud * 110 + cloud * cloud * 130;
      const b = cloud * 240 + cloud * cloud * 30;
      return [r, g, b];
    }
  },
  deep_space: {
    name: 'Deep Space',
    starCount: 30000,
    evalNebula(dx, dy, dz) {
      // Faint dark cosmic dust lanes
      const dust = Math.max(0, fbm3D(dx * 1.8, dy * 1.8, dz * 1.8, 3) - 0.45) * 0.4;
      return [dust * 25, dust * 35, dust * 65];
    }
  },
  golden_galaxy: {
    name: 'Golden Galaxy',
    starCount: 26000,
    evalNebula(dx, dy, dz) {
      const distFromPlane = Math.abs(dy);
      const disc = Math.exp(-distFromPlane * 3.2);
      const cloud = Math.max(0, fbm3D(dx * 3.2, dy * 2.0, dz * 3.2, 4) - 0.2) * 1.2;
      const total = (disc * 0.75 + cloud * 0.5);

      const r = total * 240 + total * total * 30;
      const g = total * 155 + total * total * 50;
      const b = total * 45 + total * total * 80;
      return [r, g, b];
    }
  }
};

console.log(`Generating High-Definition (${RESOLUTION}x${RESOLUTION}) space skyboxes...`);

const skyboxList = [];

for (const [key, preset] of Object.entries(presets)) {
  const dir = path.join(OUT_DIR, key);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Generating 1024x1024 preset: ${preset.name} (${key})...`);
  const t0 = Date.now();

  // 1. Allocate 6 face buffers
  const faceBuffers = {
    px: Buffer.alloc(RESOLUTION * RESOLUTION * 4),
    nx: Buffer.alloc(RESOLUTION * RESOLUTION * 4),
    py: Buffer.alloc(RESOLUTION * RESOLUTION * 4),
    ny: Buffer.alloc(RESOLUTION * RESOLUTION * 4),
    pz: Buffer.alloc(RESOLUTION * RESOLUTION * 4),
    nz: Buffer.alloc(RESOLUTION * RESOLUTION * 4)
  };

  // 2. Evaluate Nebula at high resolution
  for (const [face, dirFunc] of Object.entries(faceDirections)) {
    const buf = faceBuffers[face];
    let offset = 0;

    for (let y = 0; y < RESOLUTION; y++) {
      const v = (2 * (y + 0.5) / RESOLUTION) - 1;
      for (let x = 0; x < RESOLUTION; x++) {
        const u = (2 * (x + 0.5) / RESOLUTION) - 1;
        const [rawDx, rawDy, rawDz] = dirFunc(u, v);
        const len = Math.hypot(rawDx, rawDy, rawDz);
        const [r, g, b] = preset.evalNebula(rawDx / len, rawDy / len, rawDz / len);

        buf[offset++] = Math.min(255, Math.round(r));
        buf[offset++] = Math.min(255, Math.round(g));
        buf[offset++] = Math.min(255, Math.round(b));
        buf[offset++] = 255;
      }
    }
  }

  // 3. Generate and project 25,000+ razor-sharp stars
  // Deterministic seed per skybox
  let seed = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 12345);
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < preset.starCount; i++) {
    // Generate uniform point on sphere
    const z = pseudoRandom() * 2 - 1;
    const phi = pseudoRandom() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const sx = r * Math.cos(phi);
    const sy = r * Math.sin(phi);
    const sz = z;

    const { face, u, v } = projectDirToFace(sx, sy, sz);

    const px = Math.round(((u + 1) / 2) * RESOLUTION - 0.5);
    const py = Math.round(((v + 1) / 2) * RESOLUTION - 0.5);

    if (px < 0 || px >= RESOLUTION || py < 0 || py >= RESOLUTION) continue;

    const buf = faceBuffers[face];
    const starType = pseudoRandom();

    // Determine star color
    let sR = 255, sG = 255, sB = 255;
    const colorRoll = pseudoRandom();
    if (colorRoll < 0.20) { sR = 180; sG = 210; sB = 255; } // Blue-white
    else if (colorRoll < 0.32) { sR = 255; sG = 230; sB = 180; } // Warm yellow
    else if (colorRoll < 0.40) { sR = 255; sG = 170; sB = 140; } // Orange-red
    else if (colorRoll < 0.45) { sR = 160; sG = 240; sB = 255; } // Bright cyan

    function addLight(cx, cy, intensity, red, green, blue) {
      if (cx < 0 || cx >= RESOLUTION || cy < 0 || cy >= RESOLUTION) return;
      const idx = (cy * RESOLUTION + cx) * 4;
      buf[idx + 0] = Math.min(255, buf[idx + 0] + Math.round(red * intensity));
      buf[idx + 1] = Math.min(255, buf[idx + 1] + Math.round(green * intensity));
      buf[idx + 2] = Math.min(255, buf[idx + 2] + Math.round(blue * intensity));
    }

    if (starType > 0.985) {
      // Brilliant Hypergiant: bright center core + cross diffraction spikes
      const brightness = 0.9 + pseudoRandom() * 0.1;
      // Core 3x3
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const d = Math.hypot(dx, dy);
          const factor = Math.max(0, 1 - d * 0.4) * brightness;
          addLight(px + dx, py + dy, factor, sR, sG, sB);
        }
      }
      // Horizontal and vertical diffraction spikes (Hubble/JWST style)
      const spikeLen = 8 + Math.floor(pseudoRandom() * 12);
      for (let s = 1; s <= spikeLen; s++) {
        const falloff = Math.pow(1 - s / spikeLen, 1.5) * 0.7 * brightness;
        addLight(px + s, py, falloff, sR, sG, sB);
        addLight(px - s, py, falloff, sR, sG, sB);
        addLight(px, py + s, falloff, sR, sG, sB);
        addLight(px, py - s, falloff, sR, sG, sB);
      }
    } else if (starType > 0.88) {
      // Medium bright star (2x2 sharp anti-aliased)
      const b = 0.75 + pseudoRandom() * 0.25;
      addLight(px, py, b, sR, sG, sB);
      addLight(px + 1, py, b * 0.45, sR, sG, sB);
      addLight(px, py + 1, b * 0.45, sR, sG, sB);
      addLight(px - 1, py, b * 0.3, sR, sG, sB);
      addLight(px, py - 1, b * 0.3, sR, sG, sB);
    } else {
      // Needle-sharp pinpoint distant star (1 pixel)
      const b = 0.35 + pseudoRandom() * 0.65;
      addLight(px, py, b, sR, sG, sB);
    }
  }

  // 4. Save 6 PNG faces
  for (const [face, buf] of Object.entries(faceBuffers)) {
    const png = writePNG(RESOLUTION, RESOLUTION, buf);
    fs.writeFileSync(path.join(dir, `${face}.png`), png);
  }

  console.log(`Saved ${key} (took ${Date.now() - t0} ms)`);

  skyboxList.push({
    id: key,
    name: preset.name,
    type: 'cube',
    path: `/skyboxes/${key}/`,
    files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']
  });
}

// Write updated manifest
fs.writeFileSync(
  path.join(OUT_DIR, 'skyboxes.json'),
  JSON.stringify(skyboxList, null, 2)
);

console.log('All 1024x1024 space skyboxes generated successfully!');
