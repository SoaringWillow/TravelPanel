/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Uses only Node.js built-ins (zlib + Buffer + fs) — no npm dependencies.
 * Run: node extension/icons/generate-icons.mjs
 */
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

// ── CRC32 table ───────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0);
}

// ── PNG chunk builder ─────────────────────────────────────────────────────
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf    = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── Draw a travel-pin icon on an RGBA grid ────────────────────────────────
function drawIcon(size) {
  // Each pixel: [r, g, b, a]
  const pixels = new Uint8ClampedArray(size * size * 4); // all transparent

  const cx = size / 2;
  const cy = size * 0.42;

  // Palette
  const indigo  = [99,  102, 241, 255]; // #6366f1
  const white   = [255, 255, 255, 255];
  const shadow  = [79,  70,  229, 200]; // darker indigo, semi-transparent

  function setPixel(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha blend over transparent background
    const a = color[3] / 255;
    pixels[i]     = Math.round(color[0] * a);
    pixels[i + 1] = Math.round(color[1] * a);
    pixels[i + 2] = Math.round(color[2] * a);
    pixels[i + 3] = color[3];
  }

  function fillCircle(ox, oy, r, color) {
    for (let y = Math.floor(oy - r); y <= Math.ceil(oy + r); y++) {
      for (let x = Math.floor(ox - r); x <= Math.ceil(ox + r); x++) {
        const dist = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2);
        if (dist <= r + 0.5) {
          const alpha = Math.min(1, Math.max(0, r + 0.5 - dist));
          setPixel(x, y, [...color.slice(0, 3), Math.round(color[3] * alpha)]);
        }
      }
    }
  }

  // Pin body radius and tail
  const pinR = size * 0.38;
  const tailLen = size * 0.28;
  const tailW   = size * 0.13;

  // Draw teardrop tail (triangle pointing down)
  for (let y = Math.round(cy); y <= Math.round(cy + tailLen); y++) {
    const progress = (y - cy) / tailLen;
    const halfW = tailW * (1 - progress);
    for (let x = Math.round(cx - halfW); x <= Math.round(cx + halfW); x++) {
      const edgeDist = Math.min(x - (cx - halfW), (cx + halfW) - x);
      const alpha = Math.min(1, edgeDist + 0.5);
      setPixel(x, y, [...indigo.slice(0, 3), Math.round(255 * alpha)]);
    }
  }

  // Draw pin circle
  fillCircle(cx, cy, pinR, indigo);

  // White inner dot (hole)
  const holeR = pinR * 0.38;
  fillCircle(cx, cy, holeR, white);

  return pixels;
}

// ── Build PNG buffer ──────────────────────────────────────────────────────
function buildPNG(size) {
  const pixels = drawIcon(size);

  // Raw RGBA scanlines with filter byte 0 per row
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      row[1 + x * 4]     = pixels[src];
      row[1 + x * 4 + 1] = pixels[src + 1];
      row[1 + x * 4 + 2] = pixels[src + 2];
      row[1 + x * 4 + 3] = pixels[src + 3];
    }
    rows.push(row);
  }
  const rawData   = Buffer.concat(rows);
  const compressed = deflateSync(rawData, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA
  ihdr[10] = 0; // deflate compression
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ── Write icons ───────────────────────────────────────────────────────────
for (const size of [16, 48, 128]) {
  const png  = buildPNG(size);
  const path = `extension/icons/icon-${size}.png`;
  writeFileSync(path, png);
  console.log(`✓ ${path} (${png.length} bytes)`);
}
console.log('Icons generated!');
