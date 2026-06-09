#!/usr/bin/env node
/**
 * Generates PWA and iOS app icon PNGs from public/icon-source.svg using sharp.
 *
 * Usage:
 *   node scripts/generate-app-icons.js
 *
 * Prerequisites:
 *   npm install --save-dev sharp
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SRC = path.resolve(__dirname, '../public/icon-source.svg');

// ─── PWA icons ───────────────────────────────────────────────────────────────
const PWA_SIZES = [192, 512];

// ─── iOS icon sizes (px) ─────────────────────────────────────────────────────
// Covers every slot in a standard iOS AppIcon.appiconset
const IOS_SIZES = [
  { size: 20,   scale: 1, name: 'Icon-20.png'      },
  { size: 20,   scale: 2, name: 'Icon-20@2x.png'   },
  { size: 20,   scale: 3, name: 'Icon-20@3x.png'   },
  { size: 29,   scale: 1, name: 'Icon-29.png'      },
  { size: 29,   scale: 2, name: 'Icon-29@2x.png'   },
  { size: 29,   scale: 3, name: 'Icon-29@3x.png'   },
  { size: 40,   scale: 1, name: 'Icon-40.png'      },
  { size: 40,   scale: 2, name: 'Icon-40@2x.png'   },
  { size: 40,   scale: 3, name: 'Icon-40@3x.png'   },
  { size: 60,   scale: 2, name: 'Icon-60@2x.png'   },
  { size: 60,   scale: 3, name: 'Icon-60@3x.png'   },
  { size: 76,   scale: 1, name: 'Icon-76.png'      },
  { size: 76,   scale: 2, name: 'Icon-76@2x.png'   },
  { size: 83.5, scale: 2, name: 'Icon-83.5@2x.png' },
  { size: 1024, scale: 1, name: 'Icon-1024.png'    },
];

const IOS_DEST = path.resolve(
  __dirname,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset'
);
const PWA_DEST = path.resolve(__dirname, '../public');

async function generatePwa() {
  for (const size of PWA_SIZES) {
    const dest = path.join(PWA_DEST, `icon-${size}.png`);
    await sharp(SRC).resize(size, size).png().toFile(dest);
    console.log(`✓ PWA  ${size}×${size}  →  ${path.relative(process.cwd(), dest)}`);
  }
}

async function generateIos() {
  if (!fs.existsSync(IOS_DEST)) {
    fs.mkdirSync(IOS_DEST, { recursive: true });
  }
  for (const { size, scale, name } of IOS_SIZES) {
    const px   = Math.round(size * scale);
    const dest = path.join(IOS_DEST, name);
    await sharp(SRC).resize(px, px).png().toFile(dest);
    console.log(`✓ iOS  ${px}×${px}  →  ${path.relative(process.cwd(), dest)}`);
  }
}

async function writeContentsJson() {
  const images = IOS_SIZES.map(({ size, scale, name }) => ({
    filename: name,
    idiom:    size >= 76 && size !== 1024 ? 'ipad' : size === 1024 ? 'ios-marketing' : 'iphone',
    scale:    `${scale}x`,
    size:     `${size}x${size}`,
  }));

  // Add universal entries that Xcode expects
  const contents = {
    images: [
      // iPhone + iPad entries sorted as Xcode expects
      { idiom: 'iphone', scale: '2x', size: '20x20',   filename: 'Icon-20@2x.png'   },
      { idiom: 'iphone', scale: '3x', size: '20x20',   filename: 'Icon-20@3x.png'   },
      { idiom: 'iphone', scale: '2x', size: '29x29',   filename: 'Icon-29@2x.png'   },
      { idiom: 'iphone', scale: '3x', size: '29x29',   filename: 'Icon-29@3x.png'   },
      { idiom: 'iphone', scale: '2x', size: '40x40',   filename: 'Icon-40@2x.png'   },
      { idiom: 'iphone', scale: '3x', size: '40x40',   filename: 'Icon-40@3x.png'   },
      { idiom: 'iphone', scale: '2x', size: '60x60',   filename: 'Icon-60@2x.png'   },
      { idiom: 'iphone', scale: '3x', size: '60x60',   filename: 'Icon-60@3x.png'   },
      { idiom: 'ipad',   scale: '1x', size: '20x20',   filename: 'Icon-20.png'      },
      { idiom: 'ipad',   scale: '2x', size: '20x20',   filename: 'Icon-20@2x.png'   },
      { idiom: 'ipad',   scale: '1x', size: '29x29',   filename: 'Icon-29.png'      },
      { idiom: 'ipad',   scale: '2x', size: '29x29',   filename: 'Icon-29@2x.png'   },
      { idiom: 'ipad',   scale: '1x', size: '40x40',   filename: 'Icon-40.png'      },
      { idiom: 'ipad',   scale: '2x', size: '40x40',   filename: 'Icon-40@2x.png'   },
      { idiom: 'ipad',   scale: '1x', size: '76x76',   filename: 'Icon-76.png'      },
      { idiom: 'ipad',   scale: '2x', size: '76x76',   filename: 'Icon-76@2x.png'   },
      { idiom: 'ipad',   scale: '2x', size: '83.5x83.5', filename: 'Icon-83.5@2x.png' },
      { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'Icon-1024.png' },
    ],
    info: { author: 'xcode', version: 1 },
  };

  const dest = path.join(IOS_DEST, 'Contents.json');
  fs.writeFileSync(dest, JSON.stringify(contents, null, 2) + '\n');
  console.log(`✓ Wrote ${path.relative(process.cwd(), dest)}`);
}

(async () => {
  console.log('Generating app icons from', SRC);
  await generatePwa();
  await generateIos();
  await writeContentsJson();
  console.log('\nDone. Run `npx cap sync ios` to copy assets to Xcode.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
