#!/usr/bin/env node
// Generates PNG icons for the TravelPanel browser extension.
// Run: node create-icons.js
// Requires: Node.js ≥ 12 (uses built-in zlib + Buffer — no npm deps needed)

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── CRC32 ────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── PNG builder ──────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const lenBuf  = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc     = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf  = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(size, drawPixel) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const base = y * (size * 3 + 1);
    raw[base] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawPixel(x, y, size);
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── TravelPanel icon design ──────────────────────────────────────────────
//  Dark background (#0f172a) with indigo-to-violet gradient map-pin shape.

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function drawTravelPanelIcon(x, y, size) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r  = size / 2;

  // Normalised coords (-1..1)
  const nx = (x - cx) / r;
  const ny = (y - cy) / r;

  // Map-pin silhouette: circle top + teardrop bottom
  // Pin head: circle radius ~0.55 centred at (-0, -0.2)
  const headCy  = -0.15;
  const headR   = 0.58;
  const inHead  = (nx * nx + (ny - headCy) ** 2) <= headR * headR;

  // Teardrop tail: triangle from centre downward
  const tailWidth = 0.22;
  const tailTop   = headCy + headR * 0.6;
  const tailBot   = 0.88;
  let inTail = false;
  if (ny >= tailTop && ny <= tailBot) {
    const progress   = (ny - tailTop) / (tailBot - tailTop);
    const halfWidth  = tailWidth * (1 - progress);
    inTail = Math.abs(nx) <= halfWidth;
  }

  const inPin = inHead || inTail;

  if (!inPin) {
    // Background: dark slate
    return [0x0f, 0x17, 0x2a];
  }

  // Gradient: indigo #6366f1 → violet #8b5cf6, driven by position
  const t = Math.max(0, Math.min(1, (nx + ny + 2) / 4));
  return [
    lerp(0x63, 0x8b, t),
    lerp(0x66, 0x5c, t),
    lerp(0xf1, 0xf6, t),
  ];
}

// ─── Generate ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = makePNG(size, drawTravelPanelIcon);
  const out = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated successfully.');
