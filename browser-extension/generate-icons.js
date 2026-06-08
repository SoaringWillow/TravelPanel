#!/usr/bin/env node
/**
 * Generates PNG icons for the TravelPanel browser extension.
 * Run: node generate-icons.js
 * Requires only Node.js built-ins — no npm install needed.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crc32.table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = crc32.table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePng(size) {
  // RGBA pixel buffer
  const buf = new Uint8Array(size * size * 4);

  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
  };

  const fillCircle = (cx, cy, r, col) => {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d <= r) set(x, y, ...col);
        else if (d <= r + 1) {
          const alpha = Math.round(255 * (r + 1 - d));
          set(x, y, col[0], col[1], col[2], alpha);
        }
      }
  };

  // ── Background: indigo rounded rect ──────────────────────────────────
  const pad = size * 0.04;
  const radius = size * 0.22;
  const indigo = [99, 102, 241, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x - pad, ny = y - pad, w = size - pad * 2, h = size - pad * 2;
      // nearest corner center
      const ccx = nx < radius ? radius : (nx > w - radius ? w - radius : nx);
      const ccy = ny < radius ? radius : (ny > h - radius ? h - radius : ny);
      const dx = nx - ccx, dy = ny - ccy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) { set(x, y, 0, 0, 0, 0); continue; }
      const inside = (nx >= radius && nx <= w - radius) ||
                     (ny >= radius && ny <= h - radius) ||
                     dist <= radius;
      if (inside) set(x, y, ...indigo);
      else if (dist <= radius + 1) {
        const alpha = Math.round(255 * (radius + 1 - dist));
        set(x, y, indigo[0], indigo[1], indigo[2], alpha);
      } else {
        set(x, y, 0, 0, 0, 0);
      }
    }
  }

  // ── Map pin (white) ───────────────────────────────────────────────────
  const cx = size / 2;
  const pinHeadY = size * 0.36;
  const pinHeadR = size * 0.195;
  const white = [255, 255, 255];

  // Pin head circle
  fillCircle(cx, pinHeadY, pinHeadR, [...white, 255]);

  // Pin body: tapered triangle downward
  const pinTopY = pinHeadY + pinHeadR * 0.5;
  const pinBotY = size * 0.78;
  for (let y = pinTopY; y <= pinBotY; y++) {
    const t = (y - pinTopY) / (pinBotY - pinTopY);
    const hw = pinHeadR * 0.55 * (1 - t * 0.92);
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++)
      set(x, Math.round(y), ...white, 255);
  }

  // Inner hole in pin head (indigo)
  fillCircle(cx, pinHeadY, pinHeadR * 0.36, [...indigo.slice(0, 3), 255]);

  // ── Encode to PNG ─────────────────────────────────────────────────────
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = y * (1 + size * 4) + 1 + x * 4;
      raw[d] = buf[s]; raw[d+1] = buf[s+1]; raw[d+2] = buf[s+2]; raw[d+3] = buf[s+3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePng(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}
console.log('\nIcons ready. Load browser-extension/ as an unpacked extension in Chrome.');
