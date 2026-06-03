#!/usr/bin/env node
// Run: node generate-icons.js
// Generates icon16.png, icon48.png, icon128.png in icons/
// Requires: npm install canvas (only needed once for icon generation)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Background gradient circle
  const grad = ctx.createRadialGradient(s * 0.45, s * 0.38, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, '#3B82F6');
  grad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, 2 * Math.PI);
  ctx.fill();

  // Map pin (white)
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const pinCx = s / 2;
  const pinTop = s * 0.14;
  const pinR = s * 0.24;
  const pinTip = s * 0.82;

  ctx.beginPath();
  ctx.arc(pinCx, pinTop + pinR, pinR, Math.PI, 0);
  ctx.quadraticCurveTo(pinCx + pinR + s * 0.05, pinTop + pinR * 1.7, pinCx, pinTip);
  ctx.quadraticCurveTo(pinCx - pinR - s * 0.05, pinTop + pinR * 1.7, pinCx - pinR, pinTop + pinR);
  ctx.closePath();
  ctx.fill();

  // Inner dot (blue)
  ctx.fillStyle = '#1E40AF';
  ctx.beginPath();
  ctx.arc(pinCx, pinTop + pinR, pinR * 0.42, 0, 2 * Math.PI);
  ctx.fill();

  return canvas;
}

[16, 48, 128].forEach((size) => {
  const canvas = drawIcon(size);
  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ icons/icon${size}.png`);
});
