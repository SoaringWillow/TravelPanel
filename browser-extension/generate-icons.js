#!/usr/bin/env node
// Generates icon PNGs for the TravelPanel browser extension.
// Run: node generate-icons.js
// Requires Node.js 14+ (no external dependencies)

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function makePNG(size, drawPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const i = 1 + x * 4;
      row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Smooth step for anti-aliasing
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function drawIcon(x, y, size) {
  const nx = x / (size - 1);
  const ny = y / (size - 1);

  // Blue background with rounded corners
  const bgPad = 0.04;
  const cornerR = 0.22;
  const aa = 1.5 / size; // anti-alias radius

  function inRoundedRect(px, py) {
    const x0 = bgPad + cornerR, y0 = bgPad + cornerR;
    const x1 = 1 - bgPad - cornerR, y1 = 1 - bgPad - cornerR;
    const cx = Math.max(x0, Math.min(x1, px));
    const cy = Math.max(y0, Math.min(y1, py));
    const dist = Math.hypot(px - cx, py - cy);
    return 1 - smoothstep(cornerR - aa, cornerR + aa, dist);
  }

  const bgAlpha = inRoundedRect(nx, ny);
  if (bgAlpha <= 0) return [0, 0, 0, 0];

  // Map pin shape
  // Circle at top center
  const pinCX = 0.5, pinCY = 0.38;
  const outerR = 0.25;
  const innerR = 0.10;

  // Teardrop body (connects circle to tip)
  const tipY = 0.80;
  const bodyTopY = pinCY + outerR * 0.55;
  const bodyHalfW = outerR * 0.58;

  function inPin(px, py) {
    // Circle part
    const dCircle = Math.hypot(px - pinCX, py - pinCY);
    const circleAlpha = 1 - smoothstep(outerR - aa, outerR + aa, dCircle);

    // Teardrop body
    let bodyAlpha = 0;
    if (py >= bodyTopY && py <= tipY) {
      const t = (py - bodyTopY) / (tipY - bodyTopY);
      const hw = bodyHalfW * (1 - t);
      const distX = Math.abs(px - pinCX);
      bodyAlpha = 1 - smoothstep(hw - aa, hw + aa, distX);
    }

    return Math.max(circleAlpha, bodyAlpha);
  }

  function inHole(px, py) {
    const d = Math.hypot(px - pinCX, py - pinCY);
    return 1 - smoothstep(innerR - aa, innerR + aa, d);
  }

  const pinAlpha = inPin(nx, ny);
  const holeAlpha = inHole(nx, ny);
  const finalPinAlpha = Math.max(0, pinAlpha - holeAlpha);

  // Blue: #3B82F6 (59, 130, 246)
  const bgR = 59, bgG = 130, bgB = 246;
  // White pin
  const pinR = 255, pinG = 255, pinB = 255;

  const r = Math.round(bgR * (1 - finalPinAlpha) + pinR * finalPinAlpha);
  const g = Math.round(bgG * (1 - finalPinAlpha) + pinG * finalPinAlpha);
  const b = Math.round(bgB * (1 - finalPinAlpha) + pinB * finalPinAlpha);
  const a = Math.round(255 * bgAlpha);

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const png = makePNG(size, drawIcon);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
}

console.log('Done! Icons created in ./icons/');
