/**
 * Generate all required icon sizes from public/icon-master.svg
 * Run: npx ts-node scripts/generate-icons.ts
 * Requires: npm install sharp (devDependency)
 */

import path from 'path';
import fs from 'fs';
// @ts-ignore — installed on demand
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const MASTER = path.join(ROOT, 'public', 'icon-master.svg');
const ICON_DIR = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const SPLASH_DIR = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const PUBLIC_DIR = path.join(ROOT, 'public');

// ─── iOS app icon sizes ───────────────────────────────────────────────────────
const ICON_SIZES = [
  { file: 'Icon-20.png',         size: 20  },
  { file: 'Icon-20@2x.png',      size: 40  },
  { file: 'Icon-20@3x.png',      size: 60  },
  { file: 'Icon-29.png',         size: 29  },
  { file: 'Icon-29@2x.png',      size: 58  },
  { file: 'Icon-29@3x.png',      size: 87  },
  { file: 'Icon-40.png',         size: 40  },
  { file: 'Icon-40@2x.png',      size: 80  },
  { file: 'Icon-40@3x.png',      size: 120 },
  { file: 'Icon-60@2x.png',      size: 120 },
  { file: 'Icon-60@3x.png',      size: 180 },
  { file: 'Icon-76.png',         size: 76  },
  { file: 'Icon-76@2x.png',      size: 152 },
  { file: 'Icon-83.5@2x.png',    size: 167 },
  { file: 'AppIcon-512@2x.png',  size: 1024 }, // required 1024×1024 for App Store
];

const SPLASH_SIZES = [
  { file: 'splash-2732x2732.png',   w: 2732, h: 2732 },
  { file: 'splash-2732x2732-1.png', w: 2732, h: 2732 },
  { file: 'splash-2732x2732-2.png', w: 2732, h: 2732 },
];

const WEB_ICONS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

async function generateIconSizes() {
  const svgBuffer = fs.readFileSync(MASTER);

  console.log('Generating iOS app icons…');
  for (const { file, size } of ICON_SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(ICON_DIR, file));
    console.log(`  ✓ ${file} (${size}×${size})`);
  }

  console.log('\nGenerating splash screens…');
  for (const { file, w, h } of SPLASH_SIZES) {
    // Indigo background with centered icon at 25% size
    const iconSize = Math.round(Math.min(w, h) * 0.25);
    const iconBuffer = await sharp(svgBuffer).resize(iconSize, iconSize).png().toBuffer();
    const x = Math.round((w - iconSize) / 2);
    const y = Math.round((h - iconSize) / 2);

    await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 99, g: 102, b: 241, alpha: 1 } },
    })
      .composite([{ input: iconBuffer, left: x, top: y }])
      .png()
      .toFile(path.join(SPLASH_DIR, file));
    console.log(`  ✓ ${file} (${w}×${h})`);
  }

  console.log('\nGenerating web manifest icons…');
  for (const { file, size } of WEB_ICONS) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC_DIR, file));
    console.log(`  ✓ ${file} (${size}×${size})`);
  }

  // Write Contents.json for AppIcon.appiconset
  const contentsJson = {
    images: ICON_SIZES.map(({ file, size }) => ({
      filename: file,
      idiom: 'universal',
      platform: 'ios',
      size: `${size === 1024 ? '1024x1024' : `${size}x${size}`}`,
    })),
    info: { author: 'xcode', version: 1 },
  };
  fs.writeFileSync(
    path.join(ICON_DIR, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('\n✓ Updated AppIcon.appiconset/Contents.json');
  console.log('\nAll icons generated successfully!');
}

generateIconSizes().catch((err) => {
  console.error('Error generating icons:', err.message);
  process.exit(1);
});
