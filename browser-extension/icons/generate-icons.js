#!/usr/bin/env node
// Run: node icons/generate-icons.js
// Generates icon16.png, icon32.png, icon48.png, icon128.png in this directory

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, c]);
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * rowBytes + 1 + x * 4;
      raw[d] = pixels[s]; raw[d+1] = pixels[s+1];
      raw[d+2] = pixels[s+2]; raw[d+3] = pixels[s+3];
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ── Icon drawing ──────────────────────────────────────────────────────────────
// Draws a location-pin icon on an RGBA pixel buffer.
//   Background: indigo circle (#4f46e5)
//   Pin: white teardrop shape centered in the circle
//   Hole: small indigo circle (inner dot of pin)

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // transparent default

  const cx = size / 2;
  const cy = size / 2;
  const bgR = size * 0.46;          // background circle radius

  const pinHeadCy = size * 0.38;    // pin head circle center Y
  const pinHeadR  = size * 0.22;    // pin head circle radius
  const holeR     = size * 0.085;   // inner hole radius
  const tipY      = size * 0.82;    // tip of pin tail

  const INDIGO = [79, 70, 229, 255];
  const WHITE  = [255, 255, 255, 255];

  function setPixel(x, y, [r, g, b, a]) {
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const distBg = Math.sqrt(dx * dx + dy * dy);

      // Outside background circle → transparent
      if (distBg > bgR) continue;

      // Inside background circle → indigo
      setPixel(x, y, INDIGO);

      // Pin head circle
      const dhx = x - cx, dhy = y - pinHeadCy;
      const distHead = Math.sqrt(dhx * dhx + dhy * dhy);

      if (distHead <= pinHeadR) {
        setPixel(x, y, distHead <= holeR ? INDIGO : WHITE);
        continue;
      }

      // Pin tail: teardrop below head center
      if (y > pinHeadCy && y <= tipY) {
        const t = (y - pinHeadCy) / (tipY - pinHeadCy);
        const halfW = pinHeadR * (1 - t * t);
        if (Math.abs(x - cx) <= halfW) {
          setPixel(x, y, WHITE);
        }
      }
    }
  }

  return pixels;
}

// ── Generate all sizes ────────────────────────────────────────────────────────
const sizes = [16, 32, 48, 128];
const dir = __dirname;

for (const size of sizes) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, size, pixels);
  const outPath = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icon${size}.png (${png.length} bytes)`);
}

console.log('\nAll icons generated.');
