#!/usr/bin/env node
/**
 * Generates TravelPanel Clipper extension icons as solid-color PNGs.
 * Pure Node.js — no external dependencies needed.
 * Usage: node build-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

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
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Creates a minimal valid RGB PNG for the given size and color.
 * Draws a rounded-corner design: brand-color background, white pin dot center.
 */
function createIconPNG(size, bgR, bgG, bgB) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowLen = 1 + size * 4; // filter byte + RGBA
  const raw = Buffer.alloc(size * rowLen, 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const cornerR = size * 0.22; // visual rounded corner approximation
  const dotR = size * 0.18;

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Use a circle shape (looks great as extension icon)
      let alpha = 0;
      if (dist < outerR - 1) {
        alpha = 255;
      } else if (dist < outerR) {
        alpha = Math.round((outerR - dist) * 255);
      }

      let r = bgR, g = bgG, b = bgB;

      // White dot in center (represents a map pin)
      if (dist < dotR) {
        r = 255; g = 255; b = 255;
      }

      const p = y * rowLen + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = alpha;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// TravelPanel brand: #6366f1 (indigo-500)
const [R, G, B] = [99, 102, 241];

for (const size of [16, 48, 128]) {
  const buf = createIconPNG(size, R, G, B);
  const out = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ icons/icon-${size}.png  (${buf.length} bytes)`);
}

console.log('\nIcons generated. Load the extension/ folder in chrome://extensions.');
