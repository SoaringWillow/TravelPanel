#!/usr/bin/env node
// Run: node generate-icons.js
// Generates icons/icon{16,32,48,128}.png — a map-pin icon in indigo/violet

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([t, data]);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function makePNG(size) {
  const PIN_COLOR = [99, 102, 241];   // indigo-500
  const PIN_DARK  = [79, 70, 229];    // indigo-600 (shadow)
  const HOLE      = [255, 255, 255];  // white inner circle

  const pixels = [];

  const cx = size / 2;
  const cy = size * 0.42;  // pin head sits slightly above center
  const headR = size * 0.36;
  const holeR = headR * 0.38;
  const tailX = cx;
  const tailY = size * 0.94;
  const tailW = size * 0.14;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // PNG filter byte per row
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White hole (inner circle)
      if (dist <= holeR) {
        pixels.push(...HOLE, 255);
        continue;
      }

      // Pin head (circle)
      if (dist <= headR) {
        // Subtle top-left gradient highlight
        const shade = dy < 0 && dx < 0 ? 20 : 0;
        pixels.push(PIN_COLOR[0] + shade, PIN_COLOR[1] + shade, PIN_COLOR[2], 255);
        continue;
      }

      // Pin tail (tapered teardrop below the head)
      if (y > cy) {
        const tailFraction = (y - cy) / (tailY - cy);    // 0→1 from head to tip
        const halfW = tailW * (1 - tailFraction) * 0.9;  // narrows toward tip
        if (Math.abs(x - tailX) <= halfW) {
          pixels.push(...PIN_DARK, 255);
          continue;
        }
      }

      // Transparent background
      pixels.push(0, 0, 0, 0);
    }
  }

  const IHDR_data = Buffer.allocUnsafe(13);
  IHDR_data.writeUInt32BE(size, 0);
  IHDR_data.writeUInt32BE(size, 4);
  IHDR_data.writeUInt8(8, 8);   // bit depth
  IHDR_data.writeUInt8(6, 9);   // RGBA
  IHDR_data.writeUInt8(0, 10);
  IHDR_data.writeUInt8(0, 11);
  IHDR_data.writeUInt8(0, 12);

  const raw = Buffer.from(pixels);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', IHDR_data),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = makePNG(size);
  const dest = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`  ✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nDone. Load browser-extension/ as an unpacked extension in Chrome.');
