#!/usr/bin/env node
// Generates iOS splash screen images: teal background + white map pin.
// No external dependencies — uses Node's built-in zlib.
'use strict';

const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(w, h, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB (no alpha for faster splash)

  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0);
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixelFn(x, y, w, h);
      rows.push(r, g, b);
    }
  }

  const compressed = deflateSync(Buffer.from(rows));
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Pixel function ───────────────────────────────────────────────────────────

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function splashPixel(x, y, w, h) {
  // Teal background with subtle radial gradient
  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const t = Math.min(dist / maxR, 1);

  // Center: #0d9488, edge: #0a7870
  const r = Math.round(13 + (10 - 13) * t);
  const g = Math.round(148 + (120 - 148) * t);
  const b = Math.round(136 + (112 - 136) * t);

  // White map pin: centered, sized at ~18% of the smaller dimension
  const pinSize = Math.min(w, h) * 0.18;
  const pinCX = cx;
  const pinCY = cy - pinSize * 0.08; // slightly above center
  const pinR = pinSize * 0.5;
  const holeR = pinR * 0.40;
  const stemTop = pinCY + pinR * 0.65;
  const stemBot = pinCY + pinR + pinSize * 0.55;

  const pdx = x - pinCX;
  const pdy = y - pinCY;
  const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

  const edge = Math.max(1, pinR * 0.02);
  const circleA = smoothstep(pinR + edge, pinR - edge, pdist);
  const holeA = smoothstep(holeR - edge, holeR + edge, pdist);

  const stemProgress = Math.max(0, (y - stemTop) / Math.max(1, stemBot - stemTop));
  const stemHW = pinR * 0.32 * (1 - stemProgress);
  const inStemY = y >= stemTop && y <= stemBot + 1;
  const stemA = inStemY ? smoothstep(stemHW + 1, stemHW - 0.5, Math.abs(pdx)) : 0;

  const pinA = Math.max(circleA * holeA, stemA);

  if (pinA > 0.01) {
    const outR = Math.round(r + (255 - r) * pinA);
    const outG = Math.round(g + (255 - g) * pinA);
    const outB = Math.round(b + (255 - b) * pinA);
    return [outR, outG, outB];
  }

  return [r, g, b];
}

// ─── Generate files ───────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');
fs.mkdirSync(outDir, { recursive: true });

// All three splash variants use 2732x2732 (covers any iOS device)
const SIZE = 2732;

console.log(`Generating ${SIZE}×${SIZE} splash (this may take ~15s)…`);
const png = makePNG(SIZE, SIZE, splashPixel);

for (const filename of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`✓ ${filename} (${(png.length / 1024).toFixed(0)} KB)`);
}

console.log('\nSplash screens generated successfully.');
