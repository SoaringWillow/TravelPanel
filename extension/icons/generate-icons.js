#!/usr/bin/env node
/**
 * Generates icon16.png, icon48.png, icon128.png from icon.svg
 * Requires: npm install -g sharp (or run `npm install sharp` locally)
 *
 * Usage:
 *   cd extension/icons && node generate-icons.js
 */

const path = require('path');
const fs   = require('fs');

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Install sharp first: npm install sharp');
    process.exit(1);
  }

  const svgPath = path.join(__dirname, 'icon.svg');
  const svgBuf  = fs.readFileSync(svgPath);

  for (const size of [16, 48, 128]) {
    const outPath = path.join(__dirname, `icon${size}.png`);
    await sharp(svgBuf).resize(size, size).png().toFile(outPath);
    console.log(`✓ icon${size}.png`);
  }

  console.log('Done.');
}

run().catch((e) => { console.error(e); process.exit(1); });
