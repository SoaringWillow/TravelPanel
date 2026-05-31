#!/usr/bin/env node
// Generates PNG icons for the TravelPanel browser extension using only Node.js built-ins.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(size) {
  // Turquoise-ish color matching TravelPanel brand: #0EA5E9 (sky-500)
  const r = 14, g = 165, b = 233;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcInput);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([length, typeBytes, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Build raw scanlines: filter byte (0) + RGB per pixel
  const scanline = Buffer.alloc(1 + size * 3);
  scanline[0] = 0; // filter type None
  for (let x = 0; x < size; x++) {
    scanline[1 + x * 3] = r;
    scanline[2 + x * 3] = g;
    scanline[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array(size).fill(scanline));
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

// CRC-32 implementation (standard polynomial 0xEDB88320)
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const dir = path.join(__dirname);
for (const size of [16, 32, 48, 128]) {
  const png = createPNG(size);
  fs.writeFileSync(path.join(dir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
}
console.log('Done.');
