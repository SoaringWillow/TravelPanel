#!/usr/bin/env node
/**
 * Generates PNG icon files for the browser extension.
 * Run: node generate-icons.js
 * Requires no external dependencies — uses only Node.js built-ins.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Minimal PNG encoder ─────────────────────────────────────────────────────

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = (crc >>> 8) ^ crc32.table[(crc ^ b) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0);
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crc     = u32be(crc32(Buffer.concat([typeBuf, dataBuf])));
  return Buffer.concat([u32be(dataBuf.length), typeBuf, dataBuf, crc]);
}

/**
 * Create a rounded-rect icon with a gradient-like fill.
 * r=corner radius (pixels), fg=[R,G,B] fill, bg=[R,G,B] background.
 */
function makePNG(size, fg, bg) {
  // Build RGBA scanlines
  const raw = [];
  const r   = Math.round(size * 0.22); // corner radius ≈ 22% of size

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      // Determine if pixel is inside the rounded rect
      const inside = isInsideRoundedRect(x, y, size, size, r);
      if (inside) {
        // Slight gradient: top-left lighter, bottom-right darker
        const t  = (x + y) / (2 * (size - 1));
        const R  = Math.round(fg[0] + (fg[0] * 0.25) * (1 - t));
        const G  = Math.round(fg[1] + (fg[1] * 0.25) * (1 - t));
        const B  = Math.round(fg[2] + (fg[2] * 0.25) * (1 - t));
        raw.push(clamp(R), clamp(G), clamp(B), 255);
      } else {
        raw.push(bg[0], bg[1], bg[2], 0); // transparent outside
      }
    }
  }

  // Add a simple airplane shape (only visible at larger sizes)
  if (size >= 32) drawAirplane(raw, size);

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 6, 0, 0, 0]), // 8-bit RGBA
  ]);

  const rawBuf     = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v) { return Math.min(255, Math.max(0, Math.round(v))); }

function isInsideRoundedRect(x, y, w, h, r) {
  if (x < r && y < r)         return dist(x, y, r, r) <= r;
  if (x > w - r - 1 && y < r) return dist(x, y, w - r - 1, r) <= r;
  if (x < r && y > h - r - 1) return dist(x, y, r, h - r - 1) <= r;
  if (x > w - r - 1 && y > h - r - 1) return dist(x, y, w - r - 1, h - r - 1) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Draw a simple ✈ silhouette by setting pixels white
function drawAirplane(raw, size) {
  const cx = size / 2;
  const cy = size / 2;
  const s  = size / 16; // scale

  // Body: diagonal line upper-left to center-right
  for (let i = -4; i <= 6; i++) {
    setPixel(raw, size, Math.round(cx - i * s * 0.7), Math.round(cy + i * s * 0.7), [255, 255, 255, 220]);
    setPixel(raw, size, Math.round(cx - i * s * 0.7 + 1), Math.round(cy + i * s * 0.7), [255, 255, 255, 200]);
  }
  // Left wing
  for (let i = -3; i <= 0; i++) {
    setPixel(raw, size, Math.round(cx + i * s * 0.5), Math.round(cy - i * s * 1.5), [255, 255, 255, 200]);
    setPixel(raw, size, Math.round(cx + i * s * 0.5 + 1), Math.round(cy - i * s * 1.5), [255, 255, 255, 180]);
  }
  // Right wing
  for (let i = 0; i <= 3; i++) {
    setPixel(raw, size, Math.round(cx + 2 * s + i * s * 0.5), Math.round(cy + 2 * s + i * s * 1.2), [255, 255, 255, 200]);
  }
}

function setPixel(raw, size, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  // Each row: 1 filter byte + size*4 RGBA bytes
  const rowStride = 1 + size * 4;
  const idx       = y * rowStride + 1 + x * 4;
  raw[idx]     = rgba[0];
  raw[idx + 1] = rgba[1];
  raw[idx + 2] = rgba[2];
  raw[idx + 3] = rgba[3];
}

// ─── Generate all sizes ──────────────────────────────────────────────────────

const SIZES = [16, 32, 48, 128];

// Sky-blue gradient: #0ea5e9 → #6366f1
const FG = [14, 165, 233]; // #0ea5e9
const BG = [0, 0, 0];      // transparent bg

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of SIZES) {
  const png      = makePNG(size, FG, BG);
  const outPath  = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓  icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nAll icons generated. Replace with professional artwork before publishing to the store.');
