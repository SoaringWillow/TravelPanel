#!/usr/bin/env node
// Generates PWA icons (PNG) from the inline SVG definition.
// Run: node scripts/generate-icons.js
// Requires: sharp (npm install --save-dev sharp)

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ── SVG source: indigo circle + white map pin ─────────────────────────────────
const ICON_SVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="64" fill="#6366f1"/>
  <!-- Pin head -->
  <circle cx="64" cy="46" r="22" fill="white"/>
  <!-- Pin tail -->
  <path d="M50 54 Q51 78 64 96 Q77 78 78 54 Z" fill="white"/>
  <!-- Inner hole -->
  <circle cx="64" cy="46" r="9" fill="#6366f1"/>
</svg>
`.trim();

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(__dirname, '..', 'public');

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let generated = 0;

  for (const size of SIZES) {
    const svgBuf = Buffer.from(ICON_SVG(size));
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(svgBuf)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ icon-${size}.png`);
    generated++;
  }

  // Also generate apple-touch-icon (180x180)
  const atiBuf = Buffer.from(ICON_SVG(180));
  await sharp(atiBuf).resize(180, 180).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // favicon.ico equivalent (32x32 PNG named favicon.png)
  const favBuf = Buffer.from(ICON_SVG(32));
  await sharp(favBuf).resize(32, 32).png().toFile(path.join(OUT_DIR, 'favicon.png'));
  console.log('✓ favicon.png');

  console.log(`\nGenerated ${generated + 2} icons in public/`);
}

run().catch(console.error);
