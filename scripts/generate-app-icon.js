#!/usr/bin/env node
// Generates all required iOS app icon sizes.
// No external dependencies — uses Node's built-in zlib.
// Output: ios/App/App/Assets.xcassets/AppIcon.appiconset/
'use strict';

const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(size, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      rows.push(r, g, b, a);
    }
  }

  const compressed = deflateSync(Buffer.from(rows));
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon pixel function ──────────────────────────────────────────────────────
// Teal (#0d9488) rounded-rect background + white map pin centered

function lerp(a, b, t) { return a + (b - a) * t; }

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function iconPixel(x, y, size) {
  const s = size;
  // Teal bg: #0d9488 = rgb(13, 148, 136)
  const [BG_R, BG_G, BG_B] = [13, 148, 136];
  // Slightly darker teal for gradient depth
  const [BG_R2, BG_G2, BG_B2] = [8, 110, 100];

  // Rounded rectangle background with iOS-style radius (~22% of size)
  const cornerR = s * 0.22;
  const cx = s / 2, cy = s / 2;

  // SDF for rounded rect
  const qx = Math.abs(x - cx) - (s / 2 - cornerR);
  const qy = Math.abs(y - cy) - (s / 2 - cornerR);
  const rrDist = Math.sqrt(Math.max(0, qx) ** 2 + Math.max(0, qy) ** 2) + Math.min(Math.max(qx, qy), 0) - cornerR;

  const aa = s * 0.008; // antialiasing width
  const bgAlpha = 1 - smoothstep(-aa, aa, rrDist);
  if (bgAlpha < 0.01) return [0, 0, 0, 0];

  // Vertical gradient: top = BG_R, bottom = BG_R2
  const grad = y / s;
  const bgR = Math.round(lerp(BG_R, BG_R2, grad));
  const bgG = Math.round(lerp(BG_G, BG_G2, grad));
  const bgB = Math.round(lerp(BG_B, BG_B2, grad));

  // Map pin (white)
  // Pin head: circle in upper 55%
  const pinCX = s * 0.5;
  const pinCY = s * 0.40;
  const pinR = s * 0.22;
  const holeR = pinR * 0.40;
  const stemTop = pinCY + pinR * 0.65;
  const stemBot = s * 0.78;

  const pdx = x - pinCX;
  const pdy = y - pinCY;
  const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

  const edge = Math.max(1, s * 0.015);
  const circleA = smoothstep(pinR + edge, pinR - edge, pdist);
  const holeA = smoothstep(holeR - edge, holeR + edge, pdist);

  // Stem: tapering triangle
  const stemProgress = Math.max(0, (y - stemTop) / (stemBot - stemTop));
  const stemHW = pinR * 0.32 * (1 - stemProgress);
  const inStemY = y >= stemTop && y <= stemBot + 1;
  const stemA = inStemY ? smoothstep(stemHW + 1, stemHW - 0.5, Math.abs(pdx)) : 0;

  // Combine: pin = circle (minus hole) + stem
  const pinA = Math.max(circleA * holeA, stemA);

  if (pinA > 0.01) {
    // Inside the hole — teal background shows through
    if (circleA > 0.5 && holeA < 0.5) {
      const holeFill = 1 - holeA;
      const outR = Math.round(lerp(bgR, 255, holeFill));
      const outG = Math.round(lerp(bgG, 255, holeFill));
      const outB = Math.round(lerp(bgB, 255, holeFill));
      return [outR, outG, outB, Math.round(bgAlpha * 255)];
    }
    // White pin
    const r = Math.round(lerp(bgR, 255, pinA));
    const g = Math.round(lerp(bgG, 255, pinA));
    const b = Math.round(lerp(bgB, 255, pinA));
    return [r, g, b, Math.round(bgAlpha * 255)];
  }

  return [bgR, bgG, bgB, Math.round(bgAlpha * 255)];
}

// ─── iOS required sizes ───────────────────────────────────────────────────────

const SIZES = [
  { pt: 20, scale: 1 }, { pt: 20, scale: 2 }, { pt: 20, scale: 3 },
  { pt: 29, scale: 1 }, { pt: 29, scale: 2 }, { pt: 29, scale: 3 },
  { pt: 40, scale: 1 }, { pt: 40, scale: 2 }, { pt: 40, scale: 3 },
  { pt: 60, scale: 2 }, { pt: 60, scale: 3 },
  { pt: 76, scale: 1 }, { pt: 76, scale: 2 },
  { pt: 83.5, scale: 2 },
  { pt: 1024, scale: 1 },
];

const outDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
fs.mkdirSync(outDir, { recursive: true });

const images = [];
const pngCache = new Map();

for (const { pt, scale } of SIZES) {
  const px = Math.round(pt * scale);
  const filename = `AppIcon-${pt}@${scale}x.png`;

  if (!pngCache.has(px)) {
    pngCache.set(px, makePNG(px, iconPixel));
  }
  const png = pngCache.get(px);
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`✓ ${filename} (${px}×${px}px, ${png.length} bytes)`);

  images.push({
    filename,
    idiom: pt >= 76 && pt <= 83.5 ? 'ipad' : 'iphone',
    scale: `${scale}x`,
    size: `${pt}x${pt}`,
  });
}

// Also write the 1024 universal icon (App Store)
const appStoreFile = 'AppIcon-1024.png';
const appStorePng = makePNG(1024, iconPixel);
fs.writeFileSync(path.join(outDir, appStoreFile), appStorePng);
console.log(`✓ ${appStoreFile} (1024×1024px, App Store)`);

const contents = {
  images: [
    ...images,
    {
      filename: appStoreFile,
      idiom: 'universal',
      platform: 'ios',
      size: '1024x1024',
    },
  ],
  info: { author: 'travelpanel-script', version: 1 },
};

fs.writeFileSync(path.join(outDir, 'Contents.json'), JSON.stringify(contents, null, 2));
console.log('✓ Contents.json updated');
console.log('\nAll app icons generated successfully.');
