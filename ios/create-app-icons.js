#!/usr/bin/env node
/**
 * TravelPanel App Icon Generator
 *
 * Generates branded iOS app icon (1024×1024) and splash screens (2732×2732).
 * Requires no npm packages — uses only Node.js built-ins (zlib, fs, path).
 *
 * Usage:
 *   node ios/create-app-icons.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── PNG helpers ──────────────────────────────────────────────────────────────

function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}
const CRC_TABLE = buildCrcTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb   = Buffer.from(type, 'ascii');
  const len  = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const crcb = Buffer.allocUnsafe(4); crcb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crcb]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Build raw scanlines (filter byte 0 per row)
  const rowBytes = w * 4;
  const raw = Buffer.allocUnsafe((rowBytes + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: None
    rgba.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

function setPixel(buf, w, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0) return;
  const i = (y * w + x) * 4;
  if (i + 3 >= buf.length) return;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function fillRect(buf, w, h, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
      setPixel(buf, w, x, y, r, g, b, a);
    }
  }
}

function fillCircle(buf, w, h, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(h - 1, Math.ceil(cy + radius));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(buf, w, px, py, r, g, b, a);
      }
    }
  }
}

/** Filled isosceles triangle pointing down: base at y=baseY spanning cx±halfW, tip at (cx, tipY) */
function fillDropTail(buf, w, h, cx, baseY, halfW, tipY, r, g, b, a = 255) {
  const span = tipY - baseY;
  for (let y = Math.max(0, baseY); y <= Math.min(h - 1, tipY); y++) {
    const t = (y - baseY) / span;           // 0 at base, 1 at tip
    const hw = Math.round(halfW * (1 - t));
    for (let x = cx - hw; x <= cx + hw; x++) {
      if (x >= 0 && x < w) setPixel(buf, w, x, y, r, g, b, a);
    }
  }
}

/** Rounded-corner rectangle mask (for icon background corners) */
function roundedRect(buf, w, h, cornerR, r, g, b, a = 255) {
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // Find nearest corner
      const nearX = px < cornerR ? cornerR : (px > w - 1 - cornerR ? w - 1 - cornerR : px);
      const nearY = py < cornerR ? cornerR : (py > h - 1 - cornerR ? h - 1 - cornerR : py);
      const dx = px - nearX, dy = py - nearY;
      if (dx * dx + dy * dy <= cornerR * cornerR) {
        setPixel(buf, w, px, py, r, g, b, a);
      }
    }
  }
}

// ─── Icon designs ─────────────────────────────────────────────────────────────

const INDIGO   = [99, 102, 241];
const WHITE    = [255, 255, 255];
const INDIGO_D = [67, 56, 202];   // darker shade for depth ring
const ALPHA0   = [0, 0, 0, 0];    // transparent

/**
 * Draw the TravelPanel map-pin logo centred in a w×h canvas.
 * The logo is a solid white teardrop pin with an indigo inner dot.
 *
 * @param {Buffer} buf   - RGBA pixel buffer
 * @param {number} w     - canvas width
 * @param {number} h     - canvas height
 * @param {number} cx    - horizontal centre
 * @param {number} cy    - vertical centre of the whole pin
 * @param {number} scale - 1.0 = full size for 1024×1024; 0.5 for smaller
 * @param {number[]} fg  - foreground (pin) color
 * @param {number[]} bg  - background (inner dot) color
 */
function drawMapPin(buf, w, h, cx, cy, scale, fg, bg) {
  // Designed at 1024×1024:
  // Head circle: center (512, 370), radius 235
  // Drop tail: base half-width 235 at y=370, tip at y=790
  // Inner dot: radius 90

  const headR  = Math.round(235 * scale);
  const headCY = Math.round(cy - 80 * scale);   // slightly above centre
  const tipY   = Math.round(cy + 390 * scale);
  const innerR = Math.round(90  * scale);

  // Tail — starts at headCY (equator), fans down to tip
  fillDropTail(buf, w, h, cx, headCY, headR, tipY, ...fg);
  // Head circle (overwrites top of tail to give clean teardrop)
  fillCircle(buf, w, h, cx, headCY, headR, ...fg);
  // Inner dot (indigo-on-indigo on app icon; bg-on-pin elsewhere)
  fillCircle(buf, w, h, cx, headCY, innerR, ...bg);
}

// ─── Generate 1024×1024 app icon ─────────────────────────────────────────────

function generateAppIcon(size = 1024) {
  const buf = Buffer.alloc(size * size * 4, 0); // transparent

  // Rounded indigo background (iOS rounds corners itself, but this looks
  // great in previews / web manifest too)
  roundedRect(buf, size, size, Math.round(size * 0.22), ...INDIGO);

  // Centred pin: scale so pin head radius ≈ 235/1024 of the icon
  const scale = size / 1024;
  drawMapPin(buf, size, size, size / 2, size / 2, scale, WHITE, INDIGO);

  return buf;
}

// ─── Generate 2732×2732 splash screen ────────────────────────────────────────

function generateSplash(size = 2732) {
  const buf = Buffer.alloc(size * size * 4, 0);

  // White background
  fillRect(buf, size, size, 0, 0, size - 1, size - 1, ...WHITE);

  // Large indigo background square with rounded corners behind the pin
  const logoSize = Math.round(size * 0.38);
  const margin   = Math.round((size - logoSize) / 2);
  const cr       = Math.round(logoSize * 0.22);

  // Draw rounded indigo square for logo background
  const tmpBuf = Buffer.alloc(logoSize * logoSize * 4, 0);
  roundedRect(tmpBuf, logoSize, logoSize, cr, ...INDIGO);

  // Blit tmpBuf into main buf
  for (let y = 0; y < logoSize; y++) {
    for (let x = 0; x < logoSize; x++) {
      const si = (y * logoSize + x) * 4;
      const di = ((margin + y) * size + (margin + x)) * 4;
      if (tmpBuf[si + 3] > 0) {
        buf[di]     = tmpBuf[si];
        buf[di + 1] = tmpBuf[si + 1];
        buf[di + 2] = tmpBuf[si + 2];
        buf[di + 3] = tmpBuf[si + 3];
      }
    }
  }

  // Draw pin centred in the logo square
  const pinScale = logoSize / 1024;
  drawMapPin(buf, size, size, size / 2, size / 2, pinScale, WHITE, INDIGO);

  return buf;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const ICON_DIR   = path.join(__dirname, 'App/App/Assets.xcassets/AppIcon.appiconset');
const SPLASH_DIR = path.join(__dirname, 'App/App/Assets.xcassets/Splash.imageset');

console.log('Generating TravelPanel app icons…');

// 1024×1024 app icon
{
  process.stdout.write('  AppIcon 1024×1024… ');
  const pixels = generateAppIcon(1024);
  const png    = encodePng(1024, 1024, pixels);
  fs.writeFileSync(path.join(ICON_DIR, 'AppIcon-512@2x.png'), png);
  console.log(`${(png.length / 1024).toFixed(1)} KB`);
}

// 2732×2732 splash (3 copies for 1×/2×/3× in the imageset)
{
  process.stdout.write('  Splash 2732×2732… ');
  const pixels = generateSplash(2732);
  const png    = encodePng(2732, 2732, pixels);
  ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'].forEach((name) => {
    fs.writeFileSync(path.join(SPLASH_DIR, name), png);
  });
  console.log(`${(png.length / 1024).toFixed(1)} KB`);
}

console.log('Done. Icon and splash assets updated.');
