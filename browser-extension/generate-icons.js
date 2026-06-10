#!/usr/bin/env node
// Generates solid-indigo PNG icons for the browser extension.
// Run once: node generate-icons.js

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(dataBuf.length, 0);
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, dataBuf])), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function createPNG(size, r, g, b) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(size * rowBytes);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const o = y * rowBytes + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Indigo-600: #4F46E5 → rgb(79, 70, 229)
const OUT = path.join(__dirname, 'icons');
fs.mkdirSync(OUT, { recursive: true });

for (const size of [16, 48, 128]) {
  const buf = createPNG(size, 79, 70, 229);
  fs.writeFileSync(path.join(OUT, `icon${size}.png`), buf);
  console.log(`✓ icons/icon${size}.png`);
}
