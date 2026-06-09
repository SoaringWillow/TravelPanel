/**
 * Run with Node.js to generate the PNG icons from the SVG source.
 * Requires: npm install -g sharp  (or: npx sharp-cli)
 *
 * Usage: node generate-icons.js
 *
 * Output: icon-16.png, icon-32.png, icon-48.png, icon-128.png
 */

const fs   = require('fs');
const path = require('path');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="64" fill="#6366f1"/>
  <!-- Map pin (white) -->
  <path fill="#ffffff" d="
    M64 18
    C46.3 18 32 32.3 32 50
    C32 74.5 64 110 64 110
    S96 74.5 96 50
    C96 32.3 81.7 18 64 18Z
  "/>
  <!-- Inner circle (indigo) -->
  <circle cx="64" cy="50" r="13" fill="#6366f1"/>
</svg>`;

// Try to use sharp if available
try {
  const sharp = require('sharp');
  const sizes = [16, 32, 48, 128];
  const svgBuf = Buffer.from(SVG);

  Promise.all(sizes.map(size =>
    sharp(svgBuf)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon-${size}.png`))
      .then(() => console.log(`✓ icon-${size}.png`))
  )).then(() => console.log('\nDone! Icons generated.'));
} catch (e) {
  console.error('sharp not found. Install it: npm install -g sharp');
  console.error('Or use any SVG→PNG converter with the SVG source in icon.svg');

  // Write the SVG source so it can be converted manually
  fs.writeFileSync(path.join(__dirname, 'icon.svg'), SVG);
  console.log('\nWrote icon.svg — convert to PNG manually at sizes 16, 32, 48, 128px.');
}
