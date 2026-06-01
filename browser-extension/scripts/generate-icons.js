#!/usr/bin/env node
// Pure Node.js PNG icon generator — no npm deps required
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(4 + 4 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(combined), 8 + data.length);
  return out;
}

// ── PNG writer ─────────────────────────────────────────────────────────────
function makePNG(pixels, w, h) {
  // pixels: Uint8Array of RGBA values, row-major
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter=adaptive
  ihdrData[12] = 0; // no interlace
  const ihdr = chunk('IHDR', ihdrData);

  const rawRows = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawRows[y * (1 + w * 4)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const src  = (y * w + x) * 4;
      const dest = y * (1 + w * 4) + 1 + x * 4;
      rawRows[dest]     = pixels[src];
      rawRows[dest + 1] = pixels[src + 1];
      rawRows[dest + 2] = pixels[src + 2];
      rawRows[dest + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(rawRows);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function setPixel(pixels, w, x, y, r, g, b, a) {
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const i = (y * w + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
}

function fillCircle(pixels, w, cx, cy, radius, r, g, b, a) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        const aa = dist > radius - 1 ? Math.round((radius - dist) * 255) : a;
        setPixel(pixels, w, x, y, r, g, b, aa);
      }
    }
  }
}

function fillRect(pixels, w, x1, y1, x2, y2, r, g, b, a) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      setPixel(pixels, w, x, y, r, g, b, a);
}

// ── Icon design ─────────────────────────────────────────────────────────────
// TravelPanel icon: deep navy rounded square + white map-pin + amber accent

function drawIcon(size) {
  const pix = new Uint8Array(size * size * 4); // starts transparent

  const s = size / 128; // scale factor
  const r = Math.round(size * 0.18); // corner radius

  // Background: deep indigo #1e293b → fill the whole square first, then mask
  const bg = { r: 15, g: 23, b: 42 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopLeft     = x < r && y < r && Math.sqrt((x-r)**2+(y-r)**2) > r;
      const inTopRight    = x >= size-r && y < r && Math.sqrt((x-(size-r))**2+(y-r)**2) > r;
      const inBotLeft     = x < r && y >= size-r && Math.sqrt((x-r)**2+(y-(size-r))**2) > r;
      const inBotRight    = x >= size-r && y >= size-r && Math.sqrt((x-(size-r))**2+(y-(size-r))**2) > r;
      if (!inTopLeft && !inTopRight && !inBotLeft && !inBotRight) {
        setPixel(pix, size, x, y, bg.r, bg.g, bg.b, 255);
      }
    }
  }

  // Map pin body (teardrop)
  const cx  = size * 0.5;
  const py  = size * 0.28; // pin top
  const pinR = size * 0.22;
  // Pin circle
  fillCircle(pix, size, cx, py + pinR, pinR, 255, 255, 255, 255);
  // Pin tip triangle
  const tipY = size * 0.72;
  for (let y = Math.round(py + pinR); y <= Math.round(tipY); y++) {
    const t    = (y - (py + pinR)) / (tipY - (py + pinR));
    const halfW = Math.round(pinR * (1 - t) + 1);
    for (let x = Math.round(cx - halfW); x <= Math.round(cx + halfW); x++)
      setPixel(pix, size, x, y, 255, 255, 255, 255);
  }

  // Inner circle (amber accent) #f59e0b
  const innerR = pinR * 0.48;
  fillCircle(pix, size, cx, py + pinR, innerR, 245, 158, 11, 255);

  return pix;
}

// ── Generate files ─────────────────────────────────────────────────────────
const sizes  = [16, 48, 128];
const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const sz of sizes) {
  const pix  = drawIcon(sz);
  const png  = makePNG(pix, sz, sz);
  const dest = path.join(outDir, `icon${sz}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ ${dest} (${png.length} bytes)`);
}
console.log('Icons generated.');
