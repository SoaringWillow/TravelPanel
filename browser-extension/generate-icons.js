// Run with: node generate-icons.js
// Requires: npm install canvas
// Or use any SVG→PNG converter with icons/icon.svg as source

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.12; // corner radius

  // Background: indigo-600 (#4F46E5)
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
  ctx.fillStyle = '#4F46E5';
  ctx.fill();

  // Map pin: white
  const cx = size / 2;
  const pinTop = size * 0.2;
  const pinR = size * 0.22;
  const tailY = size * 0.78;

  ctx.fillStyle = '#FFFFFF';
  // Pin circle
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (teardrop bottom)
  ctx.beginPath();
  ctx.moveTo(cx - pinR * 0.55, pinTop + pinR * 1.5);
  ctx.quadraticCurveTo(cx - pinR * 0.1, tailY, cx, tailY + size * 0.04);
  ctx.quadraticCurveTo(cx + pinR * 0.1, tailY, cx + pinR * 0.55, pinTop + pinR * 1.5);
  ctx.fill();

  // Inner circle cutout (hole in pin)
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

[16, 48, 128].forEach((size) => {
  const buf = drawIcon(size);
  const outPath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Written: ${outPath}`);
});
