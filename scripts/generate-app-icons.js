#!/usr/bin/env node
/**
 * Generates TravelPanel PWA and iOS app icons.
 * Run: node scripts/generate-app-icons.js
 * With canvas npm package installed for the best result.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const SIZES = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
];

let generateWithCanvas = false;
try { require.resolve('canvas'); generateWithCanvas = true; } catch {}

if (generateWithCanvas) {
  const { createCanvas } = require('canvas');

  SIZES.forEach(({ name, size }) => {
    const canvas = createCanvas(size, size);
    const ctx    = canvas.getContext('2d');
    const r      = size / 2;

    // Rounded square background (simulate with full circle for simplicity)
    const cornerR = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(cornerR, 0);
    ctx.lineTo(size - cornerR, 0);
    ctx.quadraticCurveTo(size, 0, size, cornerR);
    ctx.lineTo(size, size - cornerR);
    ctx.quadraticCurveTo(size, size, size - cornerR, size);
    ctx.lineTo(cornerR, size);
    ctx.quadraticCurveTo(0, size, 0, size - cornerR);
    ctx.lineTo(0, cornerR);
    ctx.quadraticCurveTo(0, 0, cornerR, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.fill();

    // Plane emoji
    ctx.font = `${Math.round(size * 0.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈', r, r + size * 0.03);

    const out = path.join(PUBLIC_DIR, name);
    fs.writeFileSync(out, canvas.toBuffer('image/png'));
    console.log(`✓ public/${name}`);
  });
} else {
  console.log('canvas not found — generating solid-indigo placeholder icons');
  SIZES.forEach(({ name, size }) => {
    const out = path.join(PUBLIC_DIR, name);
    fs.writeFileSync(out, buildSolidPng(size, 0x63, 0x66, 0xf1));
    console.log(`✓ public/${name} (placeholder)`);
  });
}

console.log('\nDone!');

// ── Minimal PNG builder ──────────────────────────────────────────────────────

function buildSolidPng(size, r, g, b) {
  const rowBytes = size * 3;
  const rows = Buffer.alloc(size * (1 + rowBytes));
  for (let y = 0; y < size; y++) {
    const offset = y * (1 + rowBytes);
    rows[offset] = 0;
    for (let x = 0; x < size; x++) {
      rows[offset + 1 + x * 3]     = r;
      rows[offset + 1 + x * 3 + 1] = g;
      rows[offset + 1 + x * 3 + 2] = b;
    }
  }
  const idat = zlib.deflateSync(rows);
  const chunks = [Buffer.from([137,80,78,71,13,10,26,10])];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  chunks.push(makeChunk('IHDR', ihdr));
  chunks.push(makeChunk('IDAT', idat));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length    = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([length, typeBytes, data, crcVal]);
}

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crc32.table[n]=c;}
  }
  let c = 0xffffffff;
  for (let i=0;i<buf.length;i++) c=(c>>>8)^crc32.table[(c^buf[i])&0xff];
  return (c^0xffffffff)|0;
}
