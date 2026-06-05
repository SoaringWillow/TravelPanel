#!/usr/bin/env node
// Generates icons/icon16.png, icons/icon48.png, icons/icon128.png
// No external dependencies — uses Node's built-in zlib.
'use strict';

const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(size, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      rows.push(r, g, b, a);
    }
  }

  const compressed = deflateSync(Buffer.from(rows));
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw a map-pin icon: teal circle top + narrow triangular point at bottom
function pinPixel(x, y, size) {
  const s = size;
  const cx = s / 2;

  // Circle center sits in the upper ~55% of the icon
  const cy = s * 0.40;
  const outerR = s * 0.36;
  const innerR = outerR * 0.38;   // white "dot" inside the pin head

  // Stem: triangle that narrows from circle bottom to a point
  const stemTopY = cy + outerR * 0.7;
  const stemBotY = s * 0.90;
  const stemProgress = Math.max(0, (y - stemTopY) / (stemBotY - stemTopY));
  const stemHalfW = outerR * 0.28 * (1 - stemProgress);

  // Teal color #0d9488
  const [PR, PG, PB] = [13, 148, 136];

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Anti-aliased circle
  const edge = Math.max(1, s * 0.015);
  const circleAlpha = Math.max(0, Math.min(1, (outerR - dist) / edge));

  // Hole in center
  const holeAlpha = Math.max(0, Math.min(1, (dist - innerR) / edge));

  const inStem = y >= stemTopY && y <= stemBotY && Math.abs(dx) <= stemHalfW + 0.5;
  const stemAlpha = inStem ? Math.min(1, (stemHalfW + 0.5 - Math.abs(dx))) : 0;

  const pinAlpha = Math.max(circleAlpha * holeAlpha, stemAlpha);

  if (circleAlpha > 0.01 && holeAlpha < 0.98) {
    // Inside the white hole
    const a = Math.round((1 - holeAlpha) * circleAlpha * 255);
    return [255, 255, 255, a];
  }

  const a = Math.round(pinAlpha * 255);
  if (a < 2) return [0, 0, 0, 0];

  // Slight shadow/depth: darken bottom half of circle
  const shade = dist > outerR * 0.3 && dy > 0 ? 12 : 0;
  return [Math.max(0, PR - shade), Math.max(0, PG - shade), Math.max(0, PB - shade), a];
}

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size, pinPixel);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}

console.log('Icons generated successfully.');
