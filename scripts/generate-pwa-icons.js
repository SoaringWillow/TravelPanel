#!/usr/bin/env node
// Generates PWA icons for TravelPanel: 192×192, 512×512, 180×180 (apple-touch-icon).
// Same design as the iOS icon — indigo gradient + white location pin.
// Requires only Node.js built-ins. Usage: node scripts/generate-pwa-icons.js

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  const crc = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function makePNG(size) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const pinCY  = cy - size * 0.05;
  const pinR   = size * 0.21;
  const holeR  = size * 0.085;
  const tailHW = size * 0.058;
  const tailBY = cy + size * 0.30;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const scanline = [0];
    for (let x = 0; x < size; x++) {
      // Full square (no rounded rect masking — browser/OS handles that for PWA)
      const t   = (x + y) / (2 * (size - 1));
      const br  = lerp(79, 55, t);
      const bgg = lerp(70, 48, t);
      const bb  = lerp(229, 163, t);

      const sheenDist = Math.hypot(x - size * 0.25, y - size * 0.2);
      const sheen     = Math.max(0, 1 - sheenDist / (size * 0.55)) * 18;

      const pinDist = Math.hypot(x - cx, y - pinCY);
      const inCircle = pinDist <= pinR;
      const inHole   = pinDist <= holeR;
      const inTail   = Math.abs(x - cx) <= tailHW && y > pinCY + pinR * 0.5 && y <= tailBY;

      if ((inCircle || inTail) && !inHole) {
        const shadowT = Math.max(0, (pinDist / pinR - 0.5) * 2);
        const shadeV  = inCircle ? Math.round(shadowT * 30) : 0;
        scanline.push(255 - shadeV, 255 - shadeV, 255 - shadeV);
      } else {
        scanline.push(
          Math.min(255, br + sheen),
          Math.min(255, bgg + sheen),
          Math.min(255, bb + Math.round(sheen * 0.6)),
        );
      }
    }
    rows.push(Buffer.from(scanline));
  }

  const raw  = Buffer.concat(rows);
  const comp = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', comp), makeChunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'public');
for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
  const buf  = makePNG(size);
  const dest = path.join(outDir, name);
  fs.writeFileSync(dest, buf);
  console.log(`✓  public/${name}  (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log('PWA icons generated.');
