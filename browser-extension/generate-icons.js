#!/usr/bin/env node
// Run: node generate-icons.js
// Generates PNG icons from the SVG template using Canvas API (Node.js built-in as of v22, or via canvas package)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.12; // corner radius

  // Background: indigo gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#4f46e5');

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

  // Airplane emoji ✈️ as text
  const fontSize = Math.round(size * 0.6);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', size / 2, size / 2 + size * 0.04);

  return canvas.toBuffer('image/png');
}

for (const size of sizes) {
  const buffer = drawIcon(size);
  const outPath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ icons/icon${size}.png`);
}

console.log('\nIcons generated! Load the extension in Chrome.');
