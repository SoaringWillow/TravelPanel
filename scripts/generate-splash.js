#!/usr/bin/env node
// Generates iOS Capacitor splash screens from the app icon SVG.
// Usage: node scripts/generate-splash.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC_SVG = path.join(__dirname, '../public/app-icon.svg');
const SPLASH_DIR = path.join(
  __dirname,
  '../ios/App/App/Assets.xcassets/Splash.imageset'
);

// Capacitor splash: 2732×2732 with centered icon
// The icon portion (no bg) is composited on the indigo brand background
const INDIGO = { r: 79, g: 70, b: 229, alpha: 1 }; // #4f46e5
const SPLASH_SIZE = 2732;
const ICON_SIZE = 420; // px, centered on splash

async function generate() {
  const svgBuffer = fs.readFileSync(SRC_SVG);

  // Render the icon (which already has an indigo gradient bg) at icon size
  // For the splash we want just the white symbol on brand indigo.
  // We'll create the splash as: indigo rect + white icon composited center.

  // Step 1: Render full app icon at ICON_SIZE
  const iconPng = await sharp(svgBuffer).resize(ICON_SIZE, ICON_SIZE).png().toBuffer();

  // Step 2: Create indigo background at SPLASH_SIZE × SPLASH_SIZE
  const offset = Math.floor((SPLASH_SIZE - ICON_SIZE) / 2);
  const splashBuffer = await sharp({
    create: {
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      channels: 4,
      background: INDIGO,
    },
  })
    .composite([{ input: iconPng, left: offset, top: offset }])
    .png()
    .toBuffer();

  // Capacitor uses 3 files at the same 2732 size but referenced as 1x/2x/3x
  const files = [
    'splash-2732x2732-2.png',  // 1x
    'splash-2732x2732-1.png',  // 2x
    'splash-2732x2732.png',    // 3x
  ];

  console.log('Generating splash screens…');
  for (const file of files) {
    const outPath = path.join(SPLASH_DIR, file);
    fs.writeFileSync(outPath, splashBuffer);
    console.log(`  ✓ ${file}`);
  }

  // Update Contents.json (keep existing structure)
  const contents = {
    images: [
      { idiom: 'universal', filename: 'splash-2732x2732-2.png', scale: '1x' },
      { idiom: 'universal', filename: 'splash-2732x2732-1.png', scale: '2x' },
      { idiom: 'universal', filename: 'splash-2732x2732.png',   scale: '3x' },
    ],
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(path.join(SPLASH_DIR, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('  ✓ Contents.json updated');
  console.log('\nDone.');
}

generate().catch((err) => {
  console.error('Splash generation failed:', err);
  process.exit(1);
});
