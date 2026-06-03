/**
 * Generates PNG icons for the TravelPanel extension using only built-in Node.js modules.
 * Draws a simple travel-pin icon in TravelPanel indigo (#6366F1).
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

function u32be(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBytes, data]);
  return Buffer.concat([u32be(data.length), typeBytes, data, u32be(crc32(combined))]);
}

/**
 * Draws a map-pin icon: rounded circle on top, pointed tail below.
 * Colors: indigo fill (#6366F1), white center dot, white background.
 */
function makePNG(size) {
  const PIN_R = 99, PIN_G = 102, PIN_B = 241;   // Indigo 500
  const BG_R = 255, BG_G = 255, BG_B = 255;
  const DOT_R = 255, DOT_G = 255, DOT_B = 255;

  const cx = size / 2;
  const headCy = size * 0.38;
  const headR = size * 0.34;
  const dotR = size * 0.12;
  // Pin tail: a triangle point at the bottom center
  const tailTipY = size * 0.92;
  const tailHalfWidth = size * 0.18;
  const tailTopY = headCy + headR * 0.6;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      let r = BG_R, g = BG_G, b = BG_B;

      // Check if pixel is in the pin head (circle)
      const dHead = Math.sqrt((x - cx) ** 2 + (y - headCy) ** 2);
      if (dHead <= headR) {
        r = PIN_R; g = PIN_G; b = PIN_B;
        // White center dot
        const dDot = Math.sqrt((x - cx) ** 2 + (y - headCy) ** 2);
        if (dDot <= dotR) {
          r = DOT_R; g = DOT_G; b = DOT_B;
        }
      } else if (y >= tailTopY && y <= tailTipY) {
        // Tail triangle: linearly shrinks from tailHalfWidth to 0
        const progress = (y - tailTopY) / (tailTipY - tailTopY);
        const halfW = tailHalfWidth * (1 - progress);
        if (Math.abs(x - cx) <= halfW) {
          r = PIN_R; g = PIN_G; b = PIN_B;
        }
      }

      const px = 1 + x * 3;
      row[px] = r;
      row[px + 1] = g;
      row[px + 2] = b;
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = deflateSync(rawData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB truecolor

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const png = makePNG(size);
  writeFileSync(join(iconsDir, `icon${size}.png`), png);
  console.log(`✓ icons/icon${size}.png`);
}
