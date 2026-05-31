#!/usr/bin/env node
// Generates icons/icon-{16,48,128}.png — no external dependencies required.
// Run: node generate-icons.js

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required for PNG chunk checksums) ─────────────────────────────────

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
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf    = Buffer.alloc(4);
  const crcBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBytes.length);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, dataBytes])));
  return Buffer.concat([lenBuf, typeBytes, dataBytes, crcBuf]);
}

// ── Smoothstep helper for anti-aliased circle edges ─────────────────────────

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── PNG generator ────────────────────────────────────────────────────────────
// Produces an RGBA PNG: indigo circle + white map-pin hole + transparent bg.

function makePNG(size, [r, g, b]) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes

  // IHDR: width, height, bit-depth=8, color-type=6 (RGBA)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const cx      = (size - 1) / 2;
  const cy      = (size - 1) / 2;
  const outerR  = size * 0.46;                 // circle radius
  const holeR   = size * 0.16;                 // white center-hole radius
  const holeCY  = cy - outerR * 0.14;          // hole is slightly above center (pin look)

  // Row = 1 filter byte + 4 bytes per pixel (RGBA)
  const rowBytes = 1 + size * 4;
  const raw      = Buffer.alloc(size * rowBytes, 0);

  for (let y = 0; y < size; y++) {
    const rOff = y * rowBytes;
    raw[rOff] = 0; // filter type: None

    for (let x = 0; x < size; x++) {
      const px  = rOff + 1 + x * 4;
      const dx  = x - cx;
      const dy  = y - cy;
      const dH  = y - holeCY;
      const dist     = Math.sqrt(dx * dx + dy * dy);
      const distHole = Math.sqrt(dx * dx + dH * dH);

      // Alpha for the outer circle (anti-aliased edge)
      const circleAlpha = 1 - smoothstep(outerR - 0.5, outerR + 0.5, dist);
      if (circleAlpha <= 0) continue; // fully transparent — skip

      // Blend white hole over indigo background
      const holeBlend = 1 - smoothstep(holeR - 0.5, holeR + 0.5, distHole);

      raw[px]     = Math.round(r + (255 - r) * holeBlend);  // R
      raw[px + 1] = Math.round(g + (255 - g) * holeBlend);  // G
      raw[px + 2] = Math.round(b + (255 - b) * holeBlend);  // B
      raw[px + 3] = Math.round(255 * circleAlpha);           // A
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate icons ───────────────────────────────────────────────────────────

const INDIGO    = [99, 102, 241]; // #6366f1
const iconsDir  = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png  = makePNG(size, INDIGO);
  const file = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`  icons/icon-${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated. Load the extension at chrome://extensions/\n');
