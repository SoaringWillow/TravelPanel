/**
 * Run with Node.js to generate PNG icons for the extension.
 * Requires: npm install canvas   (or: node generate-icons.js)
 *
 * If you don't want to install canvas, you can use any 16x16, 32x32,
 * 48x48, and 128x128 PNG files named icons/icon{size}.png.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.18;

  // Rounded background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(1, '#8b5cf6');

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
  ctx.fillStyle = grad;
  ctx.fill();

  // Plane emoji / text
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(size * 0.55)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

for (const size of [16, 32, 48, 128]) {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`Generated icons/icon${size}.png`);
}

console.log('Done!');
