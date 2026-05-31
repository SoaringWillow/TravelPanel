#!/usr/bin/env node
// Generates solid-color PNG icons for the browser extension.
// Run: node scripts/generate-icons.js
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t      = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([lenBuf, t, data, crcBuf]);
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type

  // Raw scanlines: 1 filter byte + RGB per pixel
  const rowLen = 1 + size * 3;
  const raw    = Buffer.alloc(size * rowLen, 0);
  for (let y = 0; y < size; y++) {
    const row = y * rowLen;
    // filter byte stays 0 (None)
    for (let x = 0; x < size; x++) {
      raw[row + 1 + x * 3]     = r;
      raw[row + 2 + x * 3]     = g;
      raw[row + 3 + x * 3]     = b;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'extension', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// Indigo-500 (#6366f1 = 99, 102, 241)
for (const size of [16, 32, 48, 128]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, solidPNG(size, 99, 102, 241));
  console.log(`✓ icon-${size}.png`);
}
