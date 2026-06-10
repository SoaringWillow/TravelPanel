#!/usr/bin/env node
// Generates icon16.png, icon48.png, icon128.png for the TravelPanel Clipper extension.
// Run: node generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function makePNG(size, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  // compression, filter, interlace = 0

  // Build raw scanlines: filter_byte + RGBA*width per row
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride, 0);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // None filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const off = y * stride + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw a map-pin on indigo background
function travelIcon(x, y, size) {
  const s = size;
  // Antialiasing helper: returns alpha 0-255 based on distance from edge
  function aa(dist, radius) {
    if (dist < radius - 1) return 255;
    if (dist > radius + 0.5) return 0;
    return Math.round((radius + 0.5 - dist) * 255);
  }

  // Circle parameters: pin head
  const cx = s / 2;
  const cy = s * 0.38;
  const outerR = s * 0.36;
  const innerR = s * 0.15;

  // Background: deep indigo gradient-ish
  const bg = [79, 70, 229]; // indigo-600

  // Distance from circle center
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const circleAlpha = aa(dist, outerR);
  const holeAlpha  = aa(dist, innerR);

  if (circleAlpha > 0) {
    if (holeAlpha > 0) {
      // White hole in center
      const blend = holeAlpha / 255;
      return [
        Math.round(bg[0] * (1 - blend) + 255 * blend),
        Math.round(bg[1] * (1 - blend) + 255 * blend),
        Math.round(bg[2] * (1 - blend) + 255 * blend),
        circleAlpha,
      ];
    }
    return [...bg, circleAlpha];
  }

  // Pin tail: triangle narrowing from bottom of circle to point
  const pinTopY = cy + outerR;
  const pinBotY = s * 0.90;
  const pinMaxHalfW = s * 0.13;

  if (y + 0.5 > pinTopY && y + 0.5 < pinBotY) {
    const t = (y + 0.5 - pinTopY) / (pinBotY - pinTopY);
    const halfW = pinMaxHalfW * (1 - t);
    const edgeDist = halfW - Math.abs(x + 0.5 - cx);
    if (edgeDist > -0.5) {
      const alpha = edgeDist < 0.5 ? Math.round((edgeDist + 0.5) * 255) : 255;
      return [...bg, alpha];
    }
  }

  // Transparent background
  return [0, 0, 0, 0];
}

const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size, travelIcon);
  const dest = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}
