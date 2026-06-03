#!/usr/bin/env python3
"""Generate TravelPanel extension PNG icons (no external dependencies)."""
import struct, zlib, math, os

def make_png(size):
    cx = cy = size / 2.0

    def rgba(x, y):
        dx, dy = x - cx, y - cy
        dist = math.hypot(dx, dy)
        outer_r = size * 0.46
        if dist > outer_r:
            return (0, 0, 0, 0)  # transparent

        # Background: teal gradient circle
        t = dist / outer_r          # 0=centre, 1=edge
        r = int(20  + t * 8)
        g = int(184 - t * 30)
        b = int(166 - t * 25)

        # Pin body: white teardrop centred slightly above middle
        pin_cx, pin_cy = cx, cy - size * 0.06
        pin_head_r = size * 0.18

        # Inner white circle (hole in pin)
        hole_r = size * 0.07

        # Pin head circle
        head_d = math.hypot(x - pin_cx, y - pin_cy)
        if head_d <= pin_head_r:
            if head_d <= hole_r:
                return (r, g, b, 255)   # transparent hole
            return (255, 255, 255, 255)  # white pin

        # Pin tail: downward triangle below centre
        tail_top    = pin_cy + pin_head_r * 0.7
        tail_bottom = cy + size * 0.22
        if y >= tail_top and y <= tail_bottom:
            half_w = (tail_bottom - y) / (tail_bottom - tail_top) * pin_head_r * 0.55
            if abs(x - pin_cx) <= half_w:
                return (255, 255, 255, 255)

        return (r, g, b, 255)

    # Build raw bitmap
    rows = []
    for y in range(size):
        row = bytearray()
        row.append(0)   # filter: None
        for x in range(size):
            row.extend(rgba(x, y))
        rows.append(bytes(row))

    raw = b''.join(rows)

    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


os.makedirs(os.path.dirname(__file__) or '.', exist_ok=True)
for sz in [16, 32, 48, 128]:
    path = os.path.join(os.path.dirname(__file__), f'icon{sz}.png')
    with open(path, 'wb') as f:
        f.write(make_png(sz))
    print(f'  ✓ icon{sz}.png')

print('Icons generated.')
