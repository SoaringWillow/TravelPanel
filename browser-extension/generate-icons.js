#!/usr/bin/env node
// Run with: node generate-icons.js
// Requires: npm install sharp (or: npx sharp-cli)
//
// Generates PNG icons from icon.svg in sizes needed by Chrome/Safari extensions.

const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not found. Install it with: npm install sharp');
    console.log('\nAlternative: use an online SVG-to-PNG converter with the icons/icon.svg file.');
    console.log('Required sizes: 16x16, 32x32, 48x48, 128x128 — save as icon16.png, icon32.png, icon48.png, icon128.png');
    process.exit(1);
  }

  const svgPath = path.join(__dirname, 'icons', 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of SIZES) {
    const outPath = path.join(__dirname, 'icons', `icon${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ Generated icon${size}.png`);
  }

  console.log('\nAll icons generated. Update manifest.json to reference them:');
  console.log(JSON.stringify({
    icons: Object.fromEntries(SIZES.map(s => [s, `icons/icon${s}.png`])),
    action: { default_icon: Object.fromEntries(SIZES.map(s => [s, `icons/icon${s}.png`])) }
  }, null, 2));
}

generateIcons().catch(console.error);
