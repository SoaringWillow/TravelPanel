#!/usr/bin/env node
/**
 * Generates PNG icons from icon.svg for the Chrome/Edge browser extension.
 * Run from the browser-extension directory:
 *   node scripts/generate-icons.js
 *
 * Requires: npm install sharp (one-time, dev only)
 */

const fs   = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];
const SVG   = path.join(__dirname, '../icons/icon.svg');
const OUT   = path.join(__dirname, '../icons');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not installed. Run: npm install sharp');
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG);
  for (const size of SIZES) {
    const dest = path.join(OUT, `icon${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(dest);
    console.log(`✓ icon${size}.png`);
  }
  console.log('\nIcons generated in icons/');
}

main().catch(err => { console.error(err); process.exit(1); });
