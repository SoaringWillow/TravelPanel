/**
 * Generates icon-16.png, icon-48.png, icon-128.png for the TravelPanel browser extension.
 * Uses only Node.js built-in modules (no dependencies required).
 * Run: node icons/create-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
}

/**
 * Creates a solid-color PNG with rounded corners and a centered map pin.
 * Falls back to a solid square if drawing fails.
 */
function createIconPNG(size, bgR, bgG, bgB, pinR, pinG, pinB) {
  // RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4).fill(0);

  // Helper to set a pixel with RGBA
  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }

  // Anti-aliased distance helpers
  function dist(x1, y1, x2, y2) { return Math.sqrt((x1-x2)**2+(y1-y2)**2); }

  const cx = size / 2;
  const radius = size * 0.44; // rounded corner radius = 44% of size

  // Draw rounded-rect background
  const cr = size * 0.22; // corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance from the rounded rect border
      const inset = Math.min(x, y, size-1-x, size-1-y);
      const cornerX = cr, cornerY = cr;
      let inside = false;
      if (x >= cr && x < size - cr) {
        inside = y >= 0 && y < size;
      } else if (y >= cr && y < size - cr) {
        inside = x >= 0 && x < size;
      } else {
        // Check corner circles
        const nearCornerX = x < cr ? cr : size - 1 - cr;
        const nearCornerY = y < cr ? cr : size - 1 - cr;
        inside = dist(x, y, nearCornerX, nearCornerY) <= cr;
      }
      if (inside) setPixel(x, y, bgR, bgG, bgB, 255);
    }
  }

  // Draw a simple map pin in white
  // Pin = filled circle (head) + triangle (tail) pointing down
  const pinScale = size / 48;
  const headR = 7 * pinScale;
  const headCX = cx;
  const headCY = size * 0.35;
  const tailTip = size * 0.73;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Already painted bg, now overlay pin (white)
      const alpha = pixels[(y * size + x) * 4 + 3];
      if (alpha === 0) continue; // outside rounded rect, skip

      // Head circle
      const d = dist(x, y, headCX, headCY);
      if (d <= headR) {
        setPixel(x, y, pinR, pinG, pinB, 255);
        continue;
      }

      // Tail: isoceles triangle below head
      // Tip at (cx, tailTip), base centered on headCY at width = headR*2
      const baseTop = headCY + headR * 0.6;
      if (y >= baseTop && y <= tailTip) {
        const progress = (y - baseTop) / (tailTip - baseTop);
        const halfWidth = headR * (1 - progress);
        if (Math.abs(x - headCX) <= halfWidth) {
          setPixel(x, y, pinR, pinG, pinB, 255);
        }
      }
    }
  }

  // Inner dot on pin head (bg color, creates ring effect)
  const dotR = headR * 0.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (dist(x, y, headCX, headCY) <= dotR) {
        setPixel(x, y, bgR, bgG, bgB, 255);
      }
    }
  }

  // Build PNG from RGBA pixels (color type 6 = RGBA)
  const scanlines = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    scanlines[row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = row + 1 + x * 4;
      scanlines[dst] = pixels[src];
      scanlines[dst+1] = pixels[src+1];
      scanlines[dst+2] = pixels[src+2];
      scanlines[dst+3] = pixels[src+3];
    }
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // compression=0, filter=0, interlace=0 already zero

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Indigo-600: #4f46e5 (79, 70, 229) — bg
// White: (255, 255, 255) — pin
const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createIconPNG(size, 79, 70, 229, 255, 255, 255);
  const out = path.join(__dirname, `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icon-${size}.png (${png.length} bytes)`);
}
