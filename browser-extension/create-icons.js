#!/usr/bin/env node
/**
 * Generates icon16.png, icon48.png, icon128.png in the icons/ directory.
 * Run once: node create-icons.js
 * No external dependencies — uses only Node.js built-ins.
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// Indigo-600 #4F46E5 with a white "✈" drawn as pixel art at each size
const R = 79, G = 70, B = 229; // indigo background
const W = 255, We = 255, Wb = 255; // white foreground

/** Minimal PNG writer — no external deps */
function makePng(width, height, getPixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function u32(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n >>> 0, 0);
    return b;
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
    }
    return (~c) >>> 0;
  }

  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([t, data]);
    return Buffer.concat([u32(data.length), t, data, u32(crc32(crcInput))]);
  }

  // IHDR: RGBA (color type 6, 8 bits)
  const ihdrData = Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])]);

  // Raw image rows (filter byte 0 + RGBA per pixel)
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      row[1 + x * 4]     = r;
      row[2 + x * 4]     = g;
      row[3 + x * 4]     = b;
      row[4 + x * 4]     = a;
    }
    rows.push(row);
  }
  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

/** Rounded rectangle pixel test */
function inRoundedRect(x, y, w, h, r) {
  const cx = w / 2, cy = h / 2;
  const rx = w / 2 - r, ry = h / 2 - r;
  const dx = Math.max(0, Math.abs(x - cx) - rx);
  const dy = Math.max(0, Math.abs(y - cy) - ry);
  return dx * dx + dy * dy <= r * r;
}

/** Simple plane silhouette drawn at normalised coords */
function planePixel(nx, ny) {
  // nx, ny in [0,1]
  // Body: horizontal bar
  if (ny > 0.40 && ny < 0.60 && nx > 0.18 && nx < 0.82) return true;
  // Nose cone: rounded left
  if (ny > 0.43 && ny < 0.57 && nx > 0.10 && nx < 0.22) return true;
  // Main wing: diagonal trapezoid top-right
  if (nx > 0.38 && nx < 0.68) {
    const wingTop = 0.5 - (nx - 0.38) * 0.9;
    const wingBot = 0.5 + (nx - 0.38) * 0.9;
    if (ny > wingTop && ny < wingBot) return true;
  }
  // Tail wing: small right
  if (nx > 0.64 && nx < 0.82) {
    const t = 0.5 - (nx - 0.64) * 0.6;
    const b = 0.5 + (nx - 0.64) * 0.6;
    if (ny > t && ny < b) return true;
  }
  return false;
}

function getPixel(x, y, w, h) {
  const pad = Math.max(2, Math.round(w * 0.08));
  const r   = Math.max(2, Math.round(w * 0.20));

  // Background: indigo rounded square
  if (!inRoundedRect(x, y, w, h, r)) return [0, 0, 0, 0]; // transparent outside

  // Plane in white
  const nx = (x - pad) / (w - pad * 2);
  const ny = (y - pad) / (h - pad * 2);
  if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 && planePixel(nx, ny)) {
    return [255, 255, 255, 255];
  }

  return [R, G, B, 255]; // indigo background
}

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const size of [16, 48, 128]) {
  const png = makePng(size, size, getPixel);
  const dest = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}
