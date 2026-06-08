#!/usr/bin/env node
/**
 * Generates PNG icons from icon.svg using the sharp library.
 * Run once: node generate-icons.js
 * Requires: npm install sharp  (one-time, not added to main deps)
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Run: npm install sharp   then retry this script.');
  process.exit(1);
}

const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const svg = fs.readFileSync(svgPath);

const sizes = [16, 48, 128];

(async () => {
  for (const size of sizes) {
    const out = path.join(__dirname, 'icons', `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`✓ icons/icon-${size}.png`);
  }
  console.log('Icons generated. Load the extension in chrome://extensions.');
})();
