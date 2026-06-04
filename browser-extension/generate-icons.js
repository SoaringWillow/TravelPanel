#!/usr/bin/env node
// Run with: node generate-icons.js
// Requires: npm install canvas (or uses system canvas if available)
// Fallback: generates minimal valid PNG placeholders

const fs = require('fs');
const path = require('path');

// Minimal valid PNG generator (solid color square, no canvas needed)
function makePng(size, r, g, b) {
  const { PNG } = (() => {
    try { return require('pngjs'); } catch (_) { return null; }
  })() || {};

  if (PNG) {
    const png = new PNG({ width: size, height: size });
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (size * y + x) * 4;
        // Draw a simple map-pin shape
        const cx = size / 2, cy = size * 0.45, cr = size * 0.38;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        // Circle head
        if (dist <= cr) {
          // Inner circle (hollow center)
          const innerR = cr * 0.38;
          if (dist <= innerR) {
            png.data[idx]     = 240;
            png.data[idx + 1] = 249;
            png.data[idx + 2] = 255;
            png.data[idx + 3] = 255;
          } else {
            png.data[idx]     = r;
            png.data[idx + 1] = g;
            png.data[idx + 2] = b;
            png.data[idx + 3] = 255;
          }
        }
        // Pin tail
        else if (
          x >= cx - cr * 0.25 && x <= cx + cr * 0.25 &&
          y > cy && y <= cy + cr * 0.85 &&
          (y - cy) / (cr * 0.85) >= (Math.abs(x - cx) / (cr * 0.25))
        ) {
          png.data[idx]     = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        } else {
          png.data[idx + 3] = 0; // transparent
        }
      }
    }
    return PNG.sync.write(png);
  }

  // Fallback: write a minimal placeholder PNG (1x1 pixel, scaled reference)
  // This is a 16x16 blue square in base64-encoded PNG
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVQ4T2NkYGD4z8BAAowaxMqAMmkYIEFHJHgNhhgiIRqGVRgCABMoAAHHMBpCAAAAAElFTkSuQmCC';
  return Buffer.from(b64, 'base64');
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

try {
  for (const size of [16, 48, 128]) {
    const buf = makePng(size, 14, 165, 233); // sky-500 blue
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
    console.log(`✓ icons/icon${size}.png`);
  }
  console.log('\nIcons generated. Load the extension in Chrome: chrome://extensions → Load unpacked → select browser-extension/');
} catch (err) {
  console.error('Error generating icons:', err.message);
  console.log('\nTo generate icons manually, install pngjs: npm install pngjs, then run this script again.');
  console.log('Or use any image editor to create 16x16, 48x48, 128x128 PNG files in the icons/ folder.');
}
