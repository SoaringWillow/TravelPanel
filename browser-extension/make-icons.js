#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Pure Node.js — no external dependencies.
 *
 * Usage: node make-icons.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeB, data, crcB]);
}

/**
 * Draws a TravelPanel icon:
 *   - Sky-blue rounded square background (#0EA5E9)
 *   - White plane silhouette (✈) centered
 */
function makePNG(size) {
  const bgR = 14, bgG = 165, bgB = 233;   // #0EA5E9
  const fgR = 255, fgG = 255, fgB = 255;  // white

  // Allocate pixel buffer [r,g,b per pixel]
  const pixels = [];
  for (let i = 0; i < size * size; i++) pixels.push([bgR, bgG, bgB]);

  // Rounded-square mask: discard corners
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(dx - radius, dy - radius);
        if (dist > radius) {
          pixels[y * size + x] = [240, 250, 255]; // near-white bg outside rounded square
        }
      }
    }
  }

  // Draw a simplified paper-plane / arrow icon centered
  // Scale everything relative to icon size
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 128;

  function setPixel(px, py) {
    const ix = Math.round(px);
    const iy = Math.round(py);
    if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
      pixels[iy * size + ix] = [fgR, fgG, fgB];
    }
  }

  function fillRect(x, y, w, h) {
    for (let iy = Math.round(y); iy < Math.round(y + h); iy++) {
      for (let ix = Math.round(x); ix < Math.round(x + w); ix++) {
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
          pixels[iy * size + ix] = [fgR, fgG, fgB];
        }
      }
    }
  }

  function fillCircle(cx, cy, r) {
    for (let iy = Math.round(cy - r); iy <= Math.round(cy + r); iy++) {
      for (let ix = Math.round(cx - r); ix <= Math.round(cx + r); ix++) {
        if (Math.hypot(ix - cx, iy - cy) <= r) {
          if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
            pixels[iy * size + ix] = [fgR, fgG, fgB];
          }
        }
      }
    }
  }

  // Paper plane icon (pointing top-right)
  // Body: diagonal line from bottom-left to top-right
  const t = scale;
  // Main wing / body triangle
  // Using polygon fill approximation via horizontal scan lines
  function fillTriangle(x0, y0, x1, y1, x2, y2) {
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    for (let iy = Math.round(minY); iy <= Math.round(maxY); iy++) {
      // Find intersections at this scanline
      const xs = [];
      const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= iy && by > iy) || (by <= iy && ay > iy)) {
          const t = (iy - ay) / (by - ay);
          xs.push(ax + t * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      if (xs.length >= 2) {
        for (let ix = Math.round(xs[0]); ix <= Math.round(xs[1]); ix++) {
          if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
            pixels[iy * size + ix] = [fgR, fgG, fgB];
          }
        }
      }
    }
  }

  // Draw a clean "T" for TravelPanel — simple, legible at all sizes
  const thick = Math.max(1, Math.round(size * 0.11));
  const lw = Math.round(size * 0.60);
  const lh = Math.round(size * 0.58);
  const lx = Math.round(cx - lw / 2);
  const ly = Math.round(cy - lh / 2);

  // Horizontal bar
  fillRect(lx, ly, lw, thick);
  // Vertical bar
  fillRect(cx - thick / 2, ly, thick, lh);

  // Build PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  // bytes 10-12 = 0 (compression, filter, interlace)

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y * size + x];
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓  icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\nIcons generated successfully.');
