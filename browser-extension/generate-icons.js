#!/usr/bin/env node
// Generates PNG icons for the browser extension using only Node.js built-ins
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function u32BE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

const CRC_TABLE = (() => {
  const t = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return ((crc ^ 0xFFFFFFFF) >>> 0);
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = data;
  const crc = u32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([u32BE(d.length), t, d, crc]);
}

function createIcon(size) {
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr = chunk('IHDR', Buffer.concat([u32BE(size), u32BE(size), Buffer.from([8,2,0,0,0])]));

  const rows = [];
  const cx = size / 2, cy = size / 2;
  const r = size * 0.46;
  // airplane body angle: pointing up-right at 45°
  const planePixels = new Set();

  if (size >= 32) {
    // Draw a simple pixel-art plane for larger icons
    const s = size / 16; // scale factor
    const pts = [
      // body (diagonal line)
      [8,8],[7,9],[6,10],[5,11],[9,7],[10,6],[11,5],
      // wings
      [7,7],[6,8],[8,6],[9,9],
      [5,9],[4,9],[6,7],[10,7],
      // tail
      [5,12],[6,12],[4,11],
    ];
    for (const [px, py] of pts) {
      const sx = Math.round(px * s), sy = Math.round(py * s);
      for (let dy = 0; dy < Math.max(1, Math.round(s)); dy++) {
        for (let dx = 0; dx < Math.max(1, Math.round(s)); dx++) {
          planePixels.add(`${sx+dx},${sy+dy}`);
        }
      }
    }
  }

  for (let y = 0; y < size; y++) {
    const row = [0]; // filter=None
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2);
      if (dist > r) {
        row.push(248,250,252); // slate-50 bg
      } else if (planePixels.has(`${x},${y}`)) {
        row.push(255,255,255); // white plane
      } else {
        row.push(59,130,246); // blue-500 circle
      }
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, 'icons');
for (const size of [16, 32, 48, 128]) {
  const png = createIcon(size);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}
console.log('Icons generated.');
