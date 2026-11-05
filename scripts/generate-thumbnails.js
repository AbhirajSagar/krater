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
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    scanlines[offset++] = 0; // Filter 0 (None)
    rgba.copy(scanlines, offset, y * w * 4, (y + 1) * w * 4);
    offset += w * 4;
  }
  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function unfilterPNG(raw, w, h, bpp = 4) {
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * bpp);
  let srcPos = 0, dstPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[srcPos++];
    for (let x = 0; x < stride; x++) {
      const xVal = raw[srcPos++];
      const a = (x >= bpp) ? out[dstPos - bpp] : 0;
      const b = (y > 0) ? out[dstPos - stride] : 0;
      const c = (x >= bpp && y > 0) ? out[dstPos - stride - bpp] : 0;
      let val = 0;
      if (filter === 0) val = xVal;
      else if (filter === 1) val = (xVal + a) & 255;
      else if (filter === 2) val = (xVal + b) & 255;
      else if (filter === 3) val = (xVal + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = c;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        val = (xVal + pr) & 255;
      }
      out[dstPos++] = val;
    }
  }
  return out;
}

function decodePNGFile(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8, idat = [], w = 0, h = 0;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    if (type === 'IHDR') {
      w = buf.readUInt32BE(offset + 8);
      h = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idat.push(buf.slice(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idat));
  const pixels = unfilterPNG(decompressed, w, h);
  return { w, h, pixels };
}

// Generate 256x160 thumbnail for each skybox
const SKYBOXES = ['purple_nebula', 'blue_nebula', 'blue_pink', 'golden_galaxy', 'deep_space'];
const TARGET_W = 256;
const TARGET_H = 160;

for (const boxId of SKYBOXES) {
  const facePath = path.resolve('public', 'skyboxes', boxId, 'nz.png');
  const { w, h, pixels } = decodePNGFile(facePath);

  // Crop 1024x640 from center, then downsample 4x to 256x160 with 4x4 box filtering
  const cropYStart = Math.floor((h - (w * (TARGET_H / TARGET_W))) / 2); // (1024 - 640)/2 = 192
  const cropH = Math.floor(w * (TARGET_H / TARGET_W)); // 640
  const scale = w / TARGET_W; // 4.0

  const thumbBuf = Buffer.alloc(TARGET_W * TARGET_H * 4);

  for (let dy = 0; dy < TARGET_H; dy++) {
    for (let dx = 0; dx < TARGET_W; dx++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      const srcYBase = cropYStart + Math.floor(dy * scale);
      const srcXBase = Math.floor(dx * scale);

      for (let sy = 0; sy < 4; sy++) {
        const py = srcYBase + sy;
        if (py < 0 || py >= h) continue;
        for (let sx = 0; sx < 4; sx++) {
          const px = srcXBase + sx;
          if (px < 0 || px >= w) continue;
          const idx = (py * w + px) * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
          count++;
        }
      }

      const outIdx = (dy * TARGET_W + dx) * 4;
      thumbBuf[outIdx] = Math.round(r / count);
      thumbBuf[outIdx + 1] = Math.round(g / count);
      thumbBuf[outIdx + 2] = Math.round(b / count);
      thumbBuf[outIdx + 3] = Math.round(a / count);
    }
  }

  const outPng = writePNG(TARGET_W, TARGET_H, thumbBuf);
  const outPath = path.resolve('public', 'skyboxes', boxId, 'thumbnail.png');
  fs.writeFileSync(outPath, outPng);
  console.log(`Generated thumbnail for ${boxId} -> ${outPath} (${outPng.length} bytes)`);
}
