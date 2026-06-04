#!/usr/bin/env node
// Generates PNG extension icons using only Node.js built-ins (no deps).
// Produces solid-indigo (#4F46E5) icons with a white plane symbol drawn in pixels.
// Run: node generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const INDIGO = { r: 79, g: 70, b: 229 };
const WHITE  = { r: 255, g: 255, b: 255 };

// ─── CRC32 (required for PNG chunks) ─────────────────────────────────────────

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const c  = Buffer.alloc(4);
  c.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, c]);
}

function encodePNG(pixels, width, height) {
  // Signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data (filter byte 0 = None per row + RGB pixels)
  const raw = Buffer.alloc(height * (1 + width * 3));
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const { r, g, b } = pixels[y][x];
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

function renderIcon(size) {
  // Fill with indigo background with rounded corners
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const r = Math.round(size * 0.18); // corner radius ~18%
      // Simple rounded-rect test
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      if (dx < r && dy < r) {
        const dist = Math.hypot(dx - r, dy - r);
        if (dist > r) return { r: 255, g: 255, b: 255 }; // outside → transparent (use white as bg)
      }
      return { ...INDIGO };
    })
  );

  // Draw a simple "✈" shape as pixel art at the appropriate scale
  // We'll approximate a plane silhouette with simple geometry
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 128;

  function fillPixel(x, y) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
      pixels[iy][ix] = { ...WHITE };
    }
  }

  function fillRect(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        fillPixel(x + dx, y + dy);
      }
    }
  }

  function fillDisk(x, y, r) {
    const ir = Math.ceil(r);
    for (let dy = -ir; dy <= ir; dy++) {
      for (let dx = -ir; dx <= ir; dx++) {
        if (dx*dx + dy*dy <= r*r) fillPixel(x + dx, y + dy);
      }
    }
  }

  // Plane body (fuselage)
  const bodyW = Math.max(1, Math.round(64 * scale));
  const bodyH = Math.max(1, Math.round(10 * scale));
  fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);

  // Nose cone
  fillDisk(cx + bodyW / 2 - 1, cy, Math.max(1, Math.round(5 * scale)));

  // Main wings
  const wingW = Math.max(1, Math.round(40 * scale));
  const wingH = Math.max(1, Math.round(6 * scale));
  fillRect(cx - wingW / 2, cy - bodyH / 2 - wingH, wingW, wingH * 2 + bodyH);

  // Tail fin
  const tailH = Math.max(1, Math.round(14 * scale));
  const tailW = Math.max(1, Math.round(12 * scale));
  fillRect(cx - bodyW / 2, cy - bodyH / 2 - tailH + 1, tailW, tailH);

  return pixels;
}

// ─── Generate files ───────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size);
  const png = encodePNG(pixels, size, size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✅ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nDone! Load browser-extension/ as an unpacked extension in Chrome.');
