// Run with: node generate-icons.js
// Requires: npm install canvas (or use sharp)
// Generates PNG icons for the browser extension

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const r      = size * 0.15; // corner radius

  // Background gradient (indigo → violet)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');

  // Rounded rect
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

  // ✈️ plane emoji or simple plane shape
  ctx.fillStyle = 'white';
  ctx.font      = `bold ${size * 0.55}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', size / 2, size / 2 + size * 0.03);

  return canvas;
}

SIZES.forEach(size => {
  const canvas  = drawIcon(size);
  const outPath = path.join(__dirname, `icon${size}.png`);
  const buf     = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`Generated ${outPath}`);
});

console.log('Done!');
