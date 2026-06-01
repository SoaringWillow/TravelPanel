/**
 * Generate PNG icons for the TravelPanel browser extension.
 * Uses only Node.js built-ins (no npm dependencies required).
 * Run: node generate-icons.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// TravelPanel brand gradient: indigo #4f46e5 → sky #0ea5e9
// We draw a simple rounded-square icon with a gradient and ✈ silhouette

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const len   = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcVal]);
}

/**
 * Build a PNG from a 2-D array of [r,g,b,a] pixels.
 * pixels[y][x] = [r, g, b, a]  (0–255)
 */
function buildPNG(pixels) {
  const h = pixels.length;
  const w = pixels[0].length;

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8]  = 8;  // bit depth
  ihdrData[9]  = 6;  // RGBA
  ihdrData[10] = 0;  // deflate
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // no interlace

  const rawRows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixels[y][x];
      row[1 + x * 4]     = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rawRows.push(row);
  }
  const raw  = Buffer.concat(rawRows);
  const comp = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdrData),
    chunk('IDAT', comp),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Linear interpolation between two colours */
function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Draw the icon at a given size */
function makeIcon(size) {
  const colA = [79,  70,  229]; // #4f46e5 indigo
  const colB = [14,  165, 233]; // #0ea5e9 sky
  const radius = size * 0.22;   // rounded corner radius

  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;

      // Rounded-rectangle SDF (signed distance to rounded rect edge)
      const dx = Math.max(0, Math.abs(cx - size / 2) - (size / 2 - radius));
      const dy = Math.max(0, Math.abs(cy - size / 2) - (size / 2 - radius));
      const dist = Math.sqrt(dx * dx + dy * dy) - radius;

      if (dist > 1) {
        row.push([0, 0, 0, 0]); // transparent
        continue;
      }

      // Gradient (top-left → bottom-right)
      const t   = (cx + cy) / (size * 2);
      const [r, g, b] = lerp(colA, colB, t);
      const alpha = Math.round(Math.max(0, Math.min(1, 1 - dist)) * 255);

      // Draw a simple airplane shape (›) in white at the centre
      const nx   = (cx / size - 0.5) * 2;   // -1..1
      const ny   = (cy / size - 0.5) * 2;   // -1..1
      const airplaneWhite = isAirplanePixel(nx, ny, size);

      if (airplaneWhite) {
        row.push([255, 255, 255, alpha]);
      } else {
        row.push([r, g, b, alpha]);
      }
    }
    pixels.push(row);
  }
  return pixels;
}

/**
 * Very simple airplane silhouette drawn with parametric shapes.
 * nx, ny are normalised coords in [-1, 1].
 */
function isAirplanePixel(nx, ny, size) {
  const s = size / 128; // scale factor (1 at 128 px)

  // Body: narrow horizontal rectangle
  if (Math.abs(ny) < 0.08 * s * (128 / size) && nx > -0.55 && nx < 0.62) return true;

  // Nose cone: right-pointing triangle
  if (nx > 0.42 && Math.abs(ny) < (0.62 - nx) * 0.55) return true;

  // Main wings: diamond, wider
  const wingW = 0.72;
  const wingH = 0.52;
  if (Math.abs(nx + 0.08) < wingW && Math.abs(ny) < wingH * (1 - Math.abs(nx + 0.08) / wingW)) return true;

  // Tail: smaller triangle at the back left
  const tailXCenter = -0.48;
  const tailHalfW   = 0.18;
  const tailMaxH    = 0.28;
  if (
    nx > tailXCenter - tailHalfW &&
    nx < tailXCenter + tailHalfW &&
    Math.abs(ny) < tailMaxH * (1 - Math.abs(nx - tailXCenter) / tailHalfW)
  ) return true;

  return false;
}

// ── Generate all three sizes ───────────────────────────────────────────────

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const pixels = makeIcon(size);
  const png    = buildPNG(pixels);
  const out    = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated! Load the extension in Chrome:');
console.log('  1. Open chrome://extensions');
console.log('  2. Enable Developer mode');
console.log('  3. Click "Load unpacked" → select browser-extension/');
