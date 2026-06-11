#!/usr/bin/env node
'use strict';

/**
 * Generates TravelPanel browser extension icons as valid PNG files.
 * No external dependencies — uses only Node.js built-ins (zlib).
 * Run: node generate-icons.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC-32 used by PNG chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/**
 * Renders a gradient circle icon into a valid RGBA PNG.
 * Gradient: top #667EEA → bottom #764BA2 (TravelPanel brand)
 */
function createPNG(size) {
  const raw = [];

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter byte: None

    for (let x = 0; x < size; x++) {
      const cx = x - (size - 1) / 2;
      const cy = y - (size - 1) / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = (size / 2) * 0.88;

      if (dist < radius) {
        const t = y / (size - 1);
        // Gradient from #667EEA to #764BA2
        const r = Math.round(102 + (118 - 102) * t);
        const g = Math.round(126 + (75 - 126) * t);
        const b = Math.round(234 + (162 - 234) * t);
        // Soft anti-alias at edge
        const edgeStart = radius - 1.5;
        const alpha = dist > edgeStart ? Math.round(255 * (radius - dist) / 1.5) : 255;
        raw.push(r, g, b, Math.max(0, Math.min(255, alpha)));
      } else {
        raw.push(0, 0, 0, 0); // transparent
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw), { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf = createPNG(size);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ icons/icon${size}.png  (${buf.length} bytes)`);
}

console.log('\nIcons generated. Ready to load the extension in Chrome.');
