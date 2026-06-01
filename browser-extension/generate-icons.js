// Run with: node generate-icons.js
// Generates base64-encoded PNG icons using Canvas API via Node
// Requires: npm install canvas (optional) or just uses SVG data URIs

const fs = require('fs');
const path = require('path');

// Generate a simple SVG icon for each size
function generateSvg(size) {
  const padding = Math.round(size * 0.12);
  const mapSize = size - padding * 2;
  const fontSize = Math.round(size * 0.5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#4f46e5"/>
  <text x="${size/2}" y="${size/2 + fontSize * 0.36}"
        text-anchor="middle" font-size="${fontSize}"
        font-family="-apple-system, sans-serif">🗺</text>
</svg>`;
}

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

sizes.forEach(size => {
  const svg = generateSvg(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Generated icon${size}.svg`);
});

console.log('\nSVG icons generated. For PNG conversion, open icons/*.svg in a browser and save as PNG,');
console.log('or use: npx svgexport icons/icon128.svg icons/icon128.png 128:128');
