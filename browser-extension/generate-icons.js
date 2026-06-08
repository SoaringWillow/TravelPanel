#!/usr/bin/env node
// Generates PNG icon files for the browser extension.
// Run: node generate-icons.js
// Outputs: icons/icon16.png, icons/icon32.png, icons/icon48.png, icons/icon128.png

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC-32 used by PNG chunks
function makeCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = makeCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// Draw the icon: indigo background with a white map-pin shape
function drawIcon(size) {
  // RGBA pixel buffer (4 bytes per pixel)
  const pixels = Buffer.alloc(size * size * 4);

  const bg = { r: 0x63, g: 0x66, b: 0xf1, a: 255 };   // #6366f1 indigo
  const fg = { r: 255, g: 255, b: 255, a: 255 };        // white

  // Fill with bg
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = bg.r;
    pixels[i * 4 + 1] = bg.g;
    pixels[i * 4 + 2] = bg.b;
    pixels[i * 4 + 3] = bg.a;
  }

  // Draw a simple map-pin shape (filled circle + stem) scaled to icon size
  const cx = size / 2;
  const r  = size * 0.30;     // circle radius
  const cy = size * 0.38;     // circle center y (slightly above center)

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (Math.round(y) * size + Math.round(x)) * 4;
    pixels[idx]     = color.r;
    pixels[idx + 1] = color.g;
    pixels[idx + 2] = color.b;
    pixels[idx + 3] = color.a;
  }

  // Filled circle
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r * r) {
        setPixel(px, py, fg);
      }
    }
  }

  // Stem (triangle pointing down, from bottom of circle to bottom of icon)
  const stemTop    = cy + r * 0.6;
  const stemBottom = size * 0.90;
  const stemHalfW  = r * 0.32;

  for (let py = Math.ceil(stemTop); py <= Math.floor(stemBottom); py++) {
    const t = (py - stemTop) / (stemBottom - stemTop);          // 0→1
    const halfW = stemHalfW * (1 - t);                          // narrows to point
    for (let px = Math.ceil(cx - halfW); px <= Math.floor(cx + halfW); px++) {
      setPixel(px, py, fg);
    }
  }

  // Small indigo dot inside circle (hole)
  const dotR = r * 0.30;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= dotR * dotR) {
        setPixel(px, py, bg);
      }
    }
  }

  return pixels;
}

function makePNG(size) {
  const pixels = drawIcon(size);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]  = 8;  // bit depth
  ihdrData[9]  = 6;  // color type RGBA
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  // Raw scanlines: filter byte (0 = None) + RGBA row
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;  // filter None
    pixels.copy(raw, y * rowLen + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = makePNG(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}
console.log('Done.');
