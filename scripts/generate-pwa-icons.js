#!/usr/bin/env node
// Generates PWA icons for TravelPanel iOS/Android installation.
// Uses only Node.js built-in modules — no npm dependencies required.
// Run: node scripts/generate-pwa-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

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

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const raw = Buffer.allocUnsafe(size * (1 + size * 4));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      raw[pos++] = rgba[src];
      raw[pos++] = rgba[src + 1];
      raw[pos++] = rgba[src + 2];
      raw[pos++] = rgba[src + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function drawIcon(size, rounded) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  // Corner radius: 22.5% for iOS-style rounded square, full circle if rounded=false
  const cornerR = rounded ? size * 0.225 : size * 0.5;

  // Brand gradient: indigo → violet
  const C1 = { r: 99,  g: 102, b: 241 }; // #6366F1 indigo
  const C2 = { r: 139, g: 92,  b: 246 }; // #8B5CF6 violet

  // Map-pin geometry (relative to size)
  const pinHeadCy = cy - size * 0.08;
  const pinHeadR  = size * 0.24;
  const dotR      = size * 0.09;
  const tailBottom = cy + size * 0.30;
  const tailHalfW  = size * 0.12;

  function inRoundedRect(px, py) {
    const rx = Math.abs(px - cx);
    const ry = Math.abs(py - cy);
    const maxR = size / 2;
    if (rx > maxR || ry > maxR) return false;
    const cornerX = maxR - cornerR;
    const cornerY = maxR - cornerR;
    if (rx <= cornerX || ry <= cornerY) return true;
    const dx = rx - cornerX;
    const dy = ry - cornerY;
    return Math.sqrt(dx * dx + dy * dy) <= cornerR;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      if (!inRoundedRect(x, y)) { rgba[idx + 3] = 0; continue; }

      const t = y / (size - 1); // top → bottom gradient
      const bg = { r: lerp(C1.r, C2.r, t), g: lerp(C1.g, C2.g, t), b: lerp(C1.b, C2.b, t) };

      const dx = x - cx;
      const pinDy = y - pinHeadCy;
      const pinDist = Math.sqrt(dx * dx + pinDy * pinDy);

      const tailTopY = pinHeadCy + pinHeadR * 0.7;
      const inTail = y >= tailTopY && y <= tailBottom &&
        Math.abs(x - cx) <= tailHalfW * (1 - (y - tailTopY) / (tailBottom - tailTopY));
      const inHead = pinDist <= pinHeadR;
      const inDot  = pinDist <= dotR;

      let r, g, b;
      if (inHead || inTail) {
        if (inDot) {
          r = lerp(bg.r, 30, 0.5); g = lerp(bg.g, 10, 0.5); b = lerp(bg.b, 80, 0.5);
        } else {
          r = 255; g = 255; b = 255;
        }
      } else {
        r = bg.r; g = bg.g; b = bg.b;
      }

      rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b; rgba[idx + 3] = 255;
    }
  }
  return rgba;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// PWA manifest icons (rounded square for maskable)
const sizes = [120, 152, 167, 180, 192, 512];
for (const size of sizes) {
  const rgba = drawIcon(size, true);
  const png  = encodePNG(size, rgba);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ public/icons/icon-${size}.png  (${png.length} bytes)`);
}

console.log('\nDone. Icons written to public/icons/');
