// Run: node generate-icons.mjs
// Generates minimal PNG icons for the extension.
// Requires no external deps — uses a tiny pure-JS PNG encoder.

import { writeFileSync } from 'fs';

// Minimal PNG encoder (no compression — just DEFLATE store blocks)
function encodePNG(width, height, pixels) {
  function adler32(data) {
    let a = 1, b = 0;
    for (const byte of data) { a = (a + byte) % 65521; b = (b + a) % 65521; }
    return (b << 16) | a;
  }
  function crc32(data) {
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    let crc = 0xffffffff;
    for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function u32be(n) { return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]; }

  // Build raw scanlines (RGBA)
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }

  // DEFLATE stored (non-compressed) blocks
  function deflateStore(data) {
    const out = [0x78, 0x01]; // zlib header
    let offset = 0;
    while (offset < data.length) {
      const blockLen = Math.min(65535, data.length - offset);
      const last = (offset + blockLen >= data.length) ? 1 : 0;
      out.push(last);
      out.push(blockLen & 0xff, (blockLen >> 8) & 0xff);
      out.push(~blockLen & 0xff, (~blockLen >> 8) & 0xff);
      for (let i = 0; i < blockLen; i++) out.push(data[offset + i]);
      offset += blockLen;
    }
    const a = adler32(data);
    out.push(...u32be(a));
    return out;
  }

  function chunk(type, data) {
    const typeBytes = [...type].map(c => c.charCodeAt(0));
    const crc = crc32([...typeBytes, ...data]);
    return [...u32be(data.length), ...typeBytes, ...data, ...u32be(crc)];
  }

  const IHDR = chunk('IHDR', [...u32be(width), ...u32be(height), 8, 6, 0, 0, 0]);
  const IDAT = chunk('IDAT', deflateStore(raw));
  const IEND = chunk('IEND', []);
  const sig  = [137, 80, 78, 71, 13, 10, 26, 10];

  return Buffer.from([...sig, ...IHDR, ...IDAT, ...IEND]);
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded-rect background: gradient from #3b82f6 → #8b5cf6
      const t = x / size;
      const r = Math.round(0x3b + t * (0x8b - 0x3b));
      const g = Math.round(0x82 + t * (0x5c - 0x82));
      const b = Math.round(0xf6 + t * (0xf6 - 0xf6));

      // Rounded corners
      const radius = size * 0.22;
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      const inCorner = dx < radius && dy < radius;
      const dist = Math.sqrt((radius - dx) ** 2 + (radius - dy) ** 2);

      if (inCorner && dist > radius) {
        // Transparent (outside rounded corner)
        pixels[i]   = 0;
        pixels[i+1] = 0;
        pixels[i+2] = 0;
        pixels[i+3] = 0;
        continue;
      }

      // Anti-alias edge of corners
      let alpha = 255;
      if (inCorner) {
        alpha = Math.max(0, Math.min(255, Math.round((radius - dist + 0.5) * 255)));
      }

      pixels[i]   = r;
      pixels[i+1] = g;
      pixels[i+2] = b;
      pixels[i+3] = alpha;
    }
  }

  // Draw a simple plane emoji / pin shape in white at center
  // We'll draw a simple "✈" using filled pixels
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 48;

  function drawCircle(px, py, rad, rr, gg, bb, aa) {
    const x0 = Math.max(0, Math.floor(px - rad - 1));
    const x1 = Math.min(size - 1, Math.ceil(px + rad + 1));
    const y0 = Math.max(0, Math.floor(py - rad - 1));
    const y1 = Math.min(size - 1, Math.ceil(py + rad + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (d <= rad) {
          const a = Math.min(255, Math.round(aa * Math.max(0, 1 - Math.max(0, d - rad + 1))));
          const idx = (y * size + x) * 4;
          const fa = a / 255;
          pixels[idx]   = Math.round(pixels[idx]   * (1 - fa) + rr * fa);
          pixels[idx+1] = Math.round(pixels[idx+1] * (1 - fa) + gg * fa);
          pixels[idx+2] = Math.round(pixels[idx+2] * (1 - fa) + bb * fa);
          pixels[idx+3] = Math.min(255, pixels[idx+3] + a);
        }
      }
    }
  }

  function drawRect(x1, y1, x2, y2, rr, gg, bb) {
    for (let y = Math.max(0, Math.floor(y1)); y <= Math.min(size-1, Math.floor(y2)); y++) {
      for (let x = Math.max(0, Math.floor(x1)); x <= Math.min(size-1, Math.floor(x2)); x++) {
        const idx = (y * size + x) * 4;
        pixels[idx]   = rr;
        pixels[idx+1] = gg;
        pixels[idx+2] = bb;
        pixels[idx+3] = 255;
      }
    }
  }

  // Draw a simple "T" for TravelPanel in white
  const fontScale = size / 3;
  const startX = cx - fontScale * 0.35;
  const startY = cy - fontScale * 0.45;
  const strokeW = Math.max(1, Math.round(size * 0.09));

  // Horizontal bar of T
  drawRect(startX - fontScale * 0.3, startY, startX + fontScale * 0.65, startY + strokeW, 255, 255, 255);
  // Vertical bar of T
  drawRect(cx - strokeW / 2, startY, cx + strokeW / 2, startY + fontScale * 0.9, 255, 255, 255);

  return encodePNG(size, size, pixels);
}

for (const size of [16, 48, 128]) {
  const buf = drawIcon(size);
  writeFileSync(`icons/icon${size}.png`, buf);
  console.log(`icons/icon${size}.png — ${buf.length} bytes`);
}
console.log('Icons generated.');
