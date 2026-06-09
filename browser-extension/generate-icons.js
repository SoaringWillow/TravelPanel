#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Converts icon.svg → icon16.png, icon32.png, icon48.png, icon128.png
 * using the `sharp` npm package.
 *
 * Usage:
 *   npm install sharp   (one-time)
 *   node generate-icons.js
 */

const path = require('path');
const fs   = require('fs');

const SIZES = [16, 32, 48, 128];
const SRC   = path.join(__dirname, 'icons', 'icon.svg');
const OUT   = path.join(__dirname, 'icons');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'Missing dependency. Run: npm install sharp\n' +
      'Then run this script again.'
    );
    process.exit(1);
  }

  const svgBuf = fs.readFileSync(SRC);

  for (const size of SIZES) {
    const dest = path.join(OUT, `icon${size}.png`);
    await sharp(svgBuf).resize(size, size).png().toFile(dest);
    console.log(`✓ icons/icon${size}.png`);
  }

  console.log('\nAll icons generated. Load the extension in Chrome: chrome://extensions → Load unpacked');
}

main().catch((err) => { console.error(err); process.exit(1); });
