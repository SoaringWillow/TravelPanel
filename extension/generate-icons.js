/**
 * Run once (Node.js + canvas package) to produce the PNG icons required by the
 * Chrome Web Store and the browser's extension system.
 *
 *   npm install canvas
 *   node extension/generate-icons.js
 *
 * Output: extension/icons/icon{16,32,48,128}.png
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.21875; // 28/128 corner radius

  // Rounded rectangle background (indigo → purple gradient approximated as flat)
  ctx.fillStyle = '#6366f1';
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // Pin shape (white)
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  const cx = size / 2;
  const top = size * 0.14;
  const pinH = size * 0.625;
  const pinR = size * 0.265;
  // Circle top + pointed bottom
  ctx.arc(cx, top + pinR, pinR, Math.PI, 0);
  ctx.lineTo(cx + pinR, top + pinR + pinR * 0.9);
  ctx.quadraticCurveTo(cx, top + pinH, cx - 0, top + pinH);
  ctx.quadraticCurveTo(cx - pinR, top + pinR + pinR * 0.9, cx - pinR, top + pinR);
  ctx.closePath();
  ctx.fill();

  // Inner circle (accent)
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, top + pinR, pinR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  const out = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`✓ ${out}`);
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
