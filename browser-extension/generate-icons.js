#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension.
 * Run: node generate-icons.js
 * No external dependencies required.
 */
'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c;
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
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf   = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ─── Pixel renderer ───────────────────────────────────────────────────────────

/**
 * Renders a travel map / compass icon at the given size.
 * Returns an RGBA pixel buffer (width * height * 4 bytes).
 */
function renderIcon(size) {
  const px = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 1;

  function set(x, y, red, green, blue, alpha = 255) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i]     = red;
    px[i + 1] = green;
    px[i + 2] = blue;
    px[i + 3] = alpha;
  }

  // Background circle — indigo #6366f1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        // Slight gradient: lighter at top-left
        const brightness = 1 - 0.15 * (dy / size);
        set(x, y,
          Math.round(99  * brightness),
          Math.round(102 * brightness),
          Math.round(241 * brightness),
        );
      }
    }
  }

  // Map pin shape — white
  const pinRadius = size * 0.22;
  const pinCX = cx;
  const pinCY = cy - size * 0.08;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - pinCX + 0.5;
      const dy = y - pinCY + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= pinRadius) {
        set(x, y, 255, 255, 255);
      }
    }
  }

  // Pin tail — triangle pointing down
  const tailTop    = pinCY + pinRadius * 0.6;
  const tailBottom = cy + size * 0.32;
  const tailWidth  = pinRadius * 0.5;

  for (let y = Math.floor(tailTop); y <= Math.ceil(tailBottom); y++) {
    const t = (y - tailTop) / (tailBottom - tailTop);
    const halfW = tailWidth * (1 - t);
    for (let x = Math.floor(pinCX - halfW); x <= Math.ceil(pinCX + halfW); x++) {
      set(x, y, 255, 255, 255);
    }
  }

  // Inner dot on pin — indigo
  const dotR = pinRadius * 0.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - pinCX + 0.5;
      const dy = y - pinCY + 0.5;
      if (Math.sqrt(dx * dx + dy * dy) <= dotR) {
        set(x, y, 99, 102, 241);
      }
    }
  }

  return px;
}

// ─── PNG encoder ──────────────────────────────────────────────────────────────

function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bit-depth=8, color-type=6 (RGBA)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines: filter byte (0) + RGBA row
  const rawSize = size * (1 + size * 4);
  const raw = Buffer.alloc(rawSize);
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // None filter
    for (let x = 0; x < size; x++) {
      const srcOff = (y * size + x) * 4;
      const dstOff = y * (1 + size * 4) + 1 + x * 4;
      raw[dstOff]     = pixels[srcOff];
      raw[dstOff + 1] = pixels[srcOff + 1];
      raw[dstOff + 2] = pixels[srcOff + 2];
      raw[dstOff + 3] = pixels[srcOff + 3];
    }
  }

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size);
  const png    = encodePNG(size, pixels);
  const dest   = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`Generated ${dest} (${png.length} bytes)`);
}

console.log('\nDone! Load the browser-extension/ folder in chrome://extensions (Developer mode).');
