#!/usr/bin/env python3
"""Generate PNG icons for the TravelPanel browser extension.

Uses only Python stdlib (struct + zlib) — no external deps required.
Run: python3 create-icons.py
"""
import struct
import zlib
import os

# TravelPanel blue gradient start: #3B82F6 = (59, 130, 246)
BLUE  = (59, 130, 246)
# Gradient mid-purple: #8B5CF6 = (139, 92, 246)
# We render a simple diagonal gradient from blue → purple.

def lerp(a, b, t):
    return int(a + (b - a) * t)

def make_png(size):
    width = height = size
    purple = (139, 92, 246)

    def pack_chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)

    # Build raw pixel rows with diagonal gradient + soft corner rounding
    corner_r = max(2, size // 5)
    rows = bytearray()
    for y in range(height):
        rows.append(0)  # filter: None
        for x in range(width):
            # Rounded-corner mask
            in_corner = False
            checks = [
                (x < corner_r and y < corner_r,
                 corner_r - 1 - x, corner_r - 1 - y),
                (x >= width - corner_r and y < corner_r,
                 x - (width - corner_r), corner_r - 1 - y),
                (x < corner_r and y >= height - corner_r,
                 corner_r - 1 - x, y - (height - corner_r)),
                (x >= width - corner_r and y >= height - corner_r,
                 x - (width - corner_r), y - (height - corner_r)),
            ]
            for active, dx, dy in checks:
                if active and (dx * dx + dy * dy) >= corner_r * corner_r:
                    in_corner = True
                    break

            if in_corner:
                rows.extend([0xFF, 0xFF, 0xFF])  # white outside rounded corners
            else:
                t = (x + y) / (width + height - 2)
                r = lerp(BLUE[0], purple[0], t)
                g = lerp(BLUE[1], purple[1], t)
                b = lerp(BLUE[2], purple[2], t)
                rows.extend([r, g, b])

    compressed = zlib.compress(bytes(rows), 9)

    png = b'\x89PNG\r\n\x1a\n'
    png += pack_chunk(b'IHDR', ihdr)
    png += pack_chunk(b'IDAT', compressed)
    png += pack_chunk(b'IEND', b'')
    return png


if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 32, 48, 128]:
        data = make_png(size)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  Created {path} ({len(data):,} bytes)')

    print('✓ Icons generated.')
