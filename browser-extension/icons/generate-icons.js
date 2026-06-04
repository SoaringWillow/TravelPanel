#!/usr/bin/env node
// Generates PNG icons for the TravelPanel Clipper browser extension.
// Run: node icons/generate-icons.js
// No npm dependencies required.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([tb, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, tb, data, crcBuf]);
}

function makePNG(size) {
  // Draw a dark rounded-square background with a white map-pin icon
  // Using RGBA (color type 6)
  const canvas = new Uint8Array(size * size * 4); // RGBA

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44; // background circle radius
  const pinW = size * 0.32;
  const pinH = size * 0.44;
  const pinCY = cy - size * 0.04; // pin center (slightly above middle)
  const pinTopR = pinW * 0.5;

  // Background: dark (#1e293b = 30,41,59) rounded rect
  const bgR = Math.round(size * 0.2); // corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Rounded rectangle check using SDF
      const dx = Math.abs(x - cx) - (size * 0.5 - bgR - 0.5);
      const dy = Math.abs(y - cy) - (size * 0.5 - bgR - 0.5);
      const dist = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) - bgR;
      if (dist <= 0) {
        canvas[idx]     = 30;   // R
        canvas[idx + 1] = 41;   // G
        canvas[idx + 2] = 59;   // B
        canvas[idx + 3] = 255;  // A
      }
    }
  }

  // White map pin icon
  const pinR = pinW * 0.5;
  const pinTipY = pinCY + pinH * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (canvas[idx + 3] === 0) continue; // outside background

      const rx = x - cx;
      const ry = y - pinCY;

      // Teardrop shape: circle on top + triangle pointing down
      const inCircle = rx * rx + ry * ry <= pinR * pinR && y <= pinCY + pinR * 0.4;

      // Triangle: widening from pin bottom toward top
      const normalizedY = (y - pinCY) / (pinTipY - pinCY); // 0 at center, 1 at tip
      const halfW = pinR * (1 - normalizedY) * 1.05;
      const inTriangle = normalizedY >= 0 && normalizedY <= 1 && Math.abs(rx) <= halfW;

      if (inCircle || inTriangle) {
        canvas[idx]     = 255;
        canvas[idx + 1] = 255;
        canvas[idx + 2] = 255;
        canvas[idx + 3] = 255;
      }
    }
  }

  // Build PNG raw data (filter byte + RGBA rows)
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0; // filter None
    canvas.slice(y * size * 4, (y + 1) * size * 4).forEach((v, i) => { row[i + 1] = v; });
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

[16, 48, 128].forEach(size => {
  const buf = makePNG(size);
  const p = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(p, buf);
  console.log(`✓ icon${size}.png (${buf.length} bytes)`);
});

console.log('Icons generated.');
