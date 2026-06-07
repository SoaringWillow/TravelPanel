#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension from icon.svg.
 * Requires: npm install sharp  (one-time, not in package.json)
 * Run from the browser-extension/ directory:  node icons/generate-icons.js
 */

const sharp = require('sharp');
const path  = require('path');
const dir   = path.join(__dirname);

const sizes = [16, 32, 48, 128];

(async () => {
  for (const size of sizes) {
    await sharp(path.join(dir, 'icon.svg'))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, `icon${size}.png`));
    console.log(`✓ icon${size}.png`);
  }
  console.log('Icons generated successfully.');
})();
