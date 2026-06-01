// Run with: node generate-icons.js
// Requires: npm install canvas (or use the pre-built icons in icons/)
// This script generates the PNG icons from scratch.
// If you don't have canvas, you can use any 16x16 / 48x48 / 128x128 PNG.

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.12;

  // Background — deep blue
  ctx.fillStyle = '#1d4ed8';
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // Plane emoji centred
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', size / 2, size / 2 + size * 0.04);

  return canvas.toBuffer('image/png');
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

for (const size of [16, 48, 128]) {
  const buf = drawIcon(size);
  const dest = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`Written ${dest}`);
}
