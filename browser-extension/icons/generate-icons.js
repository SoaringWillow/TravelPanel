#!/usr/bin/env node
// Generates PNG icons from icon.svg for the browser extension.
// Requires: npm install -g sharp   (or: npx sharp-cli)
//
// Usage:
//   node generate-icons.js
//
// Output: icon-16.png, icon-32.png, icon-48.png, icon-128.png

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const svgPath = path.join(__dirname, 'icon.svg');
const svg     = fs.readFileSync(svgPath);
const sizes   = [16, 32, 48, 128];

(async () => {
  for (const size of sizes) {
    const outPath = path.join(__dirname, `icon-${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`  ✓ icon-${size}.png`);
  }
  console.log('\nDone! PNG icons generated.');
})().catch(err => {
  console.error('Error:', err.message);
  console.error('Make sure `sharp` is installed: npm install sharp');
  process.exit(1);
});
