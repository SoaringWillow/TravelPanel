#!/usr/bin/env node
/**
 * Generates the TravelPanel iOS app icon (1024×1024 PNG) using pure Node.js.
 * No external dependencies — uses a minimal PNG encoder with zlib.
 *
 * Design: #2563EB blue background + white location pin (same as browser extension SVG).
 *
 * Usage: node scripts/generate-app-icon.js
 * Output: ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const SIZE = 1024;

// ─── PNG encoder (raw, no dependencies) ──────────────────────────────────────

function writePNG(pixels) {
  // pixels: Uint8Array of length SIZE*SIZE*4 (RGBA)
  const width  = SIZE;
  const height = SIZE;

  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type: RGB (we'll pack RGBA → RGB for simplicity; no alpha needed)
  ihdr[9]  = 6;  // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw scanline data (filter byte 0 per row)
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crc   = crc32(Buffer.concat([typeB, data]));
    const crcB  = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

// ─── Render icon ─────────────────────────────────────────────────────────────

const pixels = new Uint8Array(SIZE * SIZE * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  // Alpha blend onto current pixel
  const srcA = a / 255;
  const dstA = pixels[i+3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[i]   = Math.round((r * srcA + pixels[i]   * dstA * (1 - srcA)) / outA);
  pixels[i+1] = Math.round((g * srcA + pixels[i+1] * dstA * (1 - srcA)) / outA);
  pixels[i+2] = Math.round((b * srcA + pixels[i+2] * dstA * (1 - srcA)) / outA);
  pixels[i+3] = Math.round(outA * 255);
}

// Fill background (blue #2563EB = 37,99,235)
for (let i = 0; i < SIZE * SIZE; i++) {
  pixels[i*4]   = 37;
  pixels[i*4+1] = 99;
  pixels[i*4+2] = 235;
  pixels[i*4+3] = 255;
}

// Rounded corners (clear to transparent outside radius)
const R = Math.round(SIZE * 0.22); // ~22% corner radius (iOS icon mask is ~22.5%)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = Math.max(0, Math.max(R - x, x - (SIZE - 1 - R)));
    const dy = Math.max(0, Math.max(R - y, y - (SIZE - 1 - R)));
    if (dx * dx + dy * dy > R * R) {
      const i = (y * SIZE + x) * 4;
      pixels[i+3] = 0; // transparent
    }
  }
}

// Draw white location pin (SVG path scaled to 1024×1024)
// Original SVG viewBox: 0 0 128 128
// Scale factor: 1024/128 = 8
const S = SIZE / 128;

function fillCircle(cx, cy, r, ri, ro, g, b) {
  const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1);
  const y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= r) setPixel(x, y, 255, 255, 255, 255);
    }
  }
  // punch inner circle (hole at center of pin)
  if (ri > 0) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d <= ri) setPixel(x, y, 37, 99, 235, 255);
      }
    }
  }
}

// Pin body: teardrop shape approximated as a filled circle for the top + triangle for the tail
// SVG pin: M64 22 C48.5 22 36 34.5 36 50 C36 67.6 64 106 64 106 C64 106 92 67.6 92 50 C92 34.5 79.5 22 64 22

// Simple approximation: large circle at top-center + downward triangle
const pinCx = 64 * S;
const pinCy = 50 * S;
const pinR  = 28 * S; // radius of the head circle

// Fill the pin head (white circle)
for (let y = Math.floor(pinCy - pinR - 1); y <= Math.ceil(pinCy + pinR + 1); y++) {
  for (let x = Math.floor(pinCx - pinR - 1); x <= Math.ceil(pinCx + pinR + 1); x++) {
    const d = Math.sqrt((x - pinCx) ** 2 + (y - pinCy) ** 2);
    if (d <= pinR) setPixel(x, y, 255, 255, 255, 255);
  }
}

// Fill the pin tail (triangle: from (36,50) to (92,50) to (64,106))
const tailY0 = Math.round(50 * S);
const tailY1 = Math.round(106 * S);
for (let y = tailY0; y <= tailY1; y++) {
  const t = (y - tailY0) / (tailY1 - tailY0);
  const xLeft  = Math.round((36 + t * (64 - 36)) * S);
  const xRight = Math.round((92 - t * (92 - 64)) * S);
  for (let x = xLeft; x <= xRight; x++) {
    setPixel(x, y, 255, 255, 255, 255);
  }
}

// Punch inner circle hole (the circle cutout in the pin head)
// SVG inner circle: center (64,49), radius 12
const holeCx = 64 * S;
const holeCy = 49 * S;
const holeR  = 12 * S;
for (let y = Math.floor(holeCy - holeR - 1); y <= Math.ceil(holeCy + holeR + 1); y++) {
  for (let x = Math.floor(holeCx - holeR - 1); x <= Math.ceil(holeCx + holeR + 1); x++) {
    const d = Math.sqrt((x - holeCx) ** 2 + (y - holeCy) ** 2);
    if (d <= holeR) setPixel(x, y, 37, 99, 235, 255);
  }
}

// ─── Write PNG ────────────────────────────────────────────────────────────────

const outPath = path.join(
  __dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
);

const pngData = writePNG(pixels);
fs.writeFileSync(outPath, pngData);
console.log(`✓ Written ${pngData.length} bytes → ${outPath}`);
