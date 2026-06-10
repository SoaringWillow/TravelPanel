#!/usr/bin/env node
'use strict';

/**
 * Generates TravelPanel Clipper PNG icons (no external dependencies).
 * Run: node generate-icons.js
 *
 * Produces: icons/icon16.png, icons/icon48.png, icons/icon128.png
 * Design: orange background (#ea580c) with a white map-pin shape.
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 (required by PNG spec)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lb = Buffer.alloc(4); lb.writeUInt32BE(db.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, db])));
  return Buffer.concat([lb, tb, db, cb]);
}

function createIconPNG(size) {
  // Brand colours
  const [BR, BG, BB] = [234, 88, 12];   // orange-600 background
  const [FR, FG, FB] = [255, 255, 255]; // white foreground (pin)

  const cx = size / 2;

  // Pin geometry (proportional to icon size)
  const headR    = size * 0.30;  // circle radius
  const headCy   = size * 0.38;  // circle centre Y
  const tailTop  = size * 0.60;  // where tail narrows begins
  const tailTip  = size * 0.88;  // pointy bottom

  // Inner hole (donut) makes it look like a classic map pin
  const holeR    = size * 0.13;
  const holeCy   = headCy;

  const pixels = [];
  for (let y = 0; y < size; y++) {
    pixels.push(0); // PNG filter byte = None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;

      // Circle head
      const distHead = Math.hypot(dx, y - headCy);
      const inHead   = distHead <= headR;
      const inHole   = distHead <= holeR;

      // Triangular tail
      let inTail = false;
      if (y >= tailTop && y <= tailTip) {
        const progress  = (y - tailTop) / (tailTip - tailTop);
        const halfWidth = (1 - progress) * headR * 0.6;
        inTail = Math.abs(dx) <= halfWidth;
      }

      const isPin = (inHead && !inHole) || inTail;
      pixels.push(
        isPin ? FR : BR,
        isPin ? FG : BG,
        isPin ? FB : BB,
        255,
      );
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA colour type
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig        = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = zlib.deflateSync(Buffer.from(pixels), { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, createIconPNG(size));
  console.log(`✓ ${outPath}`);
}
console.log('Icons generated.');
