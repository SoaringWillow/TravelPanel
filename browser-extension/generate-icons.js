#!/usr/bin/env node
// Generates icon16.png, icon48.png, icon128.png — no external dependencies.
// Brand: TravelPanel indigo #4F46E5 on white, location-pin motif.
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.concat([u32be(d.length), t, d, u32be(crc32(Buffer.concat([t, d])))]);
}

// ── PNG builder ──────────────────────────────────────────────────────────────
// Each pixel is RGBA (color type 6).

function makePng(size) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = chunk('IHDR', Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 6, 0, 0, 0]), // 8-bit RGBA
  ]));

  // Pixel painter — returns [r,g,b,a]
  function pixel(x, y) {
    const cx = (x + 0.5) / size; // 0..1
    const cy = (y + 0.5) / size;

    // Rounded-rect background (covers ~84% of icon area)
    const r = 0.14; // corner radius fraction
    const pad = 0.08;
    const lx = cx - pad, rx = 1 - pad - cx;
    const ty = cy - pad, by = 1 - pad - cy;
    const qx = Math.max(-lx, 0, -(rx));
    const qy = Math.max(-ty, 0, -(by));
    // simplified: just check if inside padded area with rounded corners
    const bx = Math.max(pad + r - cx, cx - (1 - pad - r), 0);
    const by2 = Math.max(pad + r - cy, cy - (1 - pad - r), 0);
    const bgDist = Math.sqrt(bx * bx + by2 * by2) - r;
    const inBg = bgDist <= 0;

    if (!inBg) return [255, 255, 255, 0]; // transparent outside

    // Background: indigo gradient top→bottom
    const topR = 79, topG = 70, topB = 229;
    const botR = 55, botG = 48, botB = 163;
    const t2 = cy;
    const bgR = Math.round(topR + (botR - topR) * t2);
    const bgG = Math.round(topG + (botG - topG) * t2);
    const bgB = Math.round(topB + (botB - topB) * t2);

    // Location-pin icon (white), centered at (0.5, 0.45), scaled 0.5 of icon
    const pinCX = 0.5;
    const pinCY = 0.42;
    const pinR = 0.22; // head circle radius
    // Circle head
    const dxH = cx - pinCX;
    const dyH = cy - pinCY;
    const headDist = Math.sqrt(dxH * dxH + dyH * dyH);
    const inHead = headDist <= pinR;

    // Inner hole in head
    const inHole = headDist <= pinR * 0.42;

    // Teardrop tail: triangle below circle center
    const tailTop = pinCY + pinR * 0.7;
    const tailBot = pinCY + pinR * 1.9;
    const tailW = pinR * 0.38;
    const tailProgress = cy > tailTop && cy < tailBot
      ? (cy - tailTop) / (tailBot - tailTop)
      : -1;
    const inTail = tailProgress >= 0 && Math.abs(cx - pinCX) <= tailW * (1 - tailProgress);

    const inPin = (inHead && !inHole) || inTail;

    if (inPin) return [255, 255, 255, 255]; // white pin
    if (inHole) return [bgR, bgG, bgB, 255]; // bg shows through hole
    return [bgR, bgG, bgB, 255];
  }

  // Build raw scanlines (filter byte 0 = None, then RGBA per pixel)
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      row[1 + x * 4] = r;
      row[2 + x * 4] = g;
      row[3 + x * 4] = b;
      row[4 + x * 4] = a;
    }
    rows.push(row);
  }

  const idat = chunk('IDAT', zlib.deflateSync(Buffer.concat(rows)));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIG, ihdr, idat, iend]);
}

// ── Write files ──────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, makePng(size));
  console.log(`✓ icons/icon${size}.png  (${size}×${size})`);
}
console.log('Icons generated.');
