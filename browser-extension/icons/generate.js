#!/usr/bin/env node
// Generates icon16/32/48/128.png — solid indigo (#4f46e5) squares.
// Requires only Node.js built-ins; no npm deps needed.
// Usage: node icons/generate.js

const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crc32.table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crc32.table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf    = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function makePNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines: 1 filter byte + RGB per pixel
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter: None
  for (let x = 0; x < size; x++) {
    const p = 1 + x * 3;
    row[p] = r; row[p + 1] = g; row[p + 2] = b;
  }
  const rawData = Buffer.concat(Array(size).fill(row));

  const idat = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const OUT = path.join(__dirname);
const [R, G, B] = [0x4f, 0x46, 0xe5]; // indigo-600 #4f46e5

for (const size of [16, 32, 48, 128]) {
  const outPath = path.join(OUT, `icon${size}.png`);
  fs.writeFileSync(outPath, makePNG(size, R, G, B));
  console.log(`✓ ${outPath}`);
}

console.log('Done. Icons ready for browser-extension/.');
