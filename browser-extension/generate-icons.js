#!/usr/bin/env node
// Generates PNG icons for the browser extension without any npm dependencies.
// Uses Node.js built-in zlib for PNG compression and a pure-JS CRC32.

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── CRC32 (required by PNG spec) ────────────────────────────────────────────
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ─── Draw icon pixels ─────────────────────────────────────────────────────────
// Returns a flat Uint8Array of RGBA pixels (row-major).
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha-composite over transparent background
    const alpha = a / 255;
    px[i]     = Math.round(px[i]     * (1 - alpha) + r * alpha);
    px[i + 1] = Math.round(px[i + 1] * (1 - alpha) + g * alpha);
    px[i + 2] = Math.round(px[i + 2] * (1 - alpha) + b * alpha);
    px[i + 3] = Math.min(255, px[i + 3] + a);
  }

  function fillCircle(cx, cy, radius, r, g, b, a) {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) {
          // Anti-alias edge
          const aa = Math.max(0, Math.min(1, radius - dist + 0.5));
          setPixel(x, y, r, g, b, Math.round(a * aa));
        }
      }
    }
  }

  function fillRect(x1, y1, x2, y2, r, g, b, a) {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        setPixel(x, y, r, g, b, a);
  }

  // Background rounded square (indigo-600 #4F46E5)
  const R = size * 0.22; // corner radius
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Check if inside rounded rect
      const dx = Math.max(0, Math.abs(x - cx) - (size / 2 - R - 0.5));
      const dy = Math.max(0, Math.abs(y - cy) - (size / 2 - R - 0.5));
      const dist = Math.sqrt(dx * dx + dy * dy);
      const aa = Math.max(0, Math.min(1, R - dist + 0.5));
      setPixel(x, y, 0x4f, 0x46, 0xe5, Math.round(255 * aa));
    }
  }

  // Map pin shape (white)
  // Pin head (circle)
  const pinCX = cx;
  const pinHeadY = cy - size * 0.10;
  const pinHeadR = size * 0.14;
  fillCircle(pinCX, pinHeadY, pinHeadR, 255, 255, 255, 255);

  // Pin tail (triangle pointing down)
  const tailTop = pinHeadY + pinHeadR * 0.6;
  const tailBot = cy + size * 0.18;
  const tailW = pinHeadR * 0.45;
  for (let y = Math.floor(tailTop); y <= Math.ceil(tailBot); y++) {
    const t = (y - tailTop) / (tailBot - tailTop);
    const halfW = tailW * (1 - t);
    for (let x = Math.floor(pinCX - halfW); x <= Math.ceil(pinCX + halfW); x++) {
      setPixel(x, y, 255, 255, 255, 255);
    }
  }

  return px;
}

// ─── Encode PNG ───────────────────────────────────────────────────────────────
function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  // bytes 10-12 are 0 (compression, filter, interlace)

  // Build raw image data: filter byte + row bytes
  const rowLen = size * 4;
  const rawRows = Buffer.alloc(size * (1 + rowLen));
  for (let y = 0; y < size; y++) {
    rawRows[y * (1 + rowLen)] = 0; // filter type: None
    for (let x = 0; x < rowLen; x++) {
      rawRows[y * (1 + rowLen) + 1 + x] = pixels[y * rowLen + x];
    }
  }

  const compressed = zlib.deflateSync(rawRows, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Generate all sizes ───────────────────────────────────────────────────────
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of sizes) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, pixels);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nDone! Icons written to browser-extension/icons/');
