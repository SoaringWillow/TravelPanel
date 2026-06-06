// Run with: node generate-icons.js
// Requires: npm install sharp (or use any SVG-to-PNG tool)
// Alternative: use https://convertio.co or Inkscape to export icon.svg at 16/48/128px

const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

async function generate() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('sharp not installed. Install with: npm install sharp');
    console.log('Then re-run: node generate-icons.js');
    console.log('');
    console.log('Alternative: Export icon.svg at these sizes using Inkscape, Figma, or');
    console.log('any vector tool, save as icon16.png, icon48.png, icon128.png');
    process.exit(1);
  }

  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const buf = Buffer.from(svgContent);
    await sharp(buf)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon${size}.png`));
    console.log(`Generated icon${size}.png`);
  }
  console.log('Done!');
}

generate().catch(console.error);
