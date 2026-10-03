import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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
  const idatData = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// 64x64 or 32x32 palette
const GRID = 32;
const CELL_SIZE = 16;
const WIDTH = GRID * CELL_SIZE;
const HEIGHT = GRID * CELL_SIZE;

const rgba = Buffer.alloc(WIDTH * HEIGHT * 4, 255);

function hexToRgb(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function setCell(uIndex, vIndex, hexColor) {
  const [r, g, b] = hexToRgb(hexColor);
  // Set both normal and flipped V to be immune to flipY differences
  const vList = [vIndex, 31 - vIndex];
  for (const v of vList) {
    const startX = uIndex * CELL_SIZE;
    const startY = v * CELL_SIZE;
    for (let py = 0; py < CELL_SIZE; py++) {
      for (let px = 0; px < CELL_SIZE; px++) {
        const idx = ((startY + py) * WIDTH + (startX + px)) * 4;
        rgba[idx] = r;
        rgba[idx + 1] = g;
        rgba[idx + 2] = b;
        rgba[idx + 3] = 255;
      }
    }
  }
}

// 1. Barbara The Bee (v = 18)
setCell(0, 18, '#F5BA27'); // Yellow body
setCell(1, 18, '#212429'); // Black bee stripes / dark metal
setCell(2, 18, '#5DD8FF'); // Cockpit / light cyan

// 2. Fernando The Flamingo (v = 19)
setCell(0, 19, '#F05D7A'); // Pink flamingo hull
setCell(1, 19, '#2A2333'); // Dark wings
setCell(2, 19, '#5FE0D0'); // Cyan visor
setCell(3, 19, '#F0ECEE'); // White accents
setCell(4, 19, '#FF3366'); // Hot pink booster

// 3. Rae The Red Panda (v = 20)
setCell(0, 20, '#D45028'); // Red panda orange-red hull
setCell(1, 20, '#FAF0E4'); // White belly/accents
setCell(2, 20, '#26222C'); // Dark carbon accents

// 4. Finn The Frog (v = 21)
setCell(0, 21, '#4DBF38'); // Frog green hull
setCell(1, 21, '#C8EE60'); // Lime belly
setCell(2, 21, '#1A4D28'); // Dark forest green
setCell(3, 21, '#3EC7E0'); // Visor glass

const pngBuffer = writePNG(WIDTH, HEIGHT, rgba);
fs.writeFileSync(path.resolve('public', 'Atlas.png'), pngBuffer);
console.log('Atlas.png generated at public/Atlas.png');
