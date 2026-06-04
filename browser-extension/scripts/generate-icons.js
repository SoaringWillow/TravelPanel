/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Uses only Node.js built-ins (no npm dependencies).
 *
 * Usage: node scripts/generate-icons.js
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 48, 128];
const OUT   = path.join(__dirname, '..', 'icons');

// ── PNG builder ────────────────────────────────────────────────────────────
function createRGBAPNG(width, height, pixels) {
  // pixels: Uint8Array of length width * height * 4 (RGBA)
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[1 + x * 4]     = pixels[i];
      row[1 + x * 4 + 1] = pixels[i + 1];
      row[1 + x * 4 + 2] = pixels[i + 2];
      row[1 + x * 4 + 3] = pixels[i + 3];
    }
    rawRows.push(row);
  }
  const raw        = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(raw);

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', Buffer.concat([
    u32(width), u32(height),
    Buffer.from([8, 6, 0, 0, 0]), // bit-depth=8, colorType=6 (RGBA)
  ]));
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = u32(data.length);
  const crc = u32(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Icon drawing ───────────────────────────────────────────────────────────
// Draws the TravelPanel location-pin logo at given size.
// Color palette: indigo bg (#6366f1), white pin body, indigo inner dot.
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size * 0.42;  // pin circle center (slightly above middle)

  const bgRadius    = size * 0.46;   // rounded-rect approximated as circle
  const pinOuter    = size * 0.26;
  const pinInner    = size * 0.10;
  const tailTipY    = size * 0.88;
  const tailWidth   = size * 0.18;

  // Indigo: #6366f1
  const [iR, iG, iB] = [0x63, 0x66, 0xf1];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx  = x - cx + 0.5;
      const dy  = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background circle (rounded square approximation)
      const bx = x - size / 2 + 0.5;
      const byy = y - size / 2 + 0.5;
      const inBg = Math.abs(bx) < size * 0.46 && Math.abs(byy) < size * 0.46
        && (Math.abs(bx) < size * 0.34 || Math.abs(byy) < size * 0.34
            || Math.hypot(Math.abs(bx) - size * 0.34, Math.abs(byy) - size * 0.34) < size * 0.12);

      if (!inBg) {
        pixels[idx + 3] = 0; // transparent
        continue;
      }

      // Default: indigo background
      pixels[idx]     = iR;
      pixels[idx + 1] = iG;
      pixels[idx + 2] = iB;
      pixels[idx + 3] = 255;

      // Pin tail (white diamond below circle)
      const tailCy = cy + pinOuter * 0.7;
      if (y > tailCy && y < tailTipY) {
        const progress = (y - tailCy) / (tailTipY - tailCy);
        const halfW = tailWidth * (1 - progress);
        if (Math.abs(dx) < halfW) {
          pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 255;
          continue;
        }
      }

      // Pin outer circle (white)
      if (dist < pinOuter) {
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 255;
      }

      // Pin inner dot (indigo)
      if (dist < pinInner) {
        pixels[idx]     = iR;
        pixels[idx + 1] = iG;
        pixels[idx + 2] = iB;
      }
    }
  }

  return pixels;
}

// ── Main ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });

for (const size of SIZES) {
  const pixels = drawIcon(size);
  const png    = createRGBAPNG(size, size, pixels);
  const dest   = path.join(OUT, `icon${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓  icons/icon${size}.png  (${size}×${size})`);
}

console.log('\nDone. Load browser-extension/ as an unpacked extension in Chrome/Edge.');
