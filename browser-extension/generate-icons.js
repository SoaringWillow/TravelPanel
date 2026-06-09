#!/usr/bin/env node
// Generates simple PNG icons for the browser extension.
// Run: node generate-icons.js
// Requires: npm install canvas  (or uses built-in if available)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const BG = '#6366f1';   // indigo-500
const FG = '#ffffff';

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.fillStyle = BG;
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // Airplane emoji approximation — simple "✈" glyph
  ctx.fillStyle = FG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.floor(size * 0.55);
  ctx.font = `${fontSize}px serif`;
  ctx.fillText('✈', r, r + size * 0.04);

  const out = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`✅ Created ${out}`);
}
