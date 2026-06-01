/**
 * Generate PWA icons for TravelPanel.
 * Produces: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png (180×180)
 * Uses the same pure-Node PNG encoder as browser-extension/generate-icons.js.
 * Run: node generate-pwa-icons.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const len   = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcVal]);
}

function buildPNG(pixels) {
  const h = pixels.length;
  const w = pixels[0].length;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; // RGBA
  const rawRows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixels[y][x];
      row[1 + x*4] = r; row[2 + x*4] = g; row[3 + x*4] = b; row[4 + x*4] = a;
    }
    rawRows.push(row);
  }
  const comp = zlib.deflateSync(Buffer.concat(rawRows), { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdrData),
    chunk('IDAT', comp),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0]-a[0])*t),
    Math.round(a[1] + (b[1]-a[1])*t),
    Math.round(a[2] + (b[2]-a[2])*t),
  ];
}

function makeIcon(size) {
  const colA   = [79, 70, 229]; // #4f46e5
  const colB   = [14, 165, 233]; // #0ea5e9
  const radius = size * 0.22;
  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const dx = Math.max(0, Math.abs(cx - size/2) - (size/2 - radius));
      const dy = Math.max(0, Math.abs(cy - size/2) - (size/2 - radius));
      const dist = Math.sqrt(dx*dx + dy*dy) - radius;
      if (dist > 1) { row.push([0,0,0,0]); continue; }
      const t = (cx+cy) / (size*2);
      const [r,g,b] = lerp(colA, colB, t);
      const alpha = Math.round(Math.max(0, Math.min(1, 1-dist)) * 255);
      const nx = (cx/size - 0.5)*2, ny = (cy/size - 0.5)*2;
      if (isAirplane(nx, ny)) { row.push([255,255,255,alpha]); }
      else { row.push([r,g,b,alpha]); }
    }
    pixels.push(row);
  }
  return pixels;
}

function isAirplane(nx, ny) {
  if (Math.abs(ny) < 0.08 && nx > -0.55 && nx < 0.62) return true;
  if (nx > 0.42 && Math.abs(ny) < (0.62-nx)*0.55) return true;
  const wingW = 0.72, wingH = 0.52;
  if (Math.abs(nx+0.08) < wingW && Math.abs(ny) < wingH*(1-Math.abs(nx+0.08)/wingW)) return true;
  const tc = -0.48, th = 0.18, tm = 0.28;
  if (nx > tc-th && nx < tc+th && Math.abs(ny) < tm*(1-Math.abs(nx-tc)/th)) return true;
  return false;
}

const publicDir = path.join(__dirname, 'public');
for (const size of [180, 192, 512]) {
  const pixels = makeIcon(size);
  const png    = buildPNG(pixels);
  const name   = size === 180 ? 'apple-touch-icon' : `icon-${size}`;
  const out    = path.join(publicDir, `${name}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ public/${name}.png  (${png.length} bytes)`);
}
console.log('\nPWA icons generated!');
