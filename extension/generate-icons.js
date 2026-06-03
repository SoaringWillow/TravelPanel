#!/usr/bin/env node
// Generates PNG icons for the extension using only built-in Node modules
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(size) {
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  // Draw indigo (#6366f1) circle on transparent background
  // with a subtle white map-pin dot in the center
  const cx = size / 2, cy = size / 2, r = size * 0.44;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const i = 1 + x * 4;
      if (d <= r) {
        // inner white dot
        const dotR = size * 0.14;
        if (d <= dotR) {
          row[i] = 255; row[i+1] = 255; row[i+2] = 255; row[i+3] = 255;
        } else {
          row[i] = 99; row[i+1] = 102; row[i+2] = 241; row[i+3] = 255; // #6366f1
        }
      }
      // else transparent (all zeros)
    }
    rows.push(row);
  }
  const raw = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', raw), makeChunk('IEND', Buffer.alloc(0))]);
}

const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), makePNG(size));
  console.log(`✓ icons/icon-${size}.png`);
}
