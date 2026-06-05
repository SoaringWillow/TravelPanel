#!/usr/bin/env node
// Generates all required iOS app icon sizes from scratch using pure Node.js.
// Run: node ios/App/App/Assets.xcassets/AppIcon.appiconset/generate.js
// No npm dependencies required.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── iOS required sizes ───────────────────────────────────────────────────────

const ICON_SIZES = [
  { size: 20,   scale: 1 },
  { size: 20,   scale: 2 },
  { size: 20,   scale: 3 },
  { size: 29,   scale: 1 },
  { size: 29,   scale: 2 },
  { size: 29,   scale: 3 },
  { size: 38,   scale: 2 },
  { size: 38,   scale: 3 },
  { size: 40,   scale: 1 },
  { size: 40,   scale: 2 },
  { size: 40,   scale: 3 },
  { size: 60,   scale: 2 },
  { size: 60,   scale: 3 },
  { size: 64,   scale: 2 },
  { size: 64,   scale: 3 },
  { size: 68,   scale: 2 },
  { size: 76,   scale: 1 },
  { size: 76,   scale: 2 },
  { size: 83.5, scale: 2 },
  { size: 1024, scale: 1 },
];

// ─── PNG encoder (pure Node.js, no deps) ─────────────────────────────────────

const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([tb, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, tb, data, crcBuf]);
}

function encodePNG(pixels, width, height) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw pixel data (filter byte 0 per scanline)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 3) + 1 + x * 3;
      // Alpha-composite on white background
      const a = pixels[src + 3] / 255;
      raw[dst]     = Math.round(pixels[src]     * a + 255 * (1 - a));
      raw[dst + 1] = Math.round(pixels[src + 1] * a + 255 * (1 - a));
      raw[dst + 2] = Math.round(pixels[src + 2] * a + 255 * (1 - a));
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon drawing ─────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function drawIcon(px) {
  const n = Math.round(px);
  const pixels = new Uint8Array(n * n * 4);

  const r = n / 2;
  const cornerR = n * 0.22;

  function setPixel(x, y, R, G, B, A) {
    if (x < 0 || x >= n || y < 0 || y >= n) return;
    const i = (y * n + x) * 4;
    pixels[i] = R; pixels[i + 1] = G; pixels[i + 2] = B; pixels[i + 3] = A;
  }

  // Anti-aliased rounded rect (indigo-600 #4f46e5)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = Math.max(0, Math.abs(x - r + 0.5) - (r - cornerR));
      const dy = Math.max(0, Math.abs(y - r + 0.5) - (r - cornerR));
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(1, cornerR - dist + 0.5));
      setPixel(x, y, 79, 70, 229, Math.round(alpha * 255));
    }
  }

  // Map pin icon (white) — scaled to icon size
  const s = n / 64; // base design at 64px
  const cx = r;
  const cy = r - 2 * s;
  const pinR = 14 * s;
  const holeR = 5 * s;

  // Pin circle
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < pinR - 0.5) {
        setPixel(x, y, 255, 255, 255, 255);
      } else if (dist < pinR + 0.5) {
        const a = Math.round((pinR + 0.5 - dist) * 255);
        setPixel(x, y, 255, 255, 255, a);
      }
      // Hole
      const hd = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (hd < holeR - 0.5) {
        setPixel(x, y, 79, 70, 229, 255);
      } else if (hd < holeR + 0.5) {
        const a = Math.round((holeR + 0.5 - hd) * 255);
        // blend with white
        const bg = pixels[((Math.round(y) * n + Math.round(x)) * 4)];
        setPixel(x, y, Math.round(lerp(79, bg, a / 255)), Math.round(lerp(70, bg, a / 255)), Math.round(lerp(229, bg, a / 255)), 255);
      }
    }
  }

  // Teardrop tail
  const tailTop = cy + pinR - s;
  const tailBot = cy + pinR + 18 * s;
  const tailW = 5 * s;
  for (let y = Math.round(tailTop); y <= Math.round(tailBot); y++) {
    const t = (y - tailTop) / (tailBot - tailTop);
    const hw = lerp(tailW, 0.5, t);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const edge = hw - Math.abs(x - cx);
      const a = Math.min(1, edge + 0.5);
      setPixel(x, y, 255, 255, 255, Math.round(a * 255));
    }
  }

  return { pixels, n };
}

// ─── Contents.json builder ────────────────────────────────────────────────────

function buildContentsJson(entries) {
  return JSON.stringify({
    images: entries.map(({ filename, size, scale }) => ({
      filename,
      idiom: 'universal',
      platform: 'ios',
      size: `${size}x${size}`,
      scale: `${scale}x`,
    })),
    info: { author: 'travelpanel-generate', version: 1 },
  }, null, 2);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = path.dirname(__filename);
const entries = [];

for (const { size, scale } of ICON_SIZES) {
  const px = size * scale;
  const filename = `AppIcon-${size}@${scale}x.png`;
  const { pixels, n } = drawIcon(px);
  const png = encodePNG(pixels, n, n);
  fs.writeFileSync(path.join(outDir, filename), png);
  entries.push({ filename, size, scale });
  console.log(`  ✓ ${filename} (${n}×${n}px)`);
}

fs.writeFileSync(path.join(outDir, 'Contents.json'), buildContentsJson(entries));
console.log('  ✓ Contents.json updated');
console.log(`\nGenerated ${entries.length} icons in ${outDir}`);
console.log('Next: drag the .xcassets folder into Xcode to refresh asset catalog.');
