#!/usr/bin/env node
// Generates PNG icon files for the TravelPanel Clipper extension.
// Run from the browser-extension directory: node scripts/generate-icons.js
// No external dependencies — uses built-in zlib only.

const { deflateSync } = require('zlib');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

// ── Colors ──────────────────────────────────────────────────────────────────

const INDIGO  = { r: 99,  g: 102, b: 241, a: 255 };
const INDIGO2 = { r: 67,  g: 56,  b: 202, a: 255 }; // darker indigo for gradient effect
const WHITE   = { r: 255, g: 255, b: 255, a: 255 };
const TRANS   = null;

// ── PNG Encoder ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf  = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const body    = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf  = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(body));
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function encodePNG(size, pixels) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8);       // bit depth
  ihdr.writeUInt8(6, 9);       // RGBA
  ihdr.writeUInt8(0, 10);      // deflate
  ihdr.writeUInt8(0, 11);      // no filter
  ihdr.writeUInt8(0, 12);      // no interlace

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4);
    row[0] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const px = pixels[y * size + x];
      const i  = 1 + x * 4;
      if (px === null) {
        row[i] = row[i+1] = row[i+2] = row[i+3] = 0;
      } else {
        row[i] = px.r; row[i+1] = px.g; row[i+2] = px.b; row[i+3] = px.a ?? 255;
      }
    }
    rows.push(row);
  }

  const compressed = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([PNG_SIG, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Rasteriser helpers ────────────────────────────────────────────────────────

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Blend color A over color B (alpha compositing)
function blend(fg, bg) {
  if (!fg) return bg;
  const a = (fg.a ?? 255) / 255;
  return {
    r: Math.round(fg.r * a + (bg?.r ?? 0) * (1 - a)),
    g: Math.round(fg.g * a + (bg?.g ?? 0) * (1 - a)),
    b: Math.round(fg.b * a + (bg?.b ?? 0) * (1 - a)),
    a: Math.round(255 * (a + ((bg?.a ?? 0) / 255) * (1 - a))),
  };
}

// Anti-aliased circle fill (returns coverage 0-1 for a pixel at (px,py))
function circleCoverage(px, py, cx, cy, r) {
  const d = dist(px + 0.5, py + 0.5, cx, cy);
  if (d <= r - 0.7) return 1;
  if (d >= r + 0.7) return 0;
  return Math.max(0, Math.min(1, (r + 0.7 - d) / 1.4));
}

// ── Icon renderer ─────────────────────────────────────────────────────────────

function renderIcon(size) {
  const pixels = new Array(size * size).fill(null);

  const S = size;
  const cx = S * 0.5;
  const cy = S * 0.5;

  // Helper: set pixel with alpha
  function setPixel(x, y, color, alpha = 1) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= S || yi < 0 || yi >= S) return;
    const c = { ...color, a: Math.round((color.a ?? 255) * alpha) };
    pixels[yi * S + xi] = blend(c, pixels[yi * S + xi]);
  }

  // ── Background: rounded square ────────────────────────────────────────────
  const pad    = S * 0.045;
  const left   = pad;
  const right  = S - 1 - pad;
  const top    = pad;
  const bottom = S - 1 - pad;
  const rCorner = S * 0.22;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (x < left || x > right || y < top || y > bottom) continue;

      const inTL = x < left + rCorner && y < top + rCorner;
      const inTR = x > right - rCorner && y < top + rCorner;
      const inBL = x < left + rCorner && y > bottom - rCorner;
      const inBR = x > right - rCorner && y > bottom - rCorner;

      let coverage = 1;
      if (inTL) coverage = circleCoverage(x, y, left + rCorner, top + rCorner, rCorner);
      else if (inTR) coverage = circleCoverage(x, y, right - rCorner, top + rCorner, rCorner);
      else if (inBL) coverage = circleCoverage(x, y, left + rCorner, bottom - rCorner, rCorner);
      else if (inBR) coverage = circleCoverage(x, y, right - rCorner, bottom - rCorner, rCorner);

      if (coverage <= 0) continue;

      // Vertical gradient: lighter indigo at top, darker at bottom
      const t = y / S;
      const r = Math.round(INDIGO.r + (INDIGO2.r - INDIGO.r) * t);
      const g = Math.round(INDIGO.g + (INDIGO2.g - INDIGO.g) * t);
      const b = Math.round(INDIGO.b + (INDIGO2.b - INDIGO.b) * t);
      setPixel(x, y, { r, g, b, a: 255 }, coverage);
    }
  }

  // ── Map pin icon in white ─────────────────────────────────────────────────
  // Pin head: large circle in upper-center
  // Pin tail: teardrop narrowing downward
  // Pin hole: smaller circle cut out of head center

  const pinCx   = S * 0.500;
  const pinHeadCy = S * 0.380;
  const pinHeadR  = S * 0.200;
  const pinTailBottom = S * 0.760;
  const pinHoleR  = S * 0.088;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Head circle
      const headCov = circleCoverage(x, y, pinCx, pinHeadCy, pinHeadR);
      if (headCov > 0) {
        // Cut hole
        const holeCov = circleCoverage(x, y, pinCx, pinHeadCy, pinHoleR);
        const finalCov = headCov * (1 - holeCov);
        if (finalCov > 0.02) setPixel(x, y, WHITE, finalCov);
        continue;
      }

      // Tail (teardrop): starts at bottom of head circle, narrows to a point
      const tailTop = pinHeadCy + pinHeadR * 0.55;
      if (y >= tailTop && y <= pinTailBottom) {
        const t = (y - tailTop) / (pinTailBottom - tailTop); // 0=top, 1=tip
        const halfW = pinHeadR * 0.72 * (1 - t);
        // Soft edges on tail sides
        const edgeDist = halfW - Math.abs(x - pinCx);
        if (edgeDist >= 0) {
          const alpha = Math.min(1, edgeDist + 0.5); // AA at edges
          setPixel(x, y, WHITE, Math.min(1, alpha));
        }
      }
    }
  }

  return pixels;
}

// ── Generate files ─────────────────────────────────────────────────────────────

const outDir = join(__dirname, '..', 'icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels  = renderIcon(size);
  const png     = encodePNG(size, pixels);
  const outPath = join(outDir, `icon${size}.png`);
  writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${size}×${size})`);
}

console.log('\nAll icons generated.');
