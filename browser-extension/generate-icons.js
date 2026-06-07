#!/usr/bin/env node
/**
 * Generates TravelPanel Clipper extension icons as PNG files.
 * Run once: node generate-icons.js
 * Requires: npm install canvas (or use the pre-generated files if present)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Try canvas first, fall back to minimal PNG builder
let generateWithCanvas = false;
try {
  require.resolve('canvas');
  generateWithCanvas = true;
} catch {}

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

if (generateWithCanvas) {
  const { createCanvas } = require('canvas');
  SIZES.forEach((size) => {
    const canvas = createCanvas(size, size);
    const ctx    = canvas.getContext('2d');
    const r      = size / 2;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();

    // Plane emoji at appropriate size
    ctx.font = `${Math.round(size * 0.55)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈', r, r + size * 0.03);

    const out = path.join(OUT_DIR, `icon${size}.png`);
    fs.writeFileSync(out, canvas.toBuffer('image/png'));
    console.log(`✓ icons/icon${size}.png`);
  });
} else {
  // Minimal PNG without external dependencies
  // Encodes a solid indigo (#6366f1) filled square of each size
  console.log('canvas not found — generating solid-colour placeholder icons');
  SIZES.forEach((size) => {
    const out = path.join(OUT_DIR, `icon${size}.png`);
    fs.writeFileSync(out, buildSolidPng(size, 0x63, 0x66, 0xf1));
    console.log(`✓ icons/icon${size}.png (placeholder)`);
  });
}

console.log('\nDone! Icons are in browser-extension/icons/');

// ── Minimal PNG builder ────────────────────────────────────────────────────────
// Builds a valid RGB PNG filled with a single colour.

function buildSolidPng(size, r, g, b) {
  const width = size, height = size;
  const colorType = 2; // RGB
  const bitDepth  = 8;
  const rowBytes  = width * 3;

  // Build raw image data (filter byte 0 per row + RGB pixels)
  const rows = Buffer.alloc(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + rowBytes);
    rows[offset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      rows[offset + 1 + x * 3    ] = r;
      rows[offset + 1 + x * 3 + 1] = g;
      rows[offset + 1 + x * 3 + 2] = b;
    }
  }

  const zlib   = require('zlib');
  const idat   = zlib.deflateSync(rows);
  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = bitDepth;
  ihdr[9]  = colorType;
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT
  chunks.push(makeChunk('IDAT', idat));

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length    = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput  = Buffer.concat([typeBytes, data]);
  const crc       = Buffer.alloc(4);
  crc.writeInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buf) {
  const table = crc32.table || (crc32.table = buildCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) | 0;
}

function buildCrcTable() {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
