#!/usr/bin/env node
// Generates icons/icon-{16,32,48,128}.png
// Run once: npm install canvas && node build-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

for (const size of [16, 32, 48, 128]) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Indigo circle background
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // White map pin
  const cx = size / 2;
  const pinRadius = size * 0.22;
  const pinTopCy = size * 0.38;
  const pinTipY = size * 0.78;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, pinTopCy, pinRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - pinRadius * 0.75, pinTopCy + pinRadius * 0.6);
  ctx.lineTo(cx + pinRadius * 0.75, pinTopCy + pinRadius * 0.6);
  ctx.lineTo(cx, pinTipY);
  ctx.closePath();
  ctx.fill();

  // Inner dot (pin hole)
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.arc(cx, pinTopCy, pinRadius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`✓ ${outPath}`);
}

console.log('\nDone. Add to manifest.json:');
console.log(JSON.stringify({
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' } }
}, null, 2));
