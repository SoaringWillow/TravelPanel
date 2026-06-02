#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension from icon.svg.
 * Requires: sharp  (npm install --save-dev sharp)
 * Run: node generate-icons.js
 */
const sharp = require('sharp');
const path  = require('path');

const SIZES = [16, 32, 48, 128];
const src   = path.join(__dirname, 'icons', 'icon.svg');

Promise.all(
  SIZES.map((size) =>
    sharp(src)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, 'icons', `icon${size}.png`))
      .then(() => console.log(`✓ icon${size}.png`))
  )
).then(() => console.log('Icons generated.')).catch(console.error);
