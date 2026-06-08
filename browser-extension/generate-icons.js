#!/usr/bin/env node
/**
 * Generates TravelPanel PNG icons for the browser extension.
 * No external dependencies — uses only Node.js built-ins.
 *
 * Output: icons/icon{16,32,48,128}.png
 *
 * Run: node generate-icons.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────

const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk ─────────────────────────────────────────────────────────────

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(d.length, 0);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crc]);
}

// ── PNG encoder (RGB, no alpha) ───────────────────────────────────────────

function makePNG(pixels, width, height) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  // Raw image rows: each row prefixed with filter byte 0 (None)
  const rowSize = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      const dst = y * rowSize + 1 + x * 3;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon pixel renderer ───────────────────────────────────────────────────

// Indigo-600 background (#6366f1) with a white map-pin shape.

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 3);

  // Colors
  const BG_R = 99, BG_G = 102, BG_B = 241;  // #6366f1
  const FG_R = 255, FG_G = 255, FG_B = 255; // white

  // Map pin geometry (proportional to size)
  const cx   = size / 2;
  const headCY = size * 0.38;          // center of the circle part
  const headR  = size * 0.24;          // radius of the circle
  const tipY   = size * 0.84;          // y-coord of the pointy tip
  const innerR = size * 0.10;          // inner hole in the circle

  // Rounded square background radius
  const cornerR = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;

      // Rounded-square clipping (just for visual shape reference — we fill all)
      let r = BG_R, g = BG_G, b = BG_B;

      // Distance from circle center
      const dx = x - cx;
      const dy = y - headCY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pin shape:
      // 1. Circle head (minus inner hole)
      const inHead = dist <= headR && dist >= innerR;

      // 2. Triangle body — narrows from circle bottom toward tipY
      const bodyTop = headCY + headR * 0.5;
      const bodyWidth = headR * (1 - (y - bodyTop) / (tipY - bodyTop));
      const inBody = y >= bodyTop && y <= tipY && Math.abs(x - cx) <= Math.max(bodyWidth, 0);

      // 3. Filled circle cap (top of head, above inner hole)
      const inCap = dist <= innerR * 1.1 && y < headCY;

      if (inHead || inBody) {
        r = FG_R; g = FG_G; b = FG_B;
      }

      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }

  return pixels;
}

// ── Write icons ───────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const pixels = renderIcon(size);
  const png = makePNG(pixels, size, size);
  const dest = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated. Load browser-extension/ in Chrome via chrome://extensions → Load unpacked.');
