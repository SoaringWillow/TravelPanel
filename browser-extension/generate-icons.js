#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * No dependencies required — uses only Node.js built-in zlib.
 *
 * Usage:  node generate-icons.js
 * Output: icons/icon16.png  icons/icon48.png  icons/icon128.png
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC-32 (IEEE polynomial) ──────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const c = u32be(crc32(Buffer.concat([t, data])));
  return Buffer.concat([u32be(data.length), t, data, c]);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
// Draws the TravelPanel icon: gradient-ish rounded square + map pin + inner ring.
// We approximate the gradient by using a flat blue (#2563EB).

function renderIcon(size) {
  // RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2;

  // Corner radius as fraction of size (matches the SVG rx="28/128 ≈ 0.22")
  const cornerFrac = 28 / 128;
  const cornerR    = cornerFrac * size;

  // Colours
  const BG_R = 37, BG_G = 99, BG_B = 235;       // #2563EB
  const W_R  = 255, W_G = 255, W_B = 255;         // white

  function setPixel(x, y, R, G, B, A) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha-blend over transparent (existing) = simple overwrite at full A
    const a = A / 255;
    pixels[i]   = Math.round(R * a + pixels[i]   * (1 - a));
    pixels[i+1] = Math.round(G * a + pixels[i+1] * (1 - a));
    pixels[i+2] = Math.round(B * a + pixels[i+2] * (1 - a));
    pixels[i+3] = Math.min(255, pixels[i+3] + A);
  }

  // Helper: is (x,y) inside rounded rectangle?
  function inRoundRect(x, y) {
    const dx = Math.max(cornerR - x, 0, x - (size - 1 - cornerR));
    const dy = Math.max(cornerR - y, 0, y - (size - 1 - cornerR));
    return dx * dx + dy * dy <= cornerR * cornerR;
  }

  // Draw background (rounded square)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inRoundRect(x, y)) setPixel(x, y, BG_R, BG_G, BG_B, 255);
    }
  }

  // Map pin dimensions (relative to size)
  const pinTopY    = size * (20 / 128);
  const pinBotY    = size * (108 / 128);
  const pinCX      = cx;
  const pinCY      = size * (52 / 128);  // center of the circle part
  const pinCircleR = size * (32 / 128);  // outer circle radius of pin head
  const innerR     = size * (13 / 128);  // inner circle (bg color)
  const dotR       = size * (4  / 128);  // tiny white dot

  // Pin shape: circle head + teardrop tail pointing down
  // We rasterize the pin body and circle as a filled region.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i+3] === 0) continue; // outside bg

      const dx = x - pinCX;
      const dy = y - pinCY;
      const dist2 = dx * dx + dy * dy;

      // Is inside pin circle head?
      if (dist2 <= pinCircleR * pinCircleR) {
        if (dist2 <= dotR * dotR) {
          setPixel(x, y, W_R, W_G, W_B, 255);          // tiny dot
        } else if (dist2 <= innerR * innerR) {
          setPixel(x, y, BG_R, BG_G, BG_B, 255);       // inner ring (bg colour)
        } else {
          setPixel(x, y, W_R, W_G, W_B, 242);          // white pin head
        }
        continue;
      }

      // Pin tail: triangular region below the circle, narrowing to a point
      if (y >= pinCY && y <= pinBotY) {
        const progress = (y - pinCY) / (pinBotY - pinCY);
        const halfWidth = pinCircleR * (1 - progress);
        if (Math.abs(x - pinCX) <= halfWidth) {
          setPixel(x, y, W_R, W_G, W_B, 242);
        }
      }
    }
  }

  return pixels;
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bit-depth 8, colour type 6 (RGBA)
  const ihdr = Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 6, 0, 0, 0]),
  ]);

  // Scanlines: filter byte (0 = None) + raw RGBA data
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      row[1 + x * 4]     = pixels[s];
      row[1 + x * 4 + 1] = pixels[s + 1];
      row[1 + x * 4 + 2] = pixels[s + 2];
      row[1 + x * 4 + 3] = pixels[s + 3];
    }
    rows.push(row);
  }

  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size);
  const png    = encodePNG(size, pixels);
  const dest   = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nDone. Load the browser-extension/ folder as an unpacked extension.');
