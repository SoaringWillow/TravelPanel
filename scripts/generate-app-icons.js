#!/usr/bin/env node
/**
 * Generates app icons for PWA and iOS from the indigo map-pin design.
 * No external dependencies — uses Node built-in zlib.
 *
 * Outputs:
 *   public/icon-192.png
 *   public/icon-512.png
 *   public/apple-touch-icon.png  (180×180)
 *   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png  (1024×1024)
 *
 * Run: node scripts/generate-app-icons.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(dataBytes.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, dataBytes])));
  return Buffer.concat([lenBuf, typeBytes, dataBytes, crcBuf]);
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
// Design: rounded-square (if solid bg) or circle (if transparent)
// Background: indigo gradient, white stylised map pin in center.

function makePNG(size, opts = {}) {
  const {
    solidBg = true,   // true = solid indigo bg (iOS / apple-touch), false = transparent
    padding = 0.15,   // fraction of size as safe-zone padding (for maskable)
  } = opts;

  const BG_R = 99, BG_G = 102, BG_B = 241; // indigo-500 #6366f1
  const BG2_R = 79, BG2_G = 70, BG2_B = 229; // indigo-600 #4f46e5 (gradient end)

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const pad = size * padding;

  // Pin geometry (relative to safe zone)
  const innerSize = size - 2 * pad;
  const pinCx = cx;
  const pinCy = cy - innerSize * 0.04; // slightly above center

  const pinHeadR = innerSize * 0.28;   // radius of the pin head circle
  const pinHoleR = innerSize * 0.10;   // radius of the inner white hole
  const tailW    = innerSize * 0.09;   // width of the pin tail
  const tailH    = innerSize * 0.28;   // height of the pin tail below head

  // Rounded square corner radius for background
  const bgR = size * 0.22;

  // Build raw RGBA rows
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4); // filter byte + RGBA pixels
    row[0] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;

      // ── Background (rounded square with gradient) ──
      let bgAlpha = 0;
      if (solidBg) {
        const rx = Math.abs(dx) - (size / 2 - bgR);
        const ry = Math.abs(dy) - (size / 2 - bgR);
        const cornerDist = rx > 0 && ry > 0 ? Math.hypot(rx, ry) : Math.max(rx, ry);
        bgAlpha = 1 - smoothstep(bgR - 1, bgR + 1, cornerDist + bgR);
      }

      // ── Pin head (circle) ──
      const headDist = Math.hypot(x - pinCx, y - pinCy - tailH * 0.15);
      let pinAlpha = 1 - smoothstep(pinHeadR - 1.2, pinHeadR + 0.5, headDist);

      // ── Pin tail (teardrop/triangle below head) ──
      const tdx = x - pinCx;
      const tdy = y - (pinCy + pinHeadR * 0.6);
      if (tdy > 0) {
        const taper  = 1 - Math.min(tdy / tailH, 1);
        const halfW  = tailW * taper;
        const edge   = Math.abs(tdx) - halfW;
        const tAlpha = 1 - smoothstep(-0.5, 1.5, edge);
        if (tAlpha > pinAlpha) pinAlpha = tAlpha;
      }

      // ── Pin hole ──
      const holeDist = Math.hypot(x - pinCx, y - pinCy);
      const holeAlpha = 1 - smoothstep(pinHoleR - 0.8, pinHoleR + 0.5, holeDist);

      // Combine: white pin on gradient bg, punched with bg-color hole
      // Gradient: top = BG, bottom = BG2
      const t = y / (size - 1);
      const bgR2 = Math.round(BG_R + (BG2_R - BG_R) * t);
      const bgG2 = Math.round(BG_G + (BG2_G - BG_G) * t);
      const bgB2 = Math.round(BG_B + (BG2_B - BG_B) * t);

      let pr, pg, pb, pa;

      if (solidBg) {
        // Always opaque; blend pin (white) over bg
        const pinOnBg  = Math.min(1, pinAlpha);
        const holeShow = holeAlpha * pinAlpha;
        const pinNet   = Math.max(0, pinOnBg - holeShow);
        pr = Math.round(bgR2 + (255 - bgR2) * pinNet);
        pg = Math.round(bgG2 + (255 - bgG2) * pinNet);
        pb = Math.round(bgB2 + (255 - bgB2) * pinNet);
        pa = Math.round(bgAlpha * 255);
      } else {
        // Transparent bg; pin is white, semi-transparent outside
        const eff = Math.max(0, pinAlpha - holeAlpha);
        pr = 255; pg = 255; pb = 255;
        pa = Math.round(eff * 255);
      }

      const off = 1 + x * 4;
      row[off]     = pr;
      row[off + 1] = pg;
      row[off + 2] = pb;
      row[off + 3] = pa;
    }
    rows.push(row);
  }

  const raw   = Buffer.concat(rows);
  const idat  = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate files ────────────────────────────────────────────────────────────

const ROOT    = path.resolve(__dirname, '..');
const PUBLIC  = path.join(ROOT, 'public');
const IOS     = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const SPLASH  = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset');

const targets = [
  { file: path.join(PUBLIC, 'icon-192.png'),         size: 192,  opts: { solidBg: true, padding: 0.12 } },
  { file: path.join(PUBLIC, 'icon-512.png'),         size: 512,  opts: { solidBg: true, padding: 0.12 } },
  { file: path.join(PUBLIC, 'apple-touch-icon.png'), size: 180,  opts: { solidBg: true, padding: 0.10 } },
  { file: path.join(IOS,    'AppIcon-512@2x.png'),   size: 1024, opts: { solidBg: true, padding: 0.10 } },
  // Splash screens — full indigo bg, pin centered, no safe-zone clipping
  { file: path.join(SPLASH, 'splash-2732x2732-2.png'),  size: 2732, opts: { solidBg: true, padding: 0.36 } },
  { file: path.join(SPLASH, 'splash-2732x2732-1.png'),  size: 2732, opts: { solidBg: true, padding: 0.36 } },
  { file: path.join(SPLASH, 'splash-2732x2732.png'),    size: 2732, opts: { solidBg: true, padding: 0.36 } },
];

for (const { file, size, opts } of targets) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const png = makePNG(size, opts);
  fs.writeFileSync(file, png);
  console.log(`✓ ${path.relative(ROOT, file)} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('\nDone! Icons generated successfully.');
