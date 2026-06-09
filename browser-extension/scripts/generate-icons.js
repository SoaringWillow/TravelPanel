#!/usr/bin/env node
// Generates PNG icons for the TravelPanel browser extension.
// Uses only Node.js built-in modules — no npm dependencies required.
// Run: node scripts/generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── CRC32 (required by PNG format) ─────────────────────────────────────────

function buildCRCTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
}
const CRC_TABLE = buildCRCTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG writer ──────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, rgba) {
  // rgba: Uint8Array of length size*size*4, row-major, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Raw scanlines: 1 filter byte + 4 bytes/pixel
  const raw = Buffer.allocUnsafe(size * (1 + size * 4));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      raw[pos++] = rgba[src];
      raw[pos++] = rgba[src + 1];
      raw[pos++] = rgba[src + 2];
      raw[pos++] = rgba[src + 3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon renderer ───────────────────────────────────────────────────────────
// Renders a circular icon: sky-blue → indigo gradient background,
// white map-pin (location marker) in the center.

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function drawIcon(size) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const circleR = size * 0.46;

  // Brand colours
  const C1 = { r: 14, g: 165, b: 233 };   // #0EA5E9 sky-blue
  const C2 = { r: 99,  g: 102, b: 241 };  // #6366F1 indigo

  // Map-pin geometry (relative to size)
  const pinHeadCy = cy - size * 0.06;
  const pinHeadR  = size * 0.22;
  const dotR      = size * 0.08;
  // Tail is a triangle from pinHeadCy+pinHeadR down to cy + size*0.32
  const tailBottom = cy + size * 0.32;
  const tailHalfW  = size * 0.10;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      // Circular clip with 1px anti-alias
      let circleAlpha;
      if (dist <= circleR - 1) {
        circleAlpha = 255;
      } else if (dist <= circleR + 1) {
        circleAlpha = Math.round(255 * (circleR + 1 - dist) / 2);
      } else {
        rgba[idx + 3] = 0;
        continue;
      }

      // Gradient left → right
      const t = x / (size - 1);
      const bg = { r: lerp(C1.r, C2.r, t), g: lerp(C1.g, C2.g, t), b: lerp(C1.b, C2.b, t) };

      // Pin head circle
      const pinDy = y - pinHeadCy;
      const pinDist = Math.sqrt(dx * dx + pinDy * pinDy);

      // Tail triangle: point at (cx, tailBottom), base at pinHeadCy+pinHeadR
      const tailTopY = pinHeadCy + pinHeadR * 0.7;
      const inTail = y >= tailTopY && y <= tailBottom &&
        Math.abs(x - cx) <= tailHalfW * (1 - (y - tailTopY) / (tailBottom - tailTopY));

      const inHead = pinDist <= pinHeadR;
      const inDot  = pinDist <= dotR;

      let r, g, b, a;
      if (inHead || inTail) {
        if (inDot) {
          // Dark hole in pin head
          r = lerp(bg.r, 0, 0.4); g = lerp(bg.g, 0, 0.4); b = lerp(bg.b, 0, 0.4); a = 255;
        } else {
          // White pin shape
          r = 255; g = 255; b = 255; a = 240;
        }
      } else {
        r = bg.r; g = bg.g; b = bg.b; a = circleAlpha;
      }

      rgba[idx]     = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return rgba;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const rgba = drawIcon(size);
  const png  = encodePNG(size, rgba);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nDone. Icons written to browser-extension/icons/');
