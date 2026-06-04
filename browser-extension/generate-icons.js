#!/usr/bin/env node
// Generates PNG icons for the TravelPanel browser extension.
// Run from the browser-extension directory: node generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0);
  Buffer.from(type).copy(b, 4);
  data.copy(b, 8);
  b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return b;
}

function makePNG(size) {
  const pad = Math.max(1, Math.ceil(size * 0.06));
  const cr = Math.ceil(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const hw = size / 2 - pad;
  const hh = size / 2 - pad;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4, 0);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dx = Math.max(0, Math.abs(px - cx) - (hw - cr));
      const dy = Math.max(0, Math.abs(py - cy) - (hh - cr));
      if (dx * dx + dy * dy > cr * cr) continue;

      const o = 1 + x * 4;
      // Indigo (#4f46e5) → violet (#7c3aed) gradient top-to-bottom
      const t = y / size;
      row[o]   = Math.round(79  + (124 - 79)  * t);
      row[o+1] = Math.round(70  + (58  - 70)  * t);
      row[o+2] = Math.round(229 + (237 - 229) * t);
      row[o+3] = 255;

      // White "T" letterform for larger icons (normalize to 48px design grid)
      if (size >= 32) {
        const s = 48 / size;
        const lx = (px - cx) * s;
        const ly = (py - cy) * s;
        const inBar  = ly >= -13 && ly <= -7 && lx >= -10 && lx <= 10;
        const inStem = ly >= -7  && ly <= 11  && lx >= -3  && lx <= 3;
        if (inBar || inStem) {
          row[o] = row[o + 1] = row[o + 2] = 255;
        }
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ Created icons/icon-${size}.png`);
}
console.log('Icons generated successfully!');
