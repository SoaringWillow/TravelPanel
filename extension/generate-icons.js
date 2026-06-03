#!/usr/bin/env node
// Generates PNG icon set for the TravelPanel browser extension.
// Requires only Node.js built-ins (zlib, fs).
// Usage: node generate-icons.js

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required by PNG spec) ─────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.allocUnsafe(4);
  const crcBuf  = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── Icon renderer ─────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function makePNG(size) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;

  // Geometry
  const rR      = size * 0.44;          // rounded-rect half-extent
  const corner  = size * 0.18;          // corner radius

  // Location-pin geometry (centred, slightly above midpoint)
  const pinCY   = cy - size * 0.06;     // circle centre y
  const pinR    = size * 0.22;          // outer circle radius
  const holeR   = size * 0.09;          // inner hole radius
  const tailHW  = size * 0.065;         // tail half-width
  const tailBot = cy + size * 0.32;     // tail bottom y

  const rows = [];

  for (let y = 0; y < size; y++) {
    const scanline = [0]; // filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const ax = Math.abs(dx), ay = Math.abs(dy);

      // Is this pixel inside the rounded rectangle?
      let inBg = ax <= rR && ay <= rR;
      if (inBg && ax > rR - corner && ay > rR - corner) {
        inBg = Math.hypot(ax - (rR - corner), ay - (rR - corner)) <= corner;
      }

      if (!inBg) {
        // Background (will appear as solid dark square outside rounded rect)
        scanline.push(15, 23, 42);
        continue;
      }

      // Gradient background: indigo-500 (#6366f1) → indigo-600 (#4f46e5)
      const t  = x / (size - 1);
      const br = lerp(99, 79, t), bg = lerp(102, 70, t), bb = lerp(241, 229, t);

      // Pin: circle + teardrop tail
      const pinDist = Math.hypot(x - cx, y - pinCY);
      const inCircle = pinDist <= pinR;
      const inHole   = pinDist <= holeR;
      const inTail   = Math.abs(dx) <= tailHW && y > pinCY + pinR * 0.55 && y <= tailBot;

      if ((inCircle || inTail) && !inHole) {
        scanline.push(255, 255, 255);   // white pin
      } else {
        scanline.push(br, bg, bb);      // gradient background
      }
    }
    rows.push(Buffer.from(scanline));
  }

  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate ─────────────────────────────────────────────────
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf  = makePNG(size);
  const dest = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✓  icons/icon${size}.png  (${buf.length} bytes)`);
}

console.log('\nAll icons generated.');
