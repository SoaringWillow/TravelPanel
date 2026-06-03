#!/usr/bin/env node
// Generates a 1024×1024 iOS app icon for TravelPanel.
// Design: dark-indigo rounded-rect background + white location pin with gradient sheen.
// Requires only Node.js built-ins. Usage: node scripts/generate-ios-icon.js

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────
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
  const tb  = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  const crc = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Anti-aliasing helper: returns coverage 0–1 for a circle edge
function circleAA(dist, r, feather = 1.2) {
  return Math.max(0, Math.min(1, (r - dist + feather / 2) / feather));
}

function makePNG(size) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;

  // Rounded-rect params (iOS rounds to ~22.4% of width)
  const rR     = size * 0.44;
  const corner = size * 0.224;

  // Pin geometry (centred, shifted slightly up)
  const pinCY  = cy - size * 0.05;
  const pinR   = size * 0.21;
  const holeR  = size * 0.085;
  const tailHW = size * 0.058;
  const tailBY = cy + size * 0.30;

  // Background gradient: indigo-600 (#4f46e5) → indigo-800 (#3730a3)
  const bgR1 = 79,  bgG1 = 70,  bgB1 = 229;
  const bgR2 = 55,  bgG2 = 48,  bgB2 = 163;

  // Outer canvas bg (will be masked by iOS): dark navy
  const maskR = 15, maskG = 23, maskB = 42;

  const rows = [];

  for (let y = 0; y < size; y++) {
    const scanline = [0]; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const ax = Math.abs(dx), ay = Math.abs(dy);

      // Rounded-rect coverage (simple: full in / out, iOS clips anyway)
      let inBg = ax <= rR && ay <= rR;
      if (inBg && ax > rR - corner && ay > rR - corner) {
        inBg = Math.hypot(ax - (rR - corner), ay - (rR - corner)) <= corner;
      }

      if (!inBg) {
        scanline.push(maskR, maskG, maskB);
        continue;
      }

      // Diagonal gradient across the icon
      const t   = (x + y) / (2 * (size - 1));
      const br  = lerp(bgR1, bgR2, t);
      const bgg = lerp(bgG1, bgG2, t);
      const bb  = lerp(bgB1, bgB2, t);

      // Subtle radial sheen in top-left quadrant
      const sheenDist = Math.hypot(x - size * 0.25, y - size * 0.2);
      const sheen     = Math.max(0, 1 - sheenDist / (size * 0.55)) * 18;

      // Pin: circle + teardrop tail
      const pinDist = Math.hypot(x - cx, y - pinCY);
      const inCircle = pinDist <= pinR;
      const inHole   = pinDist <= holeR;
      const inTail   = Math.abs(dx) <= tailHW && y > pinCY + pinR * 0.5 && y <= tailBY;

      if ((inCircle || inTail) && !inHole) {
        // White pin — add subtle inner shadow at bottom of circle
        const shadowT = Math.max(0, (pinDist / pinR - 0.5) * 2);
        const shadeV  = inCircle ? Math.round(shadowT * 30) : 0;
        scanline.push(255 - shadeV, 255 - shadeV, 255 - shadeV);
      } else {
        scanline.push(
          Math.min(255, br + sheen),
          Math.min(255, bgg + sheen),
          Math.min(255, bb + Math.round(sheen * 0.6)),
        );
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
const outDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const buf  = makePNG(1024);
const dest = path.join(outDir, 'AppIcon-512@2x.png');
fs.writeFileSync(dest, buf);
console.log(`✓  ${dest}  (${(buf.length / 1024).toFixed(0)} KB)`);
console.log('iOS app icon generated (Xcode 14+ universal single-scale format).');
