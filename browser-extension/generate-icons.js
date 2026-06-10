/**
 * Generates PNG icons for the TravelPanel Clipper extension.
 * Run once before loading the extension: node generate-icons.js
 * Outputs: icons/icon16.png, icon32.png, icon48.png, icon128.png
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Minimal PNG encoder ──────────────────────────────────────────────────────

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4);
  lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

/**
 * Creates a PNG from a pixel function: (x, y, size) → [r, g, b, a]
 * Uses RGBA color type (8-bit, 4 channels).
 */
function makePNG(size, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  // compression, filter, interlace all 0

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      raw.push(r, g, b, a);
    }
  }

  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon pixel function ──────────────────────────────────────────────────────

/**
 * Draws a sky-blue/indigo rounded-square background with a white location pin.
 * The pin is sized proportionally so it looks good at all sizes.
 */
function iconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;
  const r = size * 0.18; // corner radius

  // ── Rounded rectangle test ──
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const isInRect =
    (dx <= half - r) ||
    (dy <= half - r) ||
    (Math.hypot(dx - (half - r), dy - (half - r)) <= r);

  if (!isInRect) return [0, 0, 0, 0]; // transparent

  // ── Background gradient: top #0ea5e9 → bottom #6366f1 ──
  const t = y / size;
  const bgR = Math.round(14  + (99  - 14)  * t);
  const bgG = Math.round(165 + (102 - 165) * t);
  const bgB = Math.round(233 + (241 - 233) * t);

  // ── Location pin ──
  // Pin circle head centered at (cx, cy - pinOffset)
  const pinHeadR  = size * 0.24;
  const pinOffset = size * 0.08; // shift pin slightly upward
  const pinCY     = cy - pinOffset;

  const distHead = Math.hypot(x - cx, y - pinCY);

  if (distHead <= pinHeadR) {
    // White head with a small "hole" to suggest hollow pin
    const holeR = pinHeadR * 0.38;
    if (distHead <= holeR) return [bgR, bgG, bgB, 255]; // show background through hole
    return [255, 255, 255, 255];
  }

  // Pin tail: tapered triangle below the circle
  const tailTopY    = pinCY + pinHeadR * 0.85;
  const tailBottomY = pinCY + size * 0.42;
  const tailProgress = (y - tailTopY) / (tailBottomY - tailTopY);

  if (y >= tailTopY && y <= tailBottomY) {
    const halfW = pinHeadR * 0.38 * (1 - tailProgress);
    if (Math.abs(x - cx) <= halfW) return [255, 255, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

// ─── Generate files ───────────────────────────────────────────────────────────

const SIZES = [16, 32, 48, 128];
const outDir = path.join(__dirname, 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const size of SIZES) {
  const buf = makePNG(size, iconPixel);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`✓  icons/icon${size}.png  (${buf.length} bytes)`);
}

console.log('\nIcons generated. Load the extension in Chrome:');
console.log('  chrome://extensions → Enable Developer mode → Load unpacked → select browser-extension/');
