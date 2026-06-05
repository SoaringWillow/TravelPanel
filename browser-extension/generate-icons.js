#!/usr/bin/env node
/**
 * Generate browser extension icons using only Node.js built-ins.
 * Produces icons/icon16.png, icons/icon48.png, icons/icon128.png
 * with an indigo map-pin design matching the TravelPanel brand.
 *
 * Usage: node generate-icons.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── Pixel drawing helpers ─────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Anti-aliased circle distance: returns alpha 0..1 where 1 = inside
function circleAlpha(px, py, cx, cy, r, aa = 1.0) {
  const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return clamp((r + aa - d) / aa, 0, 1);
}

// ── PNG generation ────────────────────────────────────────────────────────────

function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // RGBA

  const s  = size;
  const cx = s / 2;

  // Pin geometry (proportional)
  const headCY = s * 0.40;
  const headR  = s * 0.24;
  const holeR  = headR * 0.44;

  // Background gradient colours
  const bg1 = [99, 102, 241];   // indigo-500
  const bg2 = [67, 56, 202];    // indigo-700

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const nx = x / s;  // 0..1
      const ny = y / s;

      // ── Background: rounded rect ────────────────────────────────────────
      const rr  = s * 0.22;
      const inX = x >= rr && x <= s - rr;
      const inY = y >= rr && y <= s - rr;
      const inCornerTL = Math.sqrt((x - rr) ** 2 + (y - rr) ** 2);
      const inCornerTR = Math.sqrt((x - (s - rr)) ** 2 + (y - rr) ** 2);
      const inCornerBL = Math.sqrt((x - rr) ** 2 + (y - (s - rr)) ** 2);
      const inCornerBR = Math.sqrt((x - (s - rr)) ** 2 + (y - (s - rr)) ** 2);

      const inRoundedRect =
        (inX && inY) ||
        (x < rr  && y < rr  && inCornerTL <= rr) ||
        (x > s - rr && y < rr  && inCornerTR <= rr) ||
        (x < rr  && y > s - rr && inCornerBL <= rr) ||
        (x > s - rr && y > s - rr && inCornerBR <= rr);

      if (!inRoundedRect) {
        pixels.fill(0, (y * s + x) * 4, (y * s + x) * 4 + 4);
        continue;
      }

      // Background gradient (top=bg1, bottom=bg2)
      const t   = ny;
      const bgR = Math.round(lerp(bg1[0], bg2[0], t));
      const bgG = Math.round(lerp(bg1[1], bg2[1], t));
      const bgB = Math.round(lerp(bg1[2], bg2[2], t));
      let [r, g, b, a] = [bgR, bgG, bgB, 255];

      // ── Map pin ──────────────────────────────────────────────────────────
      const pinHeadAlpha = circleAlpha(x, y, cx, headCY, headR, 1.0);
      const pinHoleAlpha = circleAlpha(x, y, cx, headCY, holeR, 0.8);

      // Tail: a narrow teardrop pointing downward
      const tailBottom = headCY + headR * 2.05;
      const halfWidthAt = (py) => headR * 0.52 * (1 - (py - headCY - headR * 0.4) / (tailBottom - headCY - headR * 0.4));
      const inTail = y > headCY + headR * 0.4 && y < tailBottom && Math.abs(x - cx) < halfWidthAt(y);

      if (pinHeadAlpha > 0 || inTail) {
        const blend = Math.max(pinHeadAlpha, inTail ? 1 : 0);
        // White pin
        r = Math.round(lerp(r, 255, blend));
        g = Math.round(lerp(g, 255, blend));
        b = Math.round(lerp(b, 255, blend));
      }

      // Hole in pin head (poke background colour through)
      if (pinHoleAlpha > 0) {
        r = Math.round(lerp(r, bgR, pinHoleAlpha));
        g = Math.round(lerp(g, bgG, pinHoleAlpha));
        b = Math.round(lerp(b, bgB, pinHoleAlpha));
      }

      const idx = (y * s + x) * 4;
      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  // ── Encode as PNG ─────────────────────────────────────────────────────────
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(size, 0);
  IHDR.writeUInt32BE(size, 4);
  IHDR[8]  = 8;  // bit depth
  IHDR[9]  = 6;  // color type: RGBA
  IHDR[10] = 0;  // compression
  IHDR[11] = 0;  // filter
  IHDR[12] = 0;  // interlace

  // Raw image data: prepend filter byte 0x00 per row
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter byte
    pixels.copy
      ? Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (1 + size * 4) + 1)
      : raw.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (1 + size * 4) + 1);
  }
  // Use Buffer.from(pixels) slice approach compatible with all Node versions
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + size * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', IHDR),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const size of [16, 48, 128]) {
  const png  = createIcon(size);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated. Load the browser-extension/ folder in Chrome as an unpacked extension.');
