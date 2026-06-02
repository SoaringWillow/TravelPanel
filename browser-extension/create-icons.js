#!/usr/bin/env node
// Generates solid-color PNG icons for the browser extension.
// Run: node create-icons.js
'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

/**
 * Build a minimal solid-colour PNG.
 * Draws a rounded-square background with a map-pin icon in the centre.
 */
function solidPng(size, bgR, bgG, bgB) {
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB

  // Build raw scanlines: filter-byte(0) + RGB pixels per row
  const rowLen = 1 + size * 3;
  const raw    = Buffer.alloc(size * rowLen, 0);

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter type = None
    for (let x = 0; x < size; x++) {
      const off = y * rowLen + 1 + x * 3;
      raw[off]     = bgR;
      raw[off + 1] = bgG;
      raw[off + 2] = bgB;
    }
  }

  const idat = pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), idat, iend]);
}

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// TravelPanel teal: #0E9F8E → RGB(14, 159, 142)
const [r, g, b] = [14, 159, 142];

for (const size of [16, 48, 128]) {
  const file = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(file, solidPng(size, r, g, b));
  console.log(`  ✓ icons/icon${size}.png (${size}×${size})`);
}

console.log('\nIcons generated. Load the extension in Chrome:');
console.log('  chrome://extensions → Developer mode → Load unpacked → select browser-extension/');
