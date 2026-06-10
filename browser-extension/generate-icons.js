// Generates extension PNG icons at 16x16, 48x48, 128x128.
// Run once: node generate-icons.js
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len       = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

// ── Pixel painter ──────────────────────────────────────────────────────────
// Draws a rounded-rect navy background with a white airplane silhouette
function paintPixel(x, y, size) {
  const cx = x / size, cy = y / size; // 0..1 coords
  const margin = 0.1;
  const r      = 0.18; // corner radius fraction

  // Rounded rect test
  const dx = Math.max(0, Math.abs(cx - 0.5) - (0.5 - margin - r));
  const dy = Math.max(0, Math.abs(cy - 0.5) - (0.5 - margin - r));
  const inBg = (dx * dx + dy * dy) <= r * r && cx >= margin && cx <= 1 - margin && cy >= margin && cy <= 1 - margin;

  if (!inBg) return [0, 0, 0, 0]; // transparent

  // Navy background gradient
  const grad = 1 - (cy * 0.25);
  const navyR = Math.round(30 * grad);
  const navyG = Math.round(58 * grad);
  const navyB = Math.round(95 * grad);

  // Simple airplane silhouette (at 48+ px sizes)
  if (size >= 32) {
    // Plane body: diagonal line from lower-left to upper-right
    const px = cx - 0.5, py = cy - 0.5; // centre-relative
    // Rotate 45° (northeast direction)
    const rot = Math.PI / 4;
    const bx  = px * Math.cos(rot) + py * Math.sin(rot);
    const by  = -px * Math.sin(rot) + py * Math.cos(rot);

    const bodyHalf = 0.24, bodyWidth = 0.055;
    const inBody = Math.abs(bx) < bodyHalf && Math.abs(by) < bodyWidth;

    // Main wing
    const wingX = bx + 0.02, wingY = by;
    const wingSpan = 0.17, wingLen = 0.065;
    const inWing = Math.abs(wingX) < wingLen && Math.abs(wingY) < wingSpan;

    // Tail wing (smaller)
    const tailX = bx - 0.18, tailY = by;
    const tailSpan = 0.09, tailLen = 0.04;
    const inTail = Math.abs(tailX) < tailLen && Math.abs(tailY) < tailSpan;

    if (inBody || inWing || inTail) return [255, 255, 255, 255]; // white
  }

  return [navyR, navyG, navyB, 255];
}

// ── PNG builder ────────────────────────────────────────────────────────────
function buildPNG(size) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 6; // RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  // Raw rows: filter-byte + RGBA per pixel
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paintPixel(x, y, size);
      row[1 + x * 4]     = r;
      row[2 + x * 4]     = g;
      row[3 + x * 4]     = b;
      row[4 + x * 4]     = a;
    }
    rows.push(row);
  }

  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Write icons ────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png  = buildPNG(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ icons/icon-${size}.png  (${png.length} bytes)`);
}
console.log('Done!');
