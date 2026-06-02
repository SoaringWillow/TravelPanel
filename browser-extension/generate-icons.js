#!/usr/bin/env node
// Generates PNG icons from icon.svg using the 'sharp' package.
// Run once before loading the extension: node generate-icons.js
//
// Install sharp if needed: npm install sharp --save-dev

const path = require('path');
const fs   = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Missing dependency. Run: npm install sharp --save-dev');
  process.exit(1);
}

const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const svg     = fs.readFileSync(svgPath);
const sizes   = [16, 32, 48, 128];

(async () => {
  for (const size of sizes) {
    const out = path.join(__dirname, 'icons', `icon${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`✓ icons/icon${size}.png`);
  }
  console.log('\nIcons generated. You can now load the extension unpacked in Chrome.');
})();
