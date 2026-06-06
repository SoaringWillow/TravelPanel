// Generates extension PNG icons using only built-in Node.js modules
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CRC32 ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG writer ─────────────────────────────────────────────────────────────

function chunk(type, data) {
  const tb = Buffer.from(type);
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function buildPNG(width, height, pixels) {
  // pixels: Uint8Array of width*height*4 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  // compression, filter, interlace remain 0

  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = deflateSync(Buffer.from(raw));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ── Icon drawing ───────────────────────────────────────────────────────────
// Draws an indigo rounded-square background with a white map pin

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const INDIGO = [79, 70, 229];
  const WHITE = [255, 255, 255];

  // Supersampling factor for anti-aliasing
  const SS = size >= 48 ? 4 : 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (px + (sx + 0.5) / SS) / size; // 0..1
          const ny = (py + (sy + 0.5) / SS) / size;

          const [r, g, b, a] = samplePixel(nx, ny);
          rAcc += r * a; gAcc += g * a; bAcc += b * a; aAcc += a;
        }
      }

      const samples = SS * SS;
      const a = aAcc / samples;
      const idx = (py * size + px) * 4;
      if (a > 0) {
        pixels[idx]     = Math.round(rAcc / aAcc);
        pixels[idx + 1] = Math.round(gAcc / aAcc);
        pixels[idx + 2] = Math.round(bAcc / aAcc);
        pixels[idx + 3] = Math.round(a * 255);
      }
    }
  }

  return pixels;
}

function samplePixel(nx, ny) {
  const INDIGO = [79, 70, 229];
  const WHITE = [255, 255, 255];

  // ── Rounded rect background (fills icon, slight inset) ──
  const PAD = 0.0;
  const RADIUS = 0.22; // corner radius as fraction of size

  function sdfRoundedBox(x, y, r) {
    const qx = Math.abs(x - 0.5) - (0.5 - PAD - r);
    const qy = Math.abs(y - 0.5) - (0.5 - PAD - r);
    return (
      Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) +
      Math.min(Math.max(qx, qy), 0) - r
    );
  }

  const bgSdf = sdfRoundedBox(nx, ny, RADIUS);
  if (bgSdf > 0.015) return [0, 0, 0, 0]; // transparent outside

  const bgAlpha = Math.min(1, Math.max(0, 1 - bgSdf / 0.015));

  // ── Map pin ──
  // Pin circle center at ~38% from top, radius ~22% of icon
  const PIN_CX = 0.5;
  const PIN_CY = 0.385;
  const PIN_R = 0.215;

  const dist = Math.sqrt((nx - PIN_CX) ** 2 + (ny - PIN_CY) ** 2);

  // Teardrop tail
  const TAIL_START_Y = PIN_CY + PIN_R * 0.65;
  const TAIL_END_Y = 0.80;
  let inTail = false;
  if (ny >= TAIL_START_Y && ny <= TAIL_END_Y) {
    const t = (ny - TAIL_START_Y) / (TAIL_END_Y - TAIL_START_Y);
    const halfW = PIN_R * (1 - t) * 0.95;
    inTail = Math.abs(nx - PIN_CX) <= halfW;
  }

  const inCircle = dist <= PIN_R;
  const inHole   = dist <= PIN_R * 0.36; // inner hole (background color)

  const inPin = (inCircle || inTail) && !inHole;

  const [r, g, b] = inPin ? WHITE : INDIGO;
  return [r, g, b, bgAlpha];
}

// ── Main ───────────────────────────────────────────────────────────────────

const SIZES = [16, 48, 128];
const outDir = join(__dirname, '..', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  const pixels = drawIcon(size);
  const png = buildPNG(size, size, pixels);
  const path = join(outDir, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`✓  icons/icon-${size}.png  (${png.length} bytes)`);
}
