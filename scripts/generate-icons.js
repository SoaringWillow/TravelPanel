#!/usr/bin/env node
// Generates all iOS app icon sizes and PWA icons from public/app-icon.svg
// Usage: node scripts/generate-icons.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC_SVG = path.join(__dirname, '../public/app-icon.svg');
const APPICONSET_DIR = path.join(
  __dirname,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset'
);
const PUBLIC_DIR = path.join(__dirname, '../public');

// iOS App Store requires a single 1024×1024 image (Xcode generates other sizes)
const IOS_SIZES = [1024];

// PWA manifest icon sizes
const PWA_SIZES = [192, 512];

async function generate() {
  const svgBuffer = fs.readFileSync(SRC_SVG);

  console.log('Generating iOS app icons…');
  for (const size of IOS_SIZES) {
    const outPath = path.join(APPICONSET_DIR, `AppIcon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`  ✓ ${size}×${size} → ${path.relative(process.cwd(), outPath)}`);
  }

  // Update Contents.json to reference the generated file
  const contents = {
    images: [
      {
        filename: 'AppIcon-1024.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024',
      },
    ],
    info: { author: 'xcode', version: 1 },
  };
  fs.writeFileSync(
    path.join(APPICONSET_DIR, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('  ✓ Contents.json updated');

  console.log('\nGenerating PWA icons…');
  for (const size of PWA_SIZES) {
    const outPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`  ✓ ${size}×${size} → ${path.relative(process.cwd(), outPath)}`);
  }

  // favicon at 32px
  const faviconPath = path.join(PUBLIC_DIR, 'favicon-32.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile(faviconPath);
  console.log(`  ✓ 32×32 favicon → ${path.relative(process.cwd(), faviconPath)}`);

  console.log('\nDone.');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
