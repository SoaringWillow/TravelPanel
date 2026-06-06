#!/usr/bin/env node
// Generates icon-16.png, icon-48.png, icon-128.png as indigo circle PNGs
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
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function createIcon(size) {
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 1;
  const innerR = size / 2 - size * 0.2;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= outerR) {
        // Map pin shape: solid indigo circle with white inner circle for the dot
        const pinBodyEnd = cy * 0.35; // top 35% of circle is the "head"
        if (dist <= innerR * 0.32 && y > cy * 0.7) {
          // White center dot at bottom of pin head
          row.push(255, 255, 255, 255);
        } else {
          // Indigo body
          row.push(99, 102, 241, 255);
        }
      } else {
        row.push(0, 0, 0, 0); // transparent
      }
    }
    rows.push(...row);
  }

  const raw = Buffer.from(rows);
  const compressed = zlib.deflateSync(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), createIcon(size));
  console.log(`Generated icons/icon-${size}.png`);
}
console.log('Done.');
