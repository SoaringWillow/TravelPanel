#!/usr/bin/env node
/**
 * Generates PNG icons from icon.svg at 16, 32, 48, and 128px.
 * Run once before loading the extension:
 *   node generate-icons.js
 *
 * Requires: npm install sharp (or: brew install librsvg && rsvg-convert)
 */

const path = require('path');
const fs = require('fs');

const SIZES = [16, 32, 48, 128];
const SVG_PATH = path.join(__dirname, 'icons', 'icon.svg');
const OUT_DIR = path.join(__dirname, 'icons');

async function generate() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not found. Install it: npm install sharp');
    console.error('Or use an online SVG-to-PNG converter for each size listed below:');
    SIZES.forEach(s => console.error(`  ${s}x${s} → icons/icon${s}.png`));
    process.exit(1);
  }

  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `icon${size}.png`);
    await sharp(SVG_PATH).resize(size, size).png().toFile(out);
    console.log(`✓ icons/icon${size}.png`);
  }
  console.log('Done — icons generated.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
