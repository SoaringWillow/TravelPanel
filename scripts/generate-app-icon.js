#!/usr/bin/env node
/**
 * Generates TravelPanel app icon PNGs at all required iOS sizes.
 * Pure Node.js — no external dependencies.
 *
 * Output: ios/App/App/Assets.xcassets/AppIcon.appiconset/
 * Run:    node scripts/generate-app-icon.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── PNG encoder ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4);
  lb.writeUInt32BE(data.length);
  const cb = Buffer.allocUnsafe(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function encodePNG(pixels, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter byte
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (1 + w * 4) + 1 + x * 4;
      raw[di]     = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

function generateIconPixels(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Background: indigo gradient (#4338CA → #6366F1)
  const bg1 = [67, 56, 202];  // #4338CA (top)
  const bg2 = [99, 102, 241]; // #6366F1 (bottom)

  // Pin geometry (proportional to icon size)
  const cx  = size / 2;
  const outerR = size * 0.196;   // ~200px at 1024
  const innerR = size * 0.073;   // ~75px at 1024
  const headCY = size * 0.363;   // ~372px at 1024
  const tipY   = size * 0.832;   // ~852px at 1024
  const cornerR = size * 0.224;  // iOS icon corner radius ≈ 22.4% of size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // ── Rounded-rect clipping (iOS icon mask) ─────────────────────────────
      const rx = Math.min(x, size - 1 - x);
      const ry = Math.min(y, size - 1 - y);
      if (rx < cornerR && ry < cornerR) {
        const dx = cornerR - rx - 1;
        const dy = cornerR - ry - 1;
        if (Math.sqrt(dx * dx + dy * dy) > cornerR) {
          pixels[i + 3] = 0; // transparent outside corner
          continue;
        }
      }

      // ── Background gradient ────────────────────────────────────────────────
      const t = y / (size - 1);
      const r = Math.round(bg1[0] + (bg2[0] - bg1[0]) * t);
      const g = Math.round(bg1[1] + (bg2[1] - bg1[1]) * t);
      const b = Math.round(bg1[2] + (bg2[2] - bg1[2]) * t);
      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;

      // ── Pin shape ─────────────────────────────────────────────────────────
      const dx = x - cx;
      const dy = y - headCY;
      const distSq = dx * dx + dy * dy;

      let inPin = false;

      // Circle head
      if (distSq <= outerR * outerR) {
        inPin = true;
      }
      // Tapered body (below center → tip)
      else if (y > headCY && y <= tipY) {
        const progress = (y - headCY) / (tipY - headCY);
        const halfW = outerR * (1 - progress);
        if (Math.abs(dx) <= halfW) inPin = true;
      }

      // Inner hole (makes it a proper pin icon)
      const inHole = distSq <= innerR * innerR;

      if (inPin && !inHole) {
        // White pin with subtle shadow tint
        const shade = y < headCY ? 255 : Math.round(255 * (1 - 0.08 * ((y - headCY) / (tipY - headCY))));
        pixels[i]     = shade;
        pixels[i + 1] = shade;
        pixels[i + 2] = shade;
        pixels[i + 3] = 255;
      }
    }
  }

  return pixels;
}

// ─── iOS icon sizes ───────────────────────────────────────────────────────────

const ICON_SIZES = [
  { name: 'Icon-20@2x.png',    size: 40  },
  { name: 'Icon-20@3x.png',    size: 60  },
  { name: 'Icon-29@2x.png',    size: 58  },
  { name: 'Icon-29@3x.png',    size: 87  },
  { name: 'Icon-40@2x.png',    size: 80  },
  { name: 'Icon-40@3x.png',    size: 120 },
  { name: 'Icon-60@2x.png',    size: 120 },
  { name: 'Icon-60@3x.png',    size: 180 },
  { name: 'Icon-76.png',       size: 76  },
  { name: 'Icon-76@2x.png',    size: 152 },
  { name: 'Icon-83.5@2x.png',  size: 167 },
  { name: 'Icon-1024.png',     size: 1024 },
];

const CONTENTS_JSON = {
  images: ICON_SIZES.map(({ name, size }) => ({
    filename: name,
    idiom: size === 76 || size === 152 || size === 167 ? 'ipad' : 'iphone',
    scale: name.includes('@3x') ? '3x' : name.includes('@2x') ? '2x' : '1x',
    size: size === 1024 ? '1024x1024' : `${Math.round(size / (name.includes('@3x') ? 3 : name.includes('@2x') ? 2 : 1))}x${Math.round(size / (name.includes('@3x') ? 3 : name.includes('@2x') ? 2 : 1))}`,
  })),
  info: { author: 'xcode', version: 1 },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch { /* already exists */ }

console.log('Generating TravelPanel app icons…');

for (const { name, size } of ICON_SIZES) {
  process.stdout.write(`  ${name} (${size}×${size})… `);
  const pixels = generateIconPixels(size);
  const png = encodePNG(pixels, size, size);
  fs.writeFileSync(path.join(OUT_DIR, name), png);
  console.log('✓');
}

fs.writeFileSync(
  path.join(OUT_DIR, 'Contents.json'),
  JSON.stringify(CONTENTS_JSON, null, 2)
);

console.log('\nDone! All icons written to:');
console.log(`  ${OUT_DIR}`);
console.log('\nOpen Xcode → Assets.xcassets → AppIcon to verify.');
