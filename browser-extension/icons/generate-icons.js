#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension.
 * Run once: node icons/generate-icons.js
 * Requires: npm install -g sharp  (or: npm install sharp in this folder)
 */

const fs   = require('fs');
const path = require('path');

// Try sharp; if not installed, fall back to a pure-JS minimal PNG writer
async function main() {
  const sizes = [16, 48, 128];

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('sharp not found — writing placeholder PNGs.');
    console.log('For proper icons: npm install sharp && node icons/generate-icons.js\n');
    sizes.forEach(writePlaceholderPng);
    return;
  }

  const svgSrc = fs.readFileSync(path.join(__dirname, 'icon.svg'));
  for (const size of sizes) {
    await sharp(svgSrc)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon${size}.png`));
    console.log(`  icon${size}.png ✓`);
  }
  console.log('\nAll icons generated!');
}

// ── Minimal 1×1 PNG scaled to target (placeholder) ───────────────────────────
// This writes a valid single-pixel solid-color PNG — browsers/Chrome scale it up.
// It's ugly at low zoom but functional for development.
function writePlaceholderPng(size) {
  const dest = path.join(__dirname, `icon${size}.png`);
  // Blue #2563EB = R:37 G:99 B:235 A:255
  const png = buildSinglePixelPng(37, 99, 235, 255);
  fs.writeFileSync(dest, png);
  console.log(`  icon${size}.png (placeholder) ✓`);
}

function buildSinglePixelPng(r, g, b, a) {
  const zlib = require('zlib');
  // Raw RGBA pixel with filter byte
  const raw      = Buffer.from([0, r, g, b, a]);
  const deflated = zlib.deflateSync(raw, { level: 9 });

  function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
  function crc32(data) {
    let c = 0xFFFFFFFF;
    for (const byte of data) {
      c ^= byte;
      for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len       = u32(data.length);
    const crcBuf    = Buffer.concat([typeBytes, data]);
    return Buffer.concat([len, typeBytes, data, u32(crc32(crcBuf))]);
  }

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', Buffer.concat([u32(1), u32(1), Buffer.from([8, 6, 0, 0, 0])]));
  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

main().catch((err) => { console.error(err); process.exit(1); });
