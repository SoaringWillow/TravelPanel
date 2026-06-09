#!/usr/bin/env node
/**
 * Generates PNG icons for the extension from the SVG source.
 * Requires: npm install -g sharp-cli  OR  npx sharp-cli
 * Usage: node generate-icons.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SIZES = [16, 32, 48, 128];
const srcSvg = path.join(__dirname, 'icons', 'icon.svg');
const outDir = path.join(__dirname, 'icons');

function tryWithSharp() {
  try {
    for (const size of SIZES) {
      const outFile = path.join(outDir, `icon${size}.png`);
      execSync(
        `npx sharp --input "${srcSvg}" --output "${outFile}" resize ${size} ${size}`,
        { stdio: 'pipe' }
      );
      console.log(`✓ icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

function tryWithInkscape() {
  try {
    execSync('inkscape --version', { stdio: 'pipe' });
    for (const size of SIZES) {
      const outFile = path.join(outDir, `icon${size}.png`);
      execSync(
        `inkscape --export-type=png --export-filename="${outFile}" --export-width=${size} --export-height=${size} "${srcSvg}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

function tryWithConvert() {
  try {
    execSync('convert --version', { stdio: 'pipe' });
    for (const size of SIZES) {
      const outFile = path.join(outDir, `icon${size}.png`);
      execSync(
        `convert -background none -resize ${size}x${size} "${srcSvg}" "${outFile}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ icon${size}.png`);
    }
    return true;
  } catch {
    return false;
  }
}

console.log('Generating extension icons from icons/icon.svg…\n');

if (tryWithSharp()) {
  console.log('\n✅ Icons generated with sharp.');
} else if (tryWithInkscape()) {
  console.log('\n✅ Icons generated with Inkscape.');
} else if (tryWithConvert()) {
  console.log('\n✅ Icons generated with ImageMagick convert.');
} else {
  console.error(
    '\n❌ Could not auto-generate icons. Please install one of:\n' +
    '   • sharp:      npm install -g sharp-cli\n' +
    '   • Inkscape:   https://inkscape.org\n' +
    '   • ImageMagick: https://imagemagick.org\n' +
    '\nOr manually export icons/icon.svg at 16, 32, 48, and 128px PNG.'
  );
  process.exit(1);
}
