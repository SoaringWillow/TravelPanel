#!/usr/bin/env node
// Generates iOS App Icon + PWA apple-touch-icon using the same map-pin design
// as the browser extension (indigo #6366f1 background, white pin shape).
//
// Run: node generate-app-icons.js
// Outputs:
//   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png  (1024×1024)
//   public/apple-touch-icon.png  (180×180)

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── PNG encoder ──────────────────────────────────────────────────────────────

function makeCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = makeCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ─── Icon drawing ─────────────────────────────────────────────────────────────

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const bg = { r: 0x63, g: 0x66, b: 0xf1, a: 255 };  // #6366f1 indigo
  const fg = { r: 255,  g: 255,  b: 255,  a: 255 };   // white

  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = bg.r;
    pixels[i * 4 + 1] = bg.g;
    pixels[i * 4 + 2] = bg.b;
    pixels[i * 4 + 3] = bg.a;
  }

  const cx = size / 2;
  const r  = size * 0.30;
  const cy = size * 0.38;

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (Math.round(y) * size + Math.round(x)) * 4;
    pixels[idx]     = color.r;
    pixels[idx + 1] = color.g;
    pixels[idx + 2] = color.b;
    pixels[idx + 3] = color.a;
  }

  // Filled circle
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(px, py, fg);
    }
  }

  // Stem — tapered triangle pointing down
  const stemTop    = cy + r * 0.6;
  const stemBottom = size * 0.90;
  const stemHalfW  = r * 0.32;
  for (let py = Math.ceil(stemTop); py <= Math.floor(stemBottom); py++) {
    const t = (py - stemTop) / (stemBottom - stemTop);
    const halfW = stemHalfW * (1 - t);
    for (let px = Math.ceil(cx - halfW); px <= Math.floor(cx + halfW); px++) setPixel(px, py, fg);
  }

  // Inner dot (indigo) — gives pin a hole
  const dotR = r * 0.30;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy <= dotR * dotR) setPixel(px, py, bg);
    }
  }

  return pixels;
}

function makePNG(size) {
  const pixels = drawIcon(size);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;  // RGBA

  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    pixels.copy(raw, y * rowLen + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ─── Generate ─────────────────────────────────────────────────────────────────

const root = __dirname;

// iOS 1024×1024 app icon
const iosDir = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
fs.mkdirSync(iosDir, { recursive: true });
const iosIconPath = path.join(iosDir, 'AppIcon-512@2x.png');
fs.writeFileSync(iosIconPath, makePNG(1024));
console.log(`✓ ios AppIcon  1024×1024  (${fs.statSync(iosIconPath).size} bytes)`);

// PWA apple-touch-icon 180×180
const publicDir = path.join(root, 'public');
fs.mkdirSync(publicDir, { recursive: true });
const touchIconPath = path.join(publicDir, 'apple-touch-icon.png');
fs.writeFileSync(touchIconPath, makePNG(180));
console.log(`✓ public/apple-touch-icon.png  180×180  (${fs.statSync(touchIconPath).size} bytes)`);

console.log('Done.');
