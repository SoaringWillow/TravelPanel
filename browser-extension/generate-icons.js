#!/usr/bin/env node
/**
 * Generates PNG icon files for the TravelPanel browser extension.
 * Uses only Node.js built-ins (zlib, fs, path) — no npm dependencies required.
 *
 * Run once before loading the extension:
 *   node generate-icons.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (needed for valid PNG chunks) ──────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(val) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(val >>> 0, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBytes, data]));
  return Buffer.concat([u32be(data.length), typeBytes, data, u32be(crc)]);
}

// ── Draw helpers ─────────────────────────────────────────────────────────────
// Returns a flat RGBA Uint8Array for an image of `size×size` pixels.
function createCanvas(size) {
  return new Uint8Array(size * size * 4); // all transparent
}

function setPixel(buf, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const off = (y * size + x) * 4;
  buf[off]     = r;
  buf[off + 1] = g;
  buf[off + 2] = b;
  buf[off + 3] = a;
}

// Filled circle (anti-alias via alpha on the edge ring)
function fillCircle(buf, size, cx, cy, r, R, G, B) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r - 0.5) {
        setPixel(buf, size, x, y, R, G, B, 255);
      } else if (dist < r + 0.5) {
        const alpha = Math.round((r + 0.5 - dist) * 255);
        setPixel(buf, size, x, y, R, G, B, alpha);
      }
    }
  }
}

// Filled polygon via scanline
function fillPoly(buf, size, pts, R, G, B, A = 255) {
  if (pts.length < 3) return;
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= py && py < y1) || (y1 <= py && py < y0)) {
        xs.push(x0 + (py - y0) / (y1 - y0) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let px = Math.round(xs[k]); px <= Math.round(xs[k + 1]); px++) {
        setPixel(buf, size, px, py, R, G, B, A);
      }
    }
  }
}

// ── Icon design: dark rounded-square bg + white location-pin mark ────────────
//    Scales automatically based on `size`.
function drawIcon(size) {
  const buf = createCanvas(size);
  const s   = size;

  // Background: rounded square fill via circle approach for each corner
  // We fill the whole square first, then clip corners
  // Fill entire canvas with teal #0d9488
  const BG_R = 13, BG_G = 148, BG_B = 136;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      setPixel(buf, s, x, y, BG_R, BG_G, BG_B, 255);
    }
  }

  // Rounded corners: erase pixels outside the rounded rect
  const radius = Math.round(s * 0.22);
  const corners = [
    [radius, radius],
    [s - 1 - radius, radius],
    [radius, s - 1 - radius],
    [s - 1 - radius, s - 1 - radius],
  ];
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const inCornerZone =
        (x < radius && y < radius) ||
        (x > s - 1 - radius && y < radius) ||
        (x < radius && y > s - 1 - radius) ||
        (x > s - 1 - radius && y > s - 1 - radius);
      if (inCornerZone) {
        const nearestCorner = corners.find(([cx, cy]) =>
          (x < s / 2 ? x < radius : x >= s - radius) &&
          (y < s / 2 ? y < radius : y >= s - radius)
        );
        if (nearestCorner) {
          const [cx, cy] = nearestCorner;
          const dx = x - cx, dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius + 0.5) {
            setPixel(buf, s, x, y, 0, 0, 0, 0);
          } else if (dist > radius - 0.5) {
            const alpha = Math.round((radius + 0.5 - dist) * 255);
            setPixel(buf, s, x, y, BG_R, BG_G, BG_B, alpha);
          }
        }
      }
    }
  }

  // Draw white location pin (✦ style)
  // Pin consists of: teardrop/circle head + triangle tail pointing down
  const WR = 255, WG = 255, WB = 255;
  const cx    = s / 2;
  const pinTop = s * 0.18;
  const headR  = s * 0.22;
  const headCy = pinTop + headR;

  // Outer teardrop/pin shape: filled path
  // We draw as a "circle on top + triangle below" union via per-pixel test
  const pinBottom = s * 0.82;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x - cx, dy = y - headCy;
      const inHead = dx * dx + dy * dy <= headR * headR + 0.5;

      // Triangle: x within ±(pinBottom-y)/(pinBottom-headCy)*headR for y > headCy
      const inTail = y > headCy && Math.abs(dx) <= headR * (pinBottom - y) / (pinBottom - headCy);

      if (inHead || inTail) {
        setPixel(buf, s, x, y, WR, WG, WB, 255);
      }
    }
  }

  // Anti-alias edges of pin by slightly softening the boundary
  // (simple: re-draw the outer circle with blend)
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x - cx, dy = y - headCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > headR - 0.5 && dist < headR + 1.0 && dy < 0) {
        const alpha = Math.round((headR + 0.5 - (dist - 0.5)) * 220);
        if (alpha < 255) setPixel(buf, s, x, y, WR, WG, WB, Math.max(0, alpha));
      }
    }
  }

  // Inner hole in pin head (hollow centre)
  const holeR = headR * 0.4;
  fillCircle(buf, s, cx, headCy, holeR, BG_R, BG_G, BG_B);

  return buf;
}

// ── PNG encoder ──────────────────────────────────────────────────────────────
function encodePNG(pixelBuf, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // rest = 0 (deflate, adaptive, non-interlaced)

  // Raw scanlines with filter-type 0 (None) prefix
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[(rowBytes + 1) * y] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const srcOff = (y * size + x) * 4;
      const dstOff = (rowBytes + 1) * y + 1 + x * 4;
      raw[dstOff]     = pixelBuf[srcOff];
      raw[dstOff + 1] = pixelBuf[srcOff + 1];
      raw[dstOff + 2] = pixelBuf[srcOff + 2];
      raw[dstOff + 3] = pixelBuf[srcOff + 3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const png    = encodePNG(pixels, size);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated. You can now load the extension in Chrome/Edge:');
console.log('  chrome://extensions → Enable Developer mode → Load unpacked → select this folder');
