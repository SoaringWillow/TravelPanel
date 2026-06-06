/**
 * Generates all required iOS app icon sizes from an embedded SVG master.
 * Run: node scripts/generate-app-icons.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

// ── Master SVG: indigo gradient + white globe + pin ──────────────────────────

const MASTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="shine" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)" rx="0"/>

  <!-- Subtle top-left shine -->
  <rect width="1024" height="1024" fill="url(#shine)" rx="0"/>

  <!-- Globe body -->
  <circle cx="512" cy="440" r="240" fill="none" stroke="#ffffff" stroke-width="28" opacity="0.95"/>

  <!-- Globe horizontal lines (latitude) -->
  <ellipse cx="512" cy="440" rx="240" ry="80" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.7"/>
  <line x1="272" y1="440" x2="752" y2="440" stroke="#ffffff" stroke-width="18" opacity="0.7"/>
  <!-- Upper latitude arc -->
  <path d="M 310 350 Q 512 290 714 350" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.55"/>
  <!-- Lower latitude arc -->
  <path d="M 310 530 Q 512 590 714 530" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.55"/>

  <!-- Vertical meridian (center) -->
  <ellipse cx="512" cy="440" rx="0" ry="240" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.7"/>
  <!-- Left meridian -->
  <path d="M 512 200 Q 390 440 512 680" fill="none" stroke="#ffffff" stroke-width="14" opacity="0.45"/>
  <!-- Right meridian -->
  <path d="M 512 200 Q 634 440 512 680" fill="none" stroke="#ffffff" stroke-width="14" opacity="0.45"/>

  <!-- Map pin drop shadow (subtle) -->
  <ellipse cx="512" cy="760" rx="52" ry="16" fill="#000000" opacity="0.18"/>

  <!-- Map pin body -->
  <path d="M 512 580
           C 456 580 410 626 410 682
           C 410 746 512 820 512 820
           C 512 820 614 746 614 682
           C 614 626 568 580 512 580 Z"
        fill="#ffffff" opacity="0.97"/>

  <!-- Pin inner dot -->
  <circle cx="512" cy="682" r="36" fill="url(#bg)" opacity="0.9"/>
</svg>`;

// ── iOS icon size matrix ─────────────────────────────────────────────────────

const SIZES = [
  // Universal single size (App Store + modern iOS)
  { size: 1024, filename: 'AppIcon-1024.png',   idiom: 'universal', platform: 'ios',     sizeStr: '1024x1024' },

  // iPhone notification
  { size: 40,   filename: 'AppIcon-20@2x.png',  idiom: 'iphone',   platform: null,       sizeStr: '20x20',   scale: '2x' },
  { size: 60,   filename: 'AppIcon-20@3x.png',  idiom: 'iphone',   platform: null,       sizeStr: '20x20',   scale: '3x' },

  // iPhone settings
  { size: 58,   filename: 'AppIcon-29@2x.png',  idiom: 'iphone',   platform: null,       sizeStr: '29x29',   scale: '2x' },
  { size: 87,   filename: 'AppIcon-29@3x.png',  idiom: 'iphone',   platform: null,       sizeStr: '29x29',   scale: '3x' },

  // iPhone spotlight
  { size: 80,   filename: 'AppIcon-40@2x.png',  idiom: 'iphone',   platform: null,       sizeStr: '40x40',   scale: '2x' },
  { size: 120,  filename: 'AppIcon-40@3x.png',  idiom: 'iphone',   platform: null,       sizeStr: '40x40',   scale: '3x' },

  // iPhone home screen
  { size: 120,  filename: 'AppIcon-60@2x.png',  idiom: 'iphone',   platform: null,       sizeStr: '60x60',   scale: '2x' },
  { size: 180,  filename: 'AppIcon-60@3x.png',  idiom: 'iphone',   platform: null,       sizeStr: '60x60',   scale: '3x' },

  // iPad notifications
  { size: 20,   filename: 'AppIcon-ipad-20@1x.png', idiom: 'ipad', platform: null,       sizeStr: '20x20',   scale: '1x' },
  { size: 40,   filename: 'AppIcon-ipad-20@2x.png', idiom: 'ipad', platform: null,       sizeStr: '20x20',   scale: '2x' },

  // iPad settings
  { size: 29,   filename: 'AppIcon-ipad-29@1x.png', idiom: 'ipad', platform: null,       sizeStr: '29x29',   scale: '1x' },
  { size: 58,   filename: 'AppIcon-ipad-29@2x.png', idiom: 'ipad', platform: null,       sizeStr: '29x29',   scale: '2x' },

  // iPad spotlight
  { size: 40,   filename: 'AppIcon-ipad-40@1x.png', idiom: 'ipad', platform: null,       sizeStr: '40x40',   scale: '1x' },
  { size: 80,   filename: 'AppIcon-ipad-40@2x.png', idiom: 'ipad', platform: null,       sizeStr: '40x40',   scale: '2x' },

  // iPad home screen
  { size: 76,   filename: 'AppIcon-76@1x.png',  idiom: 'ipad',   platform: null,       sizeStr: '76x76',   scale: '1x' },
  { size: 152,  filename: 'AppIcon-76@2x.png',  idiom: 'ipad',   platform: null,       sizeStr: '76x76',   scale: '2x' },

  // iPad Pro home screen
  { size: 167,  filename: 'AppIcon-83.5@2x.png', idiom: 'ipad',  platform: null,       sizeStr: '83.5x83.5', scale: '2x' },
];

// ── Generate ─────────────────────────────────────────────────────────────────

const svgBuffer = Buffer.from(MASTER_SVG);

async function generate() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seen = new Set();

  for (const entry of SIZES) {
    const outPath = path.join(OUT_DIR, entry.filename);

    if (!seen.has(entry.filename)) {
      await sharp(svgBuffer)
        .resize(entry.size, entry.size)
        .png({ compressionLevel: 9 })
        .toFile(outPath);

      console.log(`✓ ${entry.filename} (${entry.size}px)`);
      seen.add(entry.filename);
    }
  }

  // Write Contents.json
  const images = SIZES.map((entry) => {
    const img = {
      filename: entry.filename,
      idiom: entry.idiom,
      size: entry.sizeStr,
    };
    if (entry.platform) img.platform = entry.platform;
    if (entry.scale) img.scale = entry.scale;
    return img;
  });

  const contents = {
    images,
    info: { author: 'xcode', version: 1 },
  };

  const contentsPath = path.join(OUT_DIR, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2) + '\n');
  console.log(`✓ Contents.json updated (${SIZES.length} entries)`);
  console.log('\nDone! All iOS app icon sizes generated.');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
