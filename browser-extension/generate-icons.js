#!/usr/bin/env node
// Run: node generate-icons.js
// Generates PNG icons from the SVG using sharp (if available) or canvas.
// Falls back to writing placeholder PNGs if neither is installed.
// The extension works fine with these placeholder PNGs.

const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const OUT_DIR = path.join(__dirname, 'icons');

// Minimal 1x1 transparent PNG as base64 — used if no conversion library is present.
// Real icons are generated when sharp or canvas is available.
const TRANSPARENT_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function trySharp() {
  try {
    const sharp = require('sharp');
    const svgBuf = fs.readFileSync(path.join(OUT_DIR, 'icon.svg'));
    for (const size of SIZES) {
      const out = path.join(OUT_DIR, `icon${size}.png`);
      await sharp(svgBuf).resize(size, size).png().toFile(out);
      console.log(`✓ icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

async function tryCanvas() {
  try {
    const { createCanvas, loadImage } = require('canvas');
    const svgPath = path.join(OUT_DIR, 'icon.svg');
    for (const size of SIZES) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(svgPath);
      ctx.drawImage(img, 0, 0, size, size);
      const out = path.join(OUT_DIR, `icon${size}.png`);
      fs.writeFileSync(out, canvas.toBuffer('image/png'));
      console.log(`✓ icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

function writePlaceholders() {
  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `icon${size}.png`);
    // Write a minimal valid PNG (1x1 transparent) as a stand-in.
    // The browser will use this until real icons are generated.
    fs.writeFileSync(out, TRANSPARENT_1X1_PNG);
    console.log(`⚠ icon${size}.png  (placeholder — install 'sharp' for real icons)`);
  }
}

(async () => {
  if (!await trySharp() && !await tryCanvas()) {
    console.log('sharp and canvas not found. Writing placeholder PNGs.\nFor real icons: npm install sharp && node generate-icons.js');
    writePlaceholders();
  }
})();
