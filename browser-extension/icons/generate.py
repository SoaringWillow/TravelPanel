#!/usr/bin/env python3
"""Generate TravelPanel extension icons as solid-color PNGs with a T lettermark."""
import struct
import zlib
import os

def make_chunk(name, data):
    c = name + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def make_png(size, bg_rgb, fg_rgb, letter='T'):
    """Create a simple PNG icon with a colored background and letter."""
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))

    pixels = []
    cx, cy = size // 2, size // 2

    # Simple rasterized 'T' lettermark
    def in_letter(x, y):
        # Scale letter relative to icon size
        thick = max(1, size // 8)
        bar_h = max(1, size // 6)
        stem_w = max(1, size // 5)
        pad = size // 6

        # Horizontal bar (top of T)
        if pad <= x <= size - pad and pad <= y <= pad + bar_h:
            return True
        # Vertical stem
        stem_x_start = cx - stem_w // 2
        stem_x_end = cx + stem_w // 2
        if stem_x_start <= x <= stem_x_end and pad <= y <= size - pad:
            return True
        return False

    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            # Rounded rect mask (corner radius = size/6)
            r = size // 6
            # Distance from corners for rounded rect
            dx = max(r - x, 0, x - (size - 1 - r))
            dy = max(r - y, 0, y - (size - 1 - r))
            if dx * dx + dy * dy > r * r:
                raw += b'\xff\xff\xff'  # transparent (white bg)
            elif in_letter(x, y):
                raw += bytes(fg_rgb)
            else:
                raw += bytes(bg_rgb)

    idat = make_chunk(b'IDAT', zlib.compress(raw))
    iend = make_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

# TravelPanel brand color: indigo #4F46E5
bg = (79, 70, 229)   # indigo-600
fg = (255, 255, 255)  # white

out_dir = os.path.dirname(os.path.abspath(__file__))
for size in [16, 32, 48, 128]:
    data = make_png(size, bg, fg)
    path = os.path.join(out_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Created {path} ({size}x{size})')
