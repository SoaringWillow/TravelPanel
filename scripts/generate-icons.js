#!/usr/bin/env node
// Generates all required iOS app icon sizes + PWA icons from public/icon.svg
// Usage: node scripts/generate-icons.js
// Requires: sharp (npm install --save-dev sharp)

const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const SVG_SRC = path.join(__dirname, '../public/icon.svg');

// iOS icon sizes required for App Store submission (all @1x)
const IOS_SIZES = [
  { size: 20,    scale: 1, name: 'Icon-20.png'    },
  { size: 20,    scale: 2, name: 'Icon-20@2x.png' },
  { size: 20,    scale: 3, name: 'Icon-20@3x.png' },
  { size: 29,    scale: 1, name: 'Icon-29.png'    },
  { size: 29,    scale: 2, name: 'Icon-29@2x.png' },
  { size: 29,    scale: 3, name: 'Icon-29@3x.png' },
  { size: 40,    scale: 1, name: 'Icon-40.png'    },
  { size: 40,    scale: 2, name: 'Icon-40@2x.png' },
  { size: 40,    scale: 3, name: 'Icon-40@3x.png' },
  { size: 60,    scale: 2, name: 'Icon-60@2x.png' },
  { size: 60,    scale: 3, name: 'Icon-60@3x.png' },
  { size: 76,    scale: 1, name: 'Icon-76.png'    },
  { size: 76,    scale: 2, name: 'Icon-76@2x.png' },
  { size: 83.5,  scale: 2, name: 'Icon-83.5@2x.png' },
  { size: 1024,  scale: 1, name: 'AppIcon-512@2x.png' }, // 1024×1024 for App Store
];

// PWA icons
const PWA_SIZES = [
  { px: 192, name: 'icon-192.png' },
  { px: 512, name: 'icon-512.png' },
];

const IOS_DEST = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
const PWA_DEST = path.join(__dirname, '../public');

async function main() {
  const svgBuffer = fs.readFileSync(SVG_SRC);

  console.log('Generating iOS icons…');
  for (const { size, scale, name } of IOS_SIZES) {
    const px = Math.round(size * scale);
    const dest = path.join(IOS_DEST, name);
    await sharp(svgBuffer).resize(px, px).png().toFile(dest);
    console.log(`  ✓ ${name} (${px}×${px})`);
  }

  console.log('Generating PWA icons…');
  for (const { px, name } of PWA_SIZES) {
    const dest = path.join(PWA_DEST, name);
    await sharp(svgBuffer).resize(px, px).png().toFile(dest);
    console.log(`  ✓ ${name} (${px}×${px})`);
  }

  // Update Contents.json
  const images = IOS_SIZES.map(({ size, scale, name }) => ({
    filename: name,
    idiom:    'universal',
    platform: 'ios',
    size:     `${size}x${size}`,
    scale:    `${scale}x`,
  }));
  const contentsJson = { images, info: { author: 'xcode', version: 1 } };
  fs.writeFileSync(
    path.join(IOS_DEST, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2),
  );
  console.log('  ✓ Contents.json updated');

  console.log('\nDone! All icons generated.');
}

main().catch((err) => { console.error(err); process.exit(1); });
