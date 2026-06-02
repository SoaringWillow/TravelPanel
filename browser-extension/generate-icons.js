#!/usr/bin/env node
/**
 * Generates TravelPanel extension icons (PNG) without external dependencies.
 * Run: node generate-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── CRC32 table ─────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32BE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crcVal = crc32(Buffer.concat([tb, db]));
  return Buffer.concat([u32BE(db.length), tb, db, u32BE(crcVal)]);
}

// ─── PNG writer (RGBA) ────────────────────────────────────────────────────────
function writePNG(w, h, pixels) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Raw scanlines: 1 filter byte per row + RGBA pixels
  const raw = Buffer.allocUnsafe(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (w * 4 + 1) + 1 + x * 4;
      raw[di]     = pixels[si];     // R
      raw[di + 1] = pixels[si + 1]; // G
      raw[di + 2] = pixels[si + 2]; // B
      raw[di + 3] = pixels[si + 3]; // A
    }
  }

  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon renderer ────────────────────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR = size * 0.48;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > outerR + 1) {
        // Fully transparent outside
        pixels[idx + 3] = 0;
        continue;
      }

      // Gradient: indigo (#4F46E5) → blue (#2563EB) top→bottom
      const t = y / size;
      const r = lerp(79, 37, t);
      const g = lerp(70, 99, t);
      const b = lerp(229, 235, t);
      const alpha = dist > outerR ? Math.round(255 * (outerR + 1 - dist)) : 255;

      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = alpha;
    }
  }

  // Draw a white 4-pointed star (compass rose) in the center
  if (size >= 16) {
    const spokeLen = size * 0.30;
    const innerStar = size * 0.09;
    const starPoints = 4;
    const cx2 = cx, cy2 = cy;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        if (pixels[idx + 3] === 0) continue;

        const dx = x - cx2;
        const dy = y - cy2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > spokeLen + 1 || dist < 0.5) continue;

        // Is this pixel inside the 4-pointed star shape?
        // A 4-pointed star: abs(angle modulo 90 - 45) < threshold scaled by radius
        const angle = Math.atan2(dy, dx);
        // Normalize angle to [0, PI/2] — one quadrant
        const quadAngle = ((angle % (Math.PI / 2)) + Math.PI) % (Math.PI / 2);
        const starAngle = Math.abs(quadAngle - Math.PI / 4); // distance from 45°

        // At this distance from center, the star is wide at the arms (angle≈0°,45°,90°)
        // and narrows between arms. Use a simple diamond cross shape:
        // |x'| + |y'| ≤ spokeLen (rotated 45°)
        const absA = Math.abs(dx) + Math.abs(dy);
        const absB = Math.abs(Math.abs(dx) - Math.abs(dy));

        // Spoke: narrow perpendicular width, full axial length
        const spokeW = Math.max(1, size * 0.09);
        const onHorizSpoke = Math.abs(dy) < spokeW && Math.abs(dx) <= spokeLen;
        const onVertSpoke = Math.abs(dx) < spokeW && Math.abs(dy) <= spokeLen;

        if (onHorizSpoke || onVertSpoke) {
          // Edge smoothing
          const perpDist = onHorizSpoke ? Math.abs(dy) : Math.abs(dx);
          const fade = perpDist > spokeW - 1 ? Math.round(255 * (spokeW - perpDist)) : 255;
          if (fade > 0) {
            pixels[idx]     = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = Math.min(pixels[idx + 3], 255);
            // Blend white over existing blue
            const bg_a = pixels[idx + 3] / 255;
            pixels[idx]     = Math.round(255 * (fade / 255) + pixels[idx]     * (1 - fade / 255));
            pixels[idx + 1] = Math.round(255 * (fade / 255) + pixels[idx + 1] * (1 - fade / 255));
            pixels[idx + 2] = Math.round(255 * (fade / 255) + pixels[idx + 2] * (1 - fade / 255));
          }
        }
      }
    }

    // Center dot — white circle
    const dotR = Math.max(1.5, size * 0.07);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        if (pixels[idx + 3] === 0) continue;
        const dist = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2);
        if (dist <= dotR) {
          const fade = dist > dotR - 1 ? Math.round(255 * (dotR - dist)) : 255;
          pixels[idx]     = lerp(pixels[idx],     255, fade / 255);
          pixels[idx + 1] = lerp(pixels[idx + 1], 255, fade / 255);
          pixels[idx + 2] = lerp(pixels[idx + 2], 255, fade / 255);
        }
      }
    }
  }

  return writePNG(size, size, pixels);
}

// ─── Generate ─────────────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf = createIcon(size);
  const out = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ icon-${size}.png (${buf.length} bytes)`);
}

console.log('\nDone! Icons written to ./icons/');
