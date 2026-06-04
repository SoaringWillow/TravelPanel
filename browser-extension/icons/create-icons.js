#!/usr/bin/env node
/**
 * Generates icon16.png, icon48.png, icon128.png for the TravelPanel Clipper extension.
 * Run: node icons/create-icons.js
 * Requires only Node.js built-ins (zlib, fs, path).
 */
'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

function makePNG(size, getPixel) {
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // compression, filter, interlace = 0

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size);
      raw.push(
        Math.round(Math.max(0, Math.min(255, r))),
        Math.round(Math.max(0, Math.min(255, g))),
        Math.round(Math.max(0, Math.min(255, b))),
        Math.round(Math.max(0, Math.min(255, a))),
      );
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── SDF helpers ───────────────────────────────────────────────────────────────
function sdfCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdfRoundRect(px, py, x1, y1, x2, y2, r) {
  const qx = Math.max(x1 + r, Math.min(x2 - r, px));
  const qy = Math.max(y1 + r, Math.min(y2 - r, py));
  return Math.hypot(px - qx, py - qy) - r;
}

function sdAlpha(sdf) {
  return Math.max(0, Math.min(1, 0.5 - sdf));
}

function blend(bg, fg, t) {
  return bg.map((v, i) => v + (fg[i] - v) * Math.max(0, Math.min(1, t)));
}

// ── Icon draw function ─────────────────────────────────────────────────────────
function getPixel(x, y, S) {
  const px = x + 0.5, py = y + 0.5;
  const m = S * 0.06;
  const rr = S * 0.22;

  // Background rounded rect (indigo #6366f1)
  const bgSdf = sdfRoundRect(px, py, m, m, S - m, S - m, rr);
  const bgA   = sdAlpha(bgSdf);
  if (bgA <= 0) return [0, 0, 0, 0];

  const BG = [0x63, 0x66, 0xf1];

  // Map-pin shape (supersampled 3×3)
  const SAMPLES = 3;
  let pinAcc = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      const spx = x + (sx + 0.5) / SAMPLES;
      const spy = y + (sy + 0.5) / SAMPLES;
      if (inPin(spx, spy, S)) pinAcc++;
    }
  }
  const pinAlpha = pinAcc / (SAMPLES * SAMPLES);

  const WHITE = [255, 255, 255];
  const rgb = blend(BG, WHITE, pinAlpha);
  return [...rgb, Math.round(255 * bgA)];
}

function inPin(px, py, S) {
  const cx    = S * 0.5;
  const cirCy = S * 0.36;
  const cirR  = S * 0.23;
  const tipY  = S * 0.78;
  const holeR = cirR * 0.38;

  // Circle top of pin
  const dCirc = sdfCircle(px, py, cx, cirCy, cirR);
  // Hole
  const dHole = sdfCircle(px, py, cx, cirCy, holeR);

  if (dCirc <= 0 && dHole > 0) return true;

  // Teardrop body below circle center
  if (py >= cirCy && py <= tipY) {
    const t = (py - cirCy) / (tipY - cirCy);
    const hw = cirR * (1 - t * 0.85);
    if (Math.abs(px - cx) <= hw) return true;
  }

  return false;
}

// ── Generate ──────────────────────────────────────────────────────────────────
for (const size of [16, 48, 128]) {
  const buf  = makePNG(size, getPixel);
  const dest = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✓ ${dest}  (${(buf.length / 1024).toFixed(1)} KB)`);
}
console.log('\nIcons ready. Load the extension from the browser-extension/ folder.');
