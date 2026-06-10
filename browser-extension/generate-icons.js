// Run with: node generate-icons.js
// Generates PNG icons for the TravelPanel browser extension.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4);
  lb.writeUInt32BE(data.length);
  const cb = Buffer.allocUnsafe(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function createPNG(pixels, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (1 + w * 4) + 1 + x * 4;
      raw[di] = pixels[si]; raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2]; raw[di + 3] = pixels[si + 3];
    }
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  // Indigo #6366f1
  const [bgR, bgG, bgB] = [99, 102, 241];
  // Rounded square background radius
  const cr = Math.round(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = Math.min(x, size - 1 - x);
      const ny = Math.min(y, size - 1 - y);
      let inside;
      if (nx >= cr || ny >= cr) {
        inside = true;
      } else {
        const dx = cr - nx, dy = cr - ny;
        inside = Math.sqrt(dx * dx + dy * dy) <= cr;
      }
      if (inside) {
        pixels[i] = bgR; pixels[i + 1] = bgG; pixels[i + 2] = bgB; pixels[i + 3] = 255;
      }
    }
  }

  // Draw white location pin
  const cx = size / 2;
  const pinR = size * 0.265;
  const pinCY = size * 0.385;
  const tailBot = pinCY + pinR * 2.15;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] === 0) continue;

      const dx = x - cx;
      const dy = y - pinCY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pin circle body
      if (dist <= pinR) {
        const isHole = dist <= pinR * 0.42;
        if (isHole) {
          // Keep background color (hole in pin)
        } else {
          pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
        }
        continue;
      }

      // Pin tail: tapers from bottom of circle to a point
      const tailTop = pinCY + pinR * 0.65;
      if (y >= tailTop && y <= tailBot) {
        const prog = (y - tailTop) / (tailBot - tailTop);
        const halfW = pinR * 0.62 * (1 - prog);
        if (Math.abs(dx) <= halfW) {
          pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
        }
      }
    }
  }

  return createPNG(pixels, size, size);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = generateIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`✓ icon${size}.png`);
}
console.log('Icons generated.');
