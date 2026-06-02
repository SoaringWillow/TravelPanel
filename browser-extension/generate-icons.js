#!/usr/bin/env node
'use strict';

/**
 * Generates PNG icon files for the TravelPanel browser extension.
 * Uses Node.js built-ins only (no external dependencies).
 * Run: node generate-icons.js
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 implementation ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────────

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len  = uint32BE(data.length);
  const body = Buffer.concat([typeBytes, data]);
  const checksum = uint32BE(crc32(body));
  return Buffer.concat([len, body, checksum]);
}

function buildPNG(width, height, drawFn) {
  // RGBA pixel buffer
  const pixels = Buffer.alloc(width * height * 4, 0);
  drawFn(pixels, width, height);

  // Build raw image data: filter byte (0) + RGBA row
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // No filter
    pixels.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }
  const rawData   = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG sig
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon draw function ────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function setPixel(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  buf[i]   = r;
  buf[i+1] = g;
  buf[i+2] = b;
  buf[i+3] = a;
}

function drawIcon(buf, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r  = w / 2;

  // Gradient: top-left indigo (#4338CA) → bottom-right violet (#818CF8)
  const c0 = [0x43, 0x38, 0xCA]; // #4338CA
  const c1 = [0x81, 0x8C, 0xF8]; // #818CF8

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;

      // Rounded square mask (superellipse approximation with exponent 4)
      const rx = w * 0.44;
      const ry = h * 0.44;
      const q  = Math.pow(Math.abs(dx / rx), 4) + Math.pow(Math.abs(dy / ry), 4);

      if (q > 1) {
        setPixel(buf, w, x, y, 0, 0, 0, 0); // transparent
        continue;
      }

      // Anti-alias at edge
      const alpha = q > 0.9 ? Math.round(255 * (1 - (q - 0.9) / 0.1)) : 255;

      // Diagonal gradient (top-left → bottom-right)
      const t = (x / w + y / h) / 2;
      const pr = Math.round(lerp(c0[0], c1[0], t));
      const pg = Math.round(lerp(c0[1], c1[1], t));
      const pb = Math.round(lerp(c0[2], c1[2], t));

      setPixel(buf, w, x, y, pr, pg, pb, alpha);
    }
  }

  // Draw a simple airplane silhouette in white
  drawAirplane(buf, w, h);
}

function drawAirplane(buf, w, h) {
  // Scale factor
  const s = w / 48;

  // Draw white pixels for airplane shape centered in icon
  // We'll use a simplified approach: fill a polygon approximation

  function fill(x0, y0, x1, y1) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (x >= 0 && y >= 0 && x < w && y < h) {
          setPixel(buf, w, x, y, 255, 255, 255, 230);
        }
      }
    }
  }

  const cx = Math.round(w * 0.5);
  const cy = Math.round(h * 0.5);

  // Fuselage (vertical rectangle, slightly tilted via skewed fill)
  const fw = Math.max(2, Math.round(s * 4));
  const fh = Math.max(6, Math.round(s * 24));
  const tiltX = Math.round(s * 4); // tilt amount (skew right)

  for (let dy = -Math.floor(fh / 2); dy <= Math.floor(fh / 2); dy++) {
    // Apply tilt: as we go up (negative dy), shift right
    const tilt = Math.round(tiltX * (-dy) / fh);
    for (let dx = -Math.floor(fw / 2); dx <= Math.floor(fw / 2); dx++) {
      const px = cx + dx + tilt;
      const py = cy + dy;
      if (px >= 0 && py >= 0 && px < w && py < h) {
        setPixel(buf, w, px, py, 255, 255, 255, 240);
      }
    }
  }

  // Wings (horizontal triangles)
  const wingW = Math.round(s * 16);
  const wingH = Math.round(s * 5);
  const wingY = cy + Math.round(s * 2);
  const wingTilt = Math.round(tiltX * (-Math.round(s*2)) / fh);

  // Left wing
  for (let dy = 0; dy < wingH; dy++) {
    const span = Math.round(wingW * (1 - dy / wingH));
    for (let dx = -span; dx <= 0; dx++) {
      const px = cx + wingTilt + dx;
      const py = wingY + dy;
      if (px >= 0 && py >= 0 && px < w && py < h) {
        setPixel(buf, w, px, py, 255, 255, 255, 210);
      }
    }
  }

  // Right wing
  for (let dy = 0; dy < wingH; dy++) {
    const span = Math.round(wingW * (1 - dy / wingH));
    for (let dx = 0; dx <= span; dx++) {
      const px = cx + wingTilt + dx;
      const py = wingY + dy;
      if (px >= 0 && py >= 0 && px < w && py < h) {
        setPixel(buf, w, px, py, 255, 255, 255, 210);
      }
    }
  }
}

// ── Generate icons ────────────────────────────────────────────────────────────

const SIZES = [16, 32, 48, 128];
const outDir = path.join(__dirname, 'icons');

for (const size of SIZES) {
  const png  = buildPNG(size, size, drawIcon);
  const dest = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}

console.log('\nDone. Icons written to browser-extension/icons/');
