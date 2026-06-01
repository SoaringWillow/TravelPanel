#!/usr/bin/env node
// Run: node generate-icons.js
// Generates icons/icon16.png, icons/icon48.png, icons/icon128.png

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(data) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  // Draw a rounded indigo square with a white plane glyph
  const pixels = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2, cy = size / 2, r = size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const off = (y * size + x) * 4;
      if (dist <= r) {
        // Indigo gradient background
        const t = (x + y) / (size * 2);
        pixels[off]     = Math.round(79 + t * 30);   // R: indigo ~79
        pixels[off + 1] = Math.round(70 + t * 10);   // G
        pixels[off + 2] = Math.round(229 - t * 20);  // B
        pixels[off + 3] = 255;

        // Simple plane mark in white (center area)
        const nx = dx / r, ny = dy / r;
        // Horizontal bar
        if (Math.abs(ny) < 0.12 && Math.abs(nx) < 0.55) {
          pixels[off] = 255; pixels[off + 1] = 255; pixels[off + 2] = 255;
        }
        // Diagonal wings
        if (ny > -0.05 && ny < 0.45 && Math.abs(nx) < (0.45 - ny * 0.6)) {
          pixels[off] = 255; pixels[off + 1] = 255; pixels[off + 2] = 255;
        }
      }
    }
  }

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    pixels.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [16, 48, 128]) {
  const out = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(out, makePNG(size));
  console.log(`Created ${out}`);
}
console.log('Done.');
