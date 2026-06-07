#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension from icon.svg.
 * Requires sharp: npm install sharp
 *
 * Usage: node generate-icons.js
 */

const path = require('path');
const fs = require('fs');

async function generate() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Please install sharp first: npm install sharp');
    process.exit(1);
  }

  const svgPath = path.join(__dirname, 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);
  const sizes = [16, 32, 48, 128];

  for (const size of sizes) {
    const outPath = path.join(__dirname, `icon${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated icon${size}.png`);
  }

  console.log('Done!');
}

generate().catch(console.error);
