#!/usr/bin/env node
/**
 * Generates solid-color PNG icons for the TravelPanel browser extension.
 * Uses only built-in Node.js modules (zlib, fs, path) — no dependencies.
 *
 * Run: node create-icons.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required by PNG spec) ───────────────────────────────────────────

let _crcTable;
function buildCrcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}

function crc32(buf) {
  const table = buildCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG chunk builder ──────────────────────────────────────────────────────

function makeChunk(type, data) {
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const check   = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf  = Buffer.alloc(4);
  crcBuf.writeUInt32BE(check, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── PNG: solid colour, with rounded corners (alpha channel) ──────────────

function solidRoundedPNG(size, r, g, b, radius) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR — RGBA colour type (6)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 6; // colour type: RGBA
  // bytes 10,11,12 = 0 (compression, filter, interlace)
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + 4 bytes per pixel (RGBA)
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(size * rowBytes, 0);

  const cx = size / 2, cy = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // filter: None

    for (let x = 0; x < size; x++) {
      const pixOffset = rowOffset + 1 + x * 4;
      // Rounded-corner alpha: point is inside the rounded rect?
      const dx = Math.max(0, Math.abs(x - cx + 0.5) - (size / 2 - radius));
      const dy = Math.max(0, Math.abs(y - cy + 0.5) - (size / 2 - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Anti-alias the edge
      const alpha = dist <= radius ? 255 : dist <= radius + 1 ? Math.round(255 * (radius + 1 - dist)) : 0;

      raw[pixOffset]     = r;
      raw[pixOffset + 1] = g;
      raw[pixOffset + 2] = b;
      raw[pixOffset + 3] = alpha;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIG, ihdr, idat, iend]);
}

// ── Generate icons ─────────────────────────────────────────────────────────

// TravelPanel indigo: #6366F1 = rgb(99, 102, 241)
const R = 99, G = 102, B = 241;

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const sizes = [
  { size: 16,  radius: 3  },
  { size: 48,  radius: 10 },
  { size: 128, radius: 24 },
];

for (const { size, radius } of sizes) {
  const png = solidRoundedPNG(size, R, G, B, radius);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}

console.log('\nDone! Icons written to ./icons/');
