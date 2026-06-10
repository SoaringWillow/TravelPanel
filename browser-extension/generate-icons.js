/**
 * Generates PNG icon files for the browser extension.
 * Run with: node generate-icons.js
 * Requires Node.js 18+ (built-in canvas via --experimental-vm-modules) or
 * install the `canvas` package: npm install canvas
 *
 * Alternatively, export the SVG below to PNG at 16/32/48/128px using any
 * image editor and save as icons/icon{size}.png.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size / 2;
  const scale = size / 128;

  // Background gradient pill
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, size, size, size * 0.22);
  ctx.fill();

  // Pin body
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'transparent';

  const cx = r;
  const cy = r * 0.92;
  const pinR = r * 0.52;
  const tailLen = r * 0.52;

  // Drop-pin shape: circle + downward triangle
  ctx.beginPath();
  ctx.arc(cx, cy - pinR * 0.15, pinR, Math.PI, 0, false);
  ctx.lineTo(cx + pinR, cy - pinR * 0.15 + tailLen * 0.3);
  ctx.quadraticCurveTo(cx, cy + tailLen, cx, cy + tailLen);
  ctx.quadraticCurveTo(cx, cy + tailLen, cx - pinR, cy - pinR * 0.15 + tailLen * 0.3);
  ctx.closePath();
  ctx.fill();

  // Inner dot
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, cy - pinR * 0.15, pinR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated ${outPath}`);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
