#!/usr/bin/env node
// Pure Node.js PNG icon generator — no external deps required

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([lenBuf, t, data, crcBuf]);
}

function createPNG(size, drawPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const rowLen = 4 * size;
  const raw = Buffer.alloc(size * (1 + rowLen));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + rowLen)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const off = y * (1 + rowLen) + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

// Indigo #6366f1 rounded-square with white map-pin
function drawIcon(x, y, size) {
  const s = size;
  const radius = Math.round(s * 0.22);
  const m = Math.round(s * 0.04);

  // Smooth rounded-rect mask via distance field
  const rx = Math.max(m + radius - x, x - (s - m - radius - 1), 0);
  const ry = Math.max(m + radius - y, y - (s - m - radius - 1), 0);
  const dist = Math.sqrt(rx * rx + ry * ry);
  const inRect = x >= m && x < s - m && y >= m && y < s - m && dist <= radius + 0.5;

  if (!inRect) return [0, 0, 0, 0]; // transparent outside

  const alpha = dist < radius - 0.5 ? 255 : Math.round((radius + 0.5 - dist) * 255);

  // Map-pin: head circle + stem
  const pinCx = s / 2;
  const pinCy = s * 0.39;
  const pinR  = s * 0.18;
  const stemHW = s * 0.065;
  const stemTop = pinCy + pinR * 0.85;
  const stemBot = s * 0.73;

  const inHead = (x - pinCx) ** 2 + (y - pinCy) ** 2 <= pinR * pinR;
  const inStem = x >= pinCx - stemHW && x <= pinCx + stemHW && y >= stemTop && y <= stemBot;

  if (inHead || inStem) {
    return [255, 255, 255, alpha]; // white pin
  }

  return [99, 102, 241, alpha]; // indigo background
}

const outDir = path.resolve(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const sz of [16, 48, 128]) {
  const png = createPNG(sz, drawIcon);
  const out = path.join(outDir, `icon${sz}.png`);
  fs.writeFileSync(out, png);
  console.log(`  icons/icon${sz}.png  (${png.length} bytes)`);
}
console.log('Icons generated.');
