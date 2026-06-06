#!/usr/bin/env node
// Run: node generate-icons.js
// Generates PNG icons from the SVG source for the Chrome extension.
// Requires: npm install -g @resvg/resvg-js  OR  use Figma/Sketch to export the SVG as 16/48/128px PNGs.
//
// Quick alternative (if you have ImageMagick):
//   convert -background none icon.svg -resize 16x16 icon-16.png
//   convert -background none icon.svg -resize 48x48 icon-48.png
//   convert -background none icon.svg -resize 128x128 icon-128.png

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Draw the icon: indigo (#4f46e5) background, white map pin
function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 3);

  const cx = size / 2;
  const cy = size * 0.42;
  const pinR = size * 0.22; // outer radius of pin head
  const pinBodyH = size * 0.38; // how far pin body extends below center

  const bgR = 79, bgG = 70, bgB = 229;   // #4f46e5
  const fgR = 255, fgG = 255, fgB = 255; // white

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 3;
      const dx = x - cx;
      const dy = y - cy;

      // Draw rounded rect background
      const cornerR = size * 0.22;
      const inCorner =
        (x < cornerR && y < cornerR && Math.hypot(x - cornerR, y - cornerR) > cornerR) ||
        (x > size - cornerR && y < cornerR && Math.hypot(x - (size - cornerR), y - cornerR) > cornerR) ||
        (x < cornerR && y > size - cornerR && Math.hypot(x - cornerR, y - (size - cornerR)) > cornerR) ||
        (x > size - cornerR && y > size - cornerR && Math.hypot(x - (size - cornerR), y - (size - cornerR)) > cornerR);

      if (inCorner) {
        // transparent → use white background for PNG
        pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
        continue;
      }

      // Background
      pixels[idx] = bgR; pixels[idx + 1] = bgG; pixels[idx + 2] = bgB;

      // Map pin: circle head + triangle body
      const inHead = Math.hypot(dx, dy) <= pinR;
      // Triangle body: point facing down
      const inBody = dy > 0 && dy <= pinBodyH && Math.abs(dx) <= pinR * (1 - dy / pinBodyH);

      if (inHead || inBody) {
        // Inner hole in pin head
        const innerR = pinR * 0.38;
        if (Math.hypot(dx, dy) > innerR) {
          pixels[idx] = fgR; pixels[idx + 1] = fgG; pixels[idx + 2] = fgB;
        }
      }
    }
  }
  return pixels;
}

function makePNG(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw scanlines: filter byte + RGB data
  const pixels = drawIcon(size);
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter = None
    pixels.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.dirname(__filename);
for (const size of [16, 48, 128]) {
  const png = makePNG(size);
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}
console.log('Done! Load the extension in chrome://extensions with "Load unpacked".');
