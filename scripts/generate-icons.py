#!/usr/bin/env python3
"""
Generate TravelPanel app icons (indigo background + white map-pin).
Usage: python3 scripts/generate-icons.py
Requires: Python 3 stdlib only (struct, zlib, math).
"""
import struct, zlib, math, os

BG  = (99, 102, 241)   # indigo-500 (#6366F1)
FG  = (255, 255, 255)  # white

def make_icon_png(size):
    cx, cy = size / 2, size / 2

    def in_rounded_rect(x, y, radius_frac=0.22):
        r = size * radius_frac
        dx, dy = abs(x - cx), abs(y - cy)
        hw = size / 2
        if dx > hw or dy > hw:
            return False
        if dx <= hw - r or dy <= hw - r:
            return True
        return math.sqrt((dx - (hw - r))**2 + (dy - (hw - r))**2) <= r

    def in_pin(x, y):
        # Pin head: circle above center
        head_cx, head_cy = cx, cy - size * 0.08
        if math.sqrt((x - head_cx)**2 + (y - head_cy)**2) <= size * 0.18:
            return True
        # Pin body: tapered triangle below head
        tip_y  = cy + size * 0.25
        base_y = cy + size * 0.03
        if base_y <= y <= tip_y:
            t = (y - base_y) / (tip_y - base_y)  # 0 at base, 1 at tip
            half_w = size * 0.11 * (1 - t)
            if abs(x - cx) <= half_w:
                return True
        return False

    rows = []
    for iy in range(size):
        row = bytearray([0])  # filter byte
        for ix in range(size):
            if not in_rounded_rect(ix, iy):
                row += bytes([0, 0, 0, 0])
            elif in_pin(ix, iy):
                row += bytes(list(FG) + [255])
            else:
                row += bytes(list(BG) + [255])
        rows.append(bytes(row))

    raw = zlib.compress(b''.join(rows), 9)

    def chunk(name, data):
        c = name.encode() + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk('IHDR', ihdr)
            + chunk('IDAT', raw)
            + chunk('IEND', b''))


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# PWA icons
for size in [192, 512]:
    path = os.path.join(ROOT, 'public', f'icon-{size}.png')
    with open(path, 'wb') as f:
        f.write(make_icon_png(size))
    print(f'  public/icon-{size}.png')

# iOS Xcode icons
ios_dir = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets',
                        'AppIcon.appiconset')
os.makedirs(ios_dir, exist_ok=True)
for size in [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024]:
    path = os.path.join(ios_dir, f'AppIcon-{size}.png')
    with open(path, 'wb') as f:
        f.write(make_icon_png(size))
    print(f'  ios AppIcon-{size}.png')

print('Done.')
