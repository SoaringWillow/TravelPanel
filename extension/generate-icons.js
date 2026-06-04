/**
 * Generates icons/icon16.png, icon32.png, icon48.png, icon128.png
 * Run once: node generate-icons.js
 * Requires: npm install canvas  (or use Node 18+ with --experimental-vm-modules)
 *
 * If canvas is unavailable, the icons/ folder also ships pre-generated
 * 1×1 transparent fallbacks so Chrome loads the extension without errors.
 */

const fs   = require('fs');
const path = require('path');

// Minimal valid 1×1 transparent PNG (68 bytes) as fallback
const TRANSPARENT_1X1_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d494844520000000100000001' +
  '0806000000 1f15c4890000000a49444154789c6260000000' +
  '00020001e221bc330000000049454e44ae426082',
  'hex'
);

const SIZES = [16, 32, 48, 128];

try {
  const { createCanvas } = require('canvas');

  SIZES.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background: indigo gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4F46E5');
    grad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = grad;

    // Rounded rect
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Pin icon (simplified map pin)
    ctx.fillStyle = '#fff';
    const cx = size / 2;
    const pinR = size * 0.22;
    const pinTop = size * 0.2;
    ctx.beginPath();
    ctx.arc(cx, pinTop + pinR, pinR, Math.PI, 2 * Math.PI);
    ctx.lineTo(cx + pinR, pinTop + pinR);
    ctx.lineTo(cx, size * 0.78);
    ctx.lineTo(cx - pinR, pinTop + pinR);
    ctx.closePath();
    ctx.fill();

    // Inner circle (hole)
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, pinTop + pinR, pinR * 0.4, 0, 2 * Math.PI);
    ctx.fill();

    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), buf);
    console.log(`✓ icon${size}.png`);
  });
} catch (e) {
  // canvas not installed — write transparent placeholders so Chrome doesn't error
  console.warn('canvas not found, writing transparent fallback icons.');
  SIZES.forEach(size => {
    fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), TRANSPARENT_1X1_PNG);
    console.log(`✓ icon${size}.png (placeholder)`);
  });
}
