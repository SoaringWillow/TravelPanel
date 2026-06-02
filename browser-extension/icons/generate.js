#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * No external dependencies — uses pure Node.js (zlib + Buffer).
 *
 * Run: node icons/generate.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 ────────────────────────────────────────────────────────────────────

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
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const joined = Buffer.concat([t, data]);
  const c = Buffer.allocUnsafe(4);
  c.writeUInt32BE(crc32(joined), 0);
  return Buffer.concat([len, t, data, c]);
}

// ── PNG writer (RGBA) ────────────────────────────────────────────────────────

function makePNG(size, pixels) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x];
      const off = y * stride + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
// Draws a rounded-rect background (blue) with a white map pin + blue center dot.

function renderIcon(size) {
  const pixels = [];
  const half = size / 2;
  const cornerR = size * 0.1875; // ~24/128 corner radius

  // Pin geometry — scaled to icon size
  const pinTopY    = size * 0.14;   // top of pin (18/128)
  const pinCx      = half;
  const pinCy      = size * 0.375;  // center of pin circle (48/128)
  const pinR       = size * 0.203;  // radius of pin circle (26/128)
  const pinTailTip = size * 0.859;  // bottom of tail (110/128)
  const dotR       = pinR * 0.46;   // inner blue dot (~12/26 of pinR)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      // ── Rounded-rect background clip ──
      const dx = Math.max(0, Math.abs(px - half) - (half - cornerR));
      const dy = Math.max(0, Math.abs(py - half) - (half - cornerR));
      if (dx * dx + dy * dy > cornerR * cornerR) {
        pixels.push([0, 0, 0, 0]);
        continue;
      }

      // ── Pin circle ──
      const dcx = px - pinCx;
      const dcy = py - pinCy;
      const distPin = Math.sqrt(dcx * dcx + dcy * dcy);

      const inCircle = distPin <= pinR;

      // ── Pin tail — teardrop below circle ──
      // The tail is a triangle from (pinCx, pinCy+pinR*0.7) widening then narrowing to a tip
      let inTail = false;
      if (py > pinCy && py <= pinTailTip) {
        const t = (py - pinCy) / (pinTailTip - pinCy); // 0→1 top to tip
        // width: broadest at t=0.25, narrows to 0 at t=1
        const maxHalfW = pinR * 0.55;
        const halfW = maxHalfW * (1 - t) * (1 - t);
        inTail = Math.abs(px - pinCx) <= halfW;
      }

      const inPin = inCircle || inTail;

      if (!inPin) {
        // Blue background (#2563EB)
        pixels.push([37, 99, 235, 255]);
        continue;
      }

      // Inner dot (blue, punched out of the white pin)
      if (distPin <= dotR) {
        pixels.push([37, 99, 235, 255]);
      } else {
        pixels.push([255, 255, 255, 255]);
      }
    }
  }
  return pixels;
}

// ── Write files ───────────────────────────────────────────────────────────────

const outDir = __dirname;

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size);
  const png = makePNG(size, pixels);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓  icons/icon${size}.png  (${size}×${size}, ${png.length} bytes)`);
}

console.log('\nDone. Load browser-extension/ in chrome://extensions (Developer mode).');
