#!/usr/bin/env node
// Pure Node.js PNG icon generator — no external dependencies.
// Generates the TravelPanel map-pin icon at multiple sizes.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];

// ── PNG helpers ───────────────────────────────────────────────────────────────

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(width, height, pixels) {
  // pixels: Uint8Array of width*height*4 (RGBA)
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw image data (filter byte 0 + row pixels)
  const raw = Buffer.allocUnsafe(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * (1 + width * 4) + 1 + x * 4;
      raw[ri]     = pixels[pi];
      raw[ri + 1] = pixels[pi + 1];
      raw[ri + 2] = pixels[pi + 2];
      raw[ri + 3] = pixels[pi + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG sig
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function setPixel(pixels, w, x, y, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const i = (y * w + x) * 4;
  // Alpha blend over current pixel
  const srcA = a / 255;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[i]     = Math.round((r * srcA + pixels[i]     * dstA * (1 - srcA)) / outA);
  pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
  pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
  pixels[i + 3] = Math.round(outA * 255);
}

function fillRect(pixels, w, x, y, rw, rh, r, g, b, a = 255) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(pixels, w, x + dx, y + dy, r, g, b, a);
}

function fillCircle(pixels, w, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        // Simple anti-alias at edge
        const edgeDist = Math.sqrt(dist2) - (radius - 0.5);
        const alpha = edgeDist > 0 ? Math.max(0, 1 - edgeDist) : 1;
        setPixel(pixels, w, Math.round(cx + dx), Math.round(cy + dy), r, g, b, Math.round(a * alpha));
      }
    }
  }
}

function fillRoundRect(pixels, w, x, y, rw, rh, rx, r, g, b, a = 255) {
  // Fill interior
  fillRect(pixels, w, x + rx, y, rw - 2 * rx, rh, r, g, b, a);
  fillRect(pixels, w, x, y + rx, rw, rh - 2 * rx, r, g, b, a);
  // Four corners
  fillCircle(pixels, w, x + rx, y + rx, rx, r, g, b, a);
  fillCircle(pixels, w, x + rw - rx - 1, y + rx, rx, r, g, b, a);
  fillCircle(pixels, w, x + rx, y + rh - rx - 1, rx, r, g, b, a);
  fillCircle(pixels, w, x + rw - rx - 1, y + rh - rx - 1, rx, r, g, b, a);
}

// Draw a map-pin shape: circle head + downward point
function drawPin(pixels, size, cx, cy, headR, pinBottom, pinHalfWidth, r, g, b) {
  // Triangle / teardrop body: fill pixels between head-center and pin-bottom
  const headBottom = cy + headR;
  for (let py = Math.round(headBottom); py <= Math.round(pinBottom); py++) {
    const t = (py - headBottom) / (pinBottom - headBottom);
    const halfW = pinHalfWidth * (1 - t);
    for (let px = Math.round(cx - halfW); px <= Math.round(cx + halfW); px++) {
      setPixel(pixels, size, px, py, r, g, b, 255);
    }
  }
  // Circle head (drawn after so it caps the triangle)
  fillCircle(pixels, size, cx, cy, headR, r, g, b, 255);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // transparent

  const cornerR = Math.round(size * 0.22);
  const padding = Math.round(size * 0.04);

  // Blue rounded square background
  fillRoundRect(pixels, size, padding, padding, size - 2 * padding, size - 2 * padding, cornerR,
    37, 99, 235, 255); // #2563eb

  // Pin geometry
  const cx = size / 2;
  const headY = size * 0.36;
  const headR = size * 0.195;
  const pinBottom = size * 0.82;
  const pinHalfW = size * 0.085;

  // White pin
  drawPin(pixels, size, cx, headY, headR, pinBottom, pinHalfW, 255, 255, 255);

  // Blue dot in pin head (hole)
  const dotR = headR * 0.38;
  fillCircle(pixels, size, cx, headY, dotR, 37, 99, 235, 255);

  return pixels;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const size of SIZES) {
  const pixels = renderIcon(size);
  const png = makePng(size, size, pixels);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icon${size}.png (${png.length} bytes)`);
}
