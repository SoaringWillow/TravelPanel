"""
Generate TravelPanel Clipper extension icons (pure stdlib, no Pillow needed).
Produces a solid indigo-500 (#6366F1) square with rounded feel.
Run: python3 generate.py
"""

import struct
import zlib
import os


def make_solid_png(size: int, r: int, g: int, b: int) -> bytes:
    """Create a minimal valid PNG of `size x size` filled with RGB color."""
    raw_rows = b''
    row = bytes([r, g, b]) * size
    for _ in range(size):
        raw_rows += b'\x00' + row  # filter byte 0 = None, then pixel data

    compressed = zlib.compress(raw_rows, level=9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        payload = tag + data
        crc = zlib.crc32(payload) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)

    ihdr_data = struct.pack('>II', size, size) + bytes([8, 2, 0, 0, 0])

    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    # indigo-500: #6366F1
    r, g, b = 0x63, 0x66, 0xF1

    for size in (16, 48, 128):
        data = make_solid_png(size, r, g, b)
        path = os.path.join(here, f'icon{size}.png')
        with open(path, 'wb') as fh:
            fh.write(data)
        print(f'  ✓ icon{size}.png ({len(data)} bytes)')

    print('Done.')
