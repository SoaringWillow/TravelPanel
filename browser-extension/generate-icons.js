#!/usr/bin/env node
// Generates PNG icons from a simple drawn design.
// Run once: node generate-icons.js
// Zero external dependencies — uses only built-in Node modules.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function uint32BE(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBytes, data]);
  const crcBuf = uint32BE(crc32(combined));
  return Buffer.concat([uint32BE(data.length), typeBytes, data, crcBuf]);
}

function createPNG(width, height, drawFn) {
  const pixels = Buffer.alloc(width * height * 4);

  // Draw each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgba = drawFn(x, y, width, height);
      const i = (y * width + x) * 4;
      pixels[i] = rgba[0]; pixels[i + 1] = rgba[1]; pixels[i + 2] = rgba[2]; pixels[i + 3] = rgba[3];
    }
  }

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  uint32BE(width).copy(ihdr, 0);
  uint32BE(height).copy(ihdr, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — one filter byte (0 = None) per scanline
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < width * 4; x++) {
      raw[rowStart + 1 + x] = pixels[y * width * 4 + x];
    }
  }
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Anti-aliased circle helper
function inCircle(x, y, cx, cy, r) {
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // 1 px feather for anti-aliasing
  return Math.max(0, Math.min(1, r + 0.5 - dist));
}

function drawIcon(x, y, w, h) {
  const cx = w / 2;
  // Pin parameters (scaled to icon size)
  const pinR = w * 0.38;       // circle radius
  const pinCy = h * 0.38;      // circle center y
  const pinTipY = h * 0.88;    // tip of the pin
  const bodyWidth = w * 0.22;  // pin stem half-width

  // Indigo colour #6366f1
  const [pr, pg, pb] = [99, 102, 241];
  const [wr, wg, wb] = [255, 255, 255]; // white

  // --- Pin stem (triangle / tapered body) ---
  // Stem from circle-bottom to tip
  const stemTopY = pinCy + pinR * 0.75;
  const stemA = inCircle(x, y, cx, pinTipY, w * 0.04); // tip dot
  let stemAlpha = 0;
  if (y >= stemTopY && y <= pinTipY) {
    const progress = (y - stemTopY) / (pinTipY - stemTopY);
    const hw = bodyWidth * (1 - progress * 0.85);
    const dist = Math.abs(x + 0.5 - cx);
    stemAlpha = Math.max(0, Math.min(1, hw - dist + 0.5));
  }

  // --- Pin circle ---
  const circleAlpha = inCircle(x, y, cx, pinCy, pinR);
  // White inner dot
  const dotAlpha = inCircle(x, y, cx, pinCy, pinR * 0.38);

  // Composite: stem → circle → dot
  let r = 0, g = 0, b = 0, a = 0;

  // Stem
  if (stemAlpha > 0) {
    r = pr; g = pg; b = pb; a = stemAlpha;
  }
  // Tip dot
  if (stemA > 0) {
    r = pr; g = pg; b = pb; a = Math.max(a, stemA);
  }
  // Circle (over stem)
  if (circleAlpha > 0) {
    const blend = circleAlpha;
    r = r + (pr - r) * blend;
    g = g + (pg - g) * blend;
    b = b + (pb - b) * blend;
    a = Math.max(a, blend);
  }
  // White inner dot (over circle)
  if (dotAlpha > 0) {
    r = r + (wr - r) * dotAlpha;
    g = g + (wg - g) * dotAlpha;
    b = b + (wb - b) * dotAlpha;
  }

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 32, 48, 128]) {
  const png = createPNG(size, size, (x, y, w, h) => drawIcon(x, y, w, h));
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath}`);
}

console.log('Done! Icons generated in browser-extension/icons/');
