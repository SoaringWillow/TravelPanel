#!/usr/bin/env node
// Generates PWA + iOS icons for TravelPanel using only Node built-ins (no canvas/sharp).
// Produces: solid indigo PNG icons + an SVG icon with gradient + airplane emoji.
//
// Usage: node scripts/generate-icons.js
//        (or: npm run generate-icons)

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── TravelPanel brand colors ─────────────────────────────────────────────────
const INDIGO  = [99,  102, 241]; // #6366F1
const PURPLE  = [139, 92,  246]; // #8B5CF6
const WHITE   = [255, 255, 255];

// ─── Pure-JS PNG encoder ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBytes.length, 0);
  const crcInput  = Buffer.concat([typeBytes, dataBytes]);
  const crcBuf    = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

// Draw a filled circle centered at (cx, cy) with given radius on pixelData
function drawCircle(pixels, w, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.max(0, cy - r); y <= Math.min(w - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx*dx + dy*dy <= r2) {
        const off = (y * w + x) * 3;
        pixels[off]     = color[0];
        pixels[off + 1] = color[1];
        pixels[off + 2] = color[2];
      }
    }
  }
}

// Draw filled rect
function drawRect(pixels, w, x0, y0, rw, rh, color) {
  for (let y = y0; y < y0 + rh; y++) {
    for (let x = x0; x < x0 + rw; x++) {
      if (x < 0 || y < 0 || x >= w || y >= w) continue;
      const off = (y * w + x) * 3;
      pixels[off]     = color[0];
      pixels[off + 1] = color[1];
      pixels[off + 2] = color[2];
    }
  }
}

// Generate a PNG with an indigo background and a minimal "T" glyph or plane shape
function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 3);

  // ── Fill background with vertical gradient (INDIGO → PURPLE) ──
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(INDIGO[0] + t * (PURPLE[0] - INDIGO[0]));
    const g = Math.round(INDIGO[1] + t * (PURPLE[1] - INDIGO[1]));
    const b = Math.round(INDIGO[2] + t * (PURPLE[2] - INDIGO[2]));
    for (let x = 0; x < size; x++) {
      const off = (y * size + x) * 3;
      pixels[off]     = r;
      pixels[off + 1] = g;
      pixels[off + 2] = b;
    }
  }

  // ── Draw a simplified airplane shape (white) ──
  // Scaled to size: all coordinates as fractions of the icon size
  const s = size / 192; // scale factor

  // Fuselage: diagonal bar from bottom-left to top-right
  const fuselageW = Math.round(10 * s);
  const fuselageL = Math.round(100 * s);
  for (let i = 0; i < fuselageL; i++) {
    const x = Math.round(46 * s + i);
    const y = Math.round(140 * s - i);
    for (let dy = -fuselageW; dy <= fuselageW; dy++) {
      for (let dx = -fuselageW; dx <= fuselageW; dx++) {
        const px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        const off = (py * size + px) * 3;
        pixels[off] = pixels[off+1] = pixels[off+2] = 255;
      }
    }
  }

  // Main wing: wide triangle
  const wingCx = Math.round(96 * s), wingCy = Math.round(96 * s);
  const wingW  = Math.round(72 * s), wingH  = Math.round(28 * s);
  for (let dy = -wingH; dy <= wingH; dy++) {
    const span = Math.round(wingW * (1 - Math.abs(dy) / wingH));
    for (let dx = -span; dx <= span; dx++) {
      const px = wingCx + dx, py = wingCy + dy;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const off = (py * size + px) * 3;
      pixels[off] = pixels[off+1] = pixels[off+2] = 255;
    }
  }

  // Tail fin: smaller triangle
  const tailCx = Math.round(62 * s), tailCy = Math.round(124 * s);
  const tailW  = Math.round(28 * s), tailH  = Math.round(14 * s);
  for (let dy = -tailH; dy <= tailH; dy++) {
    const span = Math.round(tailW * (1 - Math.abs(dy) / tailH));
    for (let dx = -span; dx <= span; dx++) {
      const px = tailCx + dx + Math.round(dy * 0.5), py = tailCy + dy;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const off = (py * size + px) * 3;
      pixels[off] = pixels[off+1] = pixels[off+2] = 255;
    }
  }

  // ── Encode to PNG ──
  const rowSize = size * 3;
  const rawRows = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    rawRows[y * (rowSize + 1)] = 0; // filter byte: none
    pixels.copy(rawRows, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = zlib.deflateSync(rawRows, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size,  0);
  ihdr.writeUInt32BE(size,  4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filter
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── SVG icon (used for web/manifest — gradient + scalable plane) ─────────────

function createSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="512" height="512" rx="110"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bg)"/>
  <g clip-path="url(#round)" transform="translate(108,108) scale(1.16)">
    <!-- Airplane shape in white -->
    <!-- Fuselage -->
    <rect x="118" y="80" width="16" height="100" rx="8" fill="white"
          transform="rotate(-45 126 130)"/>
    <!-- Main wing -->
    <polygon points="80,110 200,80 200,110 80,140" fill="white" opacity="0.95"/>
    <!-- Tail fin -->
    <polygon points="88,155 136,130 136,155" fill="white" opacity="0.9"/>
    <!-- Nose -->
    <circle cx="190" cy="80" r="12" fill="white"/>
  </g>
</svg>`;
}

// ─── Write files ──────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '..', 'public');

const sizes = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png',      size: 32  },
];

for (const { name, size } of sizes) {
  const buf  = createIcon(size);
  const dest = path.join(publicDir, name);
  fs.writeFileSync(dest, buf);
  console.log(`✓ ${name} (${size}×${size}) — ${(buf.length / 1024).toFixed(1)} KB`);
}

const svgPath = path.join(publicDir, 'icon.svg');
fs.writeFileSync(svgPath, createSVG());
console.log('✓ icon.svg');

console.log('\nDone. Icons written to public/');
