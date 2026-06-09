// Generates PNG icons for the TravelPanel browser extension
// Run: node generate-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const lenBuffer = Buffer.alloc(4);
  lenBuffer.writeUInt32BE(data.length);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc);
  return Buffer.concat([lenBuffer, typeBuffer, data, crcBuffer]);
}

function createPNG(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const lines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      line[1 + x * 4] = r;
      line[2 + x * 4] = g;
      line[3 + x * 4] = b;
      line[4 + x * 4] = a;
    }
    lines.push(line);
  }

  const compressed = zlib.deflateSync(Buffer.concat(lines), { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Indigo circle with white map-pin icon
function travelPanelIcon(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const r = w / 2 - 1;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background circle (indigo #4F46E5)
  const inCircle = dist <= r;
  if (!inCircle) return [0, 0, 0, 0]; // transparent

  // Draw a white map pin shape (circle + triangle)
  const pinScale = w / 48;
  const pinCx = cx, pinCy = cy - 3 * pinScale;
  const pinR = 9 * pinScale;
  const pinDx = x - pinCx, pinDy = y - pinCy;
  const pinDist = Math.sqrt(pinDx * pinDx + pinDy * pinDy);
  const inPinCircle = pinDist <= pinR;

  // Triangle (pointer going down)
  const triTop = pinCy + pinR - 1;
  const triBot = cy + 11 * pinScale;
  const inTriangle = y >= triTop && y <= triBot &&
    Math.abs(x - cx) <= (triBot - y) * (5 * pinScale) / (triBot - triTop);

  // Inner hole of pin
  const holeR = 4 * pinScale;
  const inHole = pinDist <= holeR;

  const isWhite = (inPinCircle || inTriangle) && !inHole;
  if (isWhite) return [255, 255, 255, 255];

  return [79, 70, 229, 255]; // indigo
}

const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const png = createPNG(size, size, (x, y, w, h) => travelPanelIcon(x, y, w, h));
  const outPath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath}`);
});
console.log('Icons generated successfully.');
