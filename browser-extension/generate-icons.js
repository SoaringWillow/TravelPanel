// Run with: node generate-icons.js
// Generates PNG icons from SVG using canvas (or just creates placeholder PNGs)
// In production, replace with real PNG files designed by a designer.

const fs = require('fs');
const path = require('path');

// Minimal SVG for each size — a blue map-pin icon
const sizes = [16, 48, 128];

const svg = (size) => {
  const pad = Math.round(size * 0.08);
  const r = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#2563eb"/>
  <g transform="translate(${pad}, ${pad})">
    <path d="M${r/2} ${r*0.08}C${r*0.27} ${r*0.08} ${r*0.1} ${r*0.25} ${r*0.1} ${r*0.46}c0 ${r*0.27} ${r*0.4} ${r*0.68} ${r*0.4} ${r*0.68}s${r*0.4}-${r*0.41} ${r*0.4}-${r*0.68}C${r*0.9} ${r*0.25} ${r*0.73} ${r*0.08} ${r/2} ${r*0.08}z" fill="white"/>
    <circle cx="${r/2}" cy="${r*0.46}" r="${r*0.13}" fill="#2563eb"/>
  </g>
</svg>`;
};

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of sizes) {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg(size));
  console.log(`Written icon${size}.svg`);
}

console.log('\nNote: Convert SVGs to PNGs before publishing to the Chrome Web Store.');
console.log('e.g. with: npx sharp-cli --input icons/icon48.svg --output icons/icon48.png');
