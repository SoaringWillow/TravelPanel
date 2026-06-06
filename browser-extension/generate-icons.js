#!/usr/bin/env node
// Generates icon16.png, icon48.png, icon128.png in ./icons/
// No npm dependencies — pure Node.js with built-in zlib.

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([t, data]);
  return Buffer.concat([u32(data.length), t, data, u32(crc32(payload))]);
}

// ── Draw icon ────────────────────────────────────────────────────────────────
// Draws a rounded-square background (indigo) with a simple paper-plane shape
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // RGBA

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;           // background circle radius
  const cornerR = size * 0.22;     // rounded square corner radius

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;

      // Rounded square background
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const inBg = ax <= r && ay <= r &&
        (ax <= r - cornerR || ay <= r - cornerR ||
          (ax - (r - cornerR)) ** 2 + (ay - (r - cornerR)) ** 2 <= cornerR ** 2);

      if (!inBg) {
        pixels[idx + 3] = 0; // transparent
        continue;
      }

      // Gradient: top-left #2563eb, bottom-right #4f46e5
      const t = (dx + dy + 2 * r) / (4 * r);
      const bgR = Math.round(37 + t * (79 - 37));
      const bgG = Math.round(99 + t * (70 - 99));
      const bgB = Math.round(235 + t * (229 - 235));

      // Paper-plane (▷ pointing right) — 3 strokes via distance field
      // Wing: line from top-right to center-left
      // Body: line from top-right to bottom-center
      const sc = size / 48; // scale from 48px reference
      const planePoints = {
        tip:    { x: cx + 14 * sc, y: cy },
        left:   { x: cx - 14 * sc, y: cy - 4 * sc },
        bottom: { x: cx - 14 * sc, y: cy + 10 * sc },
        mid:    { x: cx - 2 * sc, y: cy + 3 * sc },
      };

      function ptLineDist2(px, py, ax, ay, bx, by) {
        const abx = bx - ax, aby = by - ay;
        const len2 = abx * abx + aby * aby;
        if (len2 === 0) return (px - ax) ** 2 + (py - ay) ** 2;
        let t = ((px - ax) * abx + (py - ay) * aby) / len2;
        t = Math.max(0, Math.min(1, t));
        return (px - (ax + t * abx)) ** 2 + (py - (ay + t * aby)) ** 2;
      }

      const px = x + 0.5, py = y + 0.5;
      const stroke = 1.4 * sc;
      const s2 = stroke * stroke;

      const onWing = ptLineDist2(px, py, planePoints.left.x, planePoints.left.y, planePoints.tip.x, planePoints.tip.y) < s2;
      const onBody = ptLineDist2(px, py, planePoints.tip.x, planePoints.tip.y, planePoints.bottom.x, planePoints.bottom.y) < s2;
      const onFold = ptLineDist2(px, py, planePoints.left.x, planePoints.left.y, planePoints.mid.x, planePoints.mid.y) < s2;

      if (onWing || onBody || onFold) {
        pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 220;
      } else {
        pixels[idx] = bgR; pixels[idx + 1] = bgG; pixels[idx + 2] = bgB; pixels[idx + 3] = 255;
      }
    }
  }
  return pixels;
}

// ── PNG encode ────────────────────────────────────────────────────────────────
function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.concat([
    u32(size), u32(size),
    Buffer.from([8, 6, 0, 0, 0]), // 8-bit RGBA
  ]);
  const ihdr = pngChunk('IHDR', ihdrData);

  // Raw image data with filter byte per row
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0); // filter None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rows.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rows), { level: 9 });
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ── Write files ───────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, pixels);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}

console.log('\nIcons generated successfully.');
