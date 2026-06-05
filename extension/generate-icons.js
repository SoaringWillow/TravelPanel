/**
 * Generates PNG icon files for the TravelPanel Clipper extension.
 * Run from the extension directory: node generate-icons.js
 *
 * No external dependencies required — uses only Node.js built-ins.
 */

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG chunk builder ────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

/**
 * Renders a size×size RGBA pixel buffer with:
 *   - Indigo (#6366F1) rounded-rect background
 *   - White "T" letterform
 */
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const [bgR, bgG, bgB] = [99, 102, 241]; // #6366F1
  const cornerRadius = Math.round(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle mask (anti-aliased at corners)
      const dx = Math.max(cornerRadius - x, x - (size - 1 - cornerRadius), 0);
      const dy = Math.max(cornerRadius - y, y - (size - 1 - cornerRadius), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > cornerRadius + 0.5) {
        // Outside rounded corner — transparent
        pixels[idx + 3] = 0;
        continue;
      }

      const alpha = dist > cornerRadius - 0.5
        ? Math.round(255 * (cornerRadius + 0.5 - dist))
        : 255;

      // "T" letterform (normalized 0–1 space)
      const nx = x / size;
      const ny = y / size;
      const inHBar = ny >= 0.20 && ny <= 0.36 && nx >= 0.15 && nx <= 0.85;
      const inVBar = nx >= 0.41 && nx <= 0.59 && ny >= 0.20 && ny <= 0.82;
      const inT = inHBar || inVBar;

      if (inT) {
        pixels[idx]     = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
      } else {
        pixels[idx]     = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgB;
      }
      pixels[idx + 3] = alpha;
    }
  }
  return pixels;
}

// ─── PNG encoder ──────────────────────────────────────────────────────────────

function encodePNG(size, pixels) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(6, 9);  // RGBA colour type
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  // Build raw scanlines (filter byte = 0 per row)
  const raw = Buffer.allocUnsafe(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 4);
    raw[rowOffset] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = rowOffset + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const ICON_SIZES = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of ICON_SIZES) {
  const pixels = renderIcon(size);
  const png = encodePNG(size, pixels);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon-${size}.png  (${png.length} bytes)`);
}

console.log('\nDone! Icons written to ./icons/');
