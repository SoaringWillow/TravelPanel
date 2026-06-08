#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Requires only Node.js built-ins (zlib) — no npm dependencies needed.
 *
 * Usage:  node create-icons.js
 * Output: icons/icon16.png  icons/icon48.png  icons/icon128.png
 */

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG helpers ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4);  l.writeUInt32BE(data.length, 0);
  const c = Buffer.alloc(4);  c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, c]);
}

function buildPNG(size, drawPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  // compression, filter, interlace all 0

  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const o = y * stride + 1 + x * 4;
      raw[o] = r; raw[o+1] = g; raw[o+2] = b; raw[o+3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Anti-aliased circle helper ─────────────────────────────────────────────────
function circleSDF(px, py, cx, cy, r) {
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
}

function aaAlpha(sdf, aa = 0.8) {
  return Math.max(0, Math.min(1, -sdf / aa + 0.5));
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
// Indigo background (#6366f1) with a white map-pin shape
function drawIcon(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.46;   // outer circle radius (slightly inset for anti-alias room)
  const aa = size * 0.04;   // anti-alias width

  // Normalized pixel center
  const px = x + 0.5;
  const py = y + 0.5;

  // Background circle alpha
  const bgSDF = circleSDF(px, py, cx, cy, r);
  const bgA   = aaAlpha(bgSDF, aa);
  if (bgA <= 0) return [0, 0, 0, 0]; // fully transparent outside

  // Background: indigo #6366f1
  const bgR = 99, bgG = 102, bgB = 241;

  // ── Map pin shape (white) ──────────────────────────────────────────────────
  // Pin head: circle centered above middle
  const headCX  = cx;
  const headCY  = cy - size * 0.08;
  const headR   = size * 0.22;
  const headSDF = circleSDF(px, py, headCX, headCY, headR);
  const headA   = aaAlpha(headSDF, aa);

  // Pin inner hole: slightly smaller circle to make a ring effect at big sizes
  const holeR   = headR * 0.42;
  const holeSDF = circleSDF(px, py, headCX, headCY, holeR);
  const holeA   = aaAlpha(holeSDF, aa);

  // Pin tail: tapered triangle below head
  // Point of pin is at (cx, cy + size*0.33)
  const tailTipY  = cy + size * 0.32;
  const tailBaseY = headCY + headR;
  const tailProgress = (py - tailBaseY) / (tailTipY - tailBaseY); // 0..1 top to tip
  const tailHalfW = headR * 0.48 * (1 - tailProgress);
  const inTail = (
    py >= tailBaseY - aa &&
    py <= tailTipY + aa &&
    px >= headCX - tailHalfW - aa &&
    px <= headCX + tailHalfW + aa &&
    tailProgress >= 0 && tailProgress <= 1
  );

  let tailA = 0;
  if (inTail) {
    // Soft edges
    const leftEdge  = aaAlpha(headCX - tailHalfW - px, aa);
    const rightEdge = aaAlpha(px - (headCX + tailHalfW), aa);
    const topEdge   = aaAlpha(tailBaseY - py, aa);
    const botEdge   = aaAlpha(py - tailTipY, aa);
    tailA = Math.min(leftEdge, rightEdge, topEdge, botEdge);
  }

  // Combine pin parts; subtract hole
  const pinA = Math.max(headA, tailA) * (1 - holeA * 0.7);

  // Composite: bg + white pin
  const finalA = bgA;
  const wR = bgR + Math.round((255 - bgR) * pinA);
  const wG = bgG + Math.round((255 - bgG) * pinA);
  const wB = bgB + Math.round((255 - bgB) * pinA);

  return [wR, wG, wB, Math.round(finalA * 255)];
}

// ── Generate + write ──────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = buildPNG(size, drawIcon);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`  ✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated successfully!');
