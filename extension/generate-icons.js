#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Run once: node generate-icons.js
 * Requires: npm install canvas  (or use node-canvas)
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.14; // corner radius

  // Background rounded rect
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
  ctx.fillStyle = '#4f46e5';
  ctx.fill();

  // Pin / location icon
  const cx = size / 2;
  const headR = size * 0.22;
  const headY = size * 0.35;
  const tailY = size * 0.82;
  const lw = Math.max(1.5, size * 0.06);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';

  // Circle (pin head)
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Teardrop tail
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.7, headY + headR * 0.7);
  ctx.bezierCurveTo(
    cx - headR * 0.4, headY + headR * 1.6,
    cx,               tailY - size * 0.02,
    cx,               tailY
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + headR * 0.7, headY + headR * 0.7);
  ctx.bezierCurveTo(
    cx + headR * 0.4, headY + headR * 1.6,
    cx,               tailY - size * 0.02,
    cx,               tailY
  );
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of SIZES) {
  const buf  = drawIcon(size);
  const dest = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✓ icons/icon${size}.png`);
}

console.log('Icons generated successfully.');
