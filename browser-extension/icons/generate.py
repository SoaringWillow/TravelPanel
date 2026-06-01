#!/usr/bin/env python3
"""Generate PNG icons for the browser extension from an inline SVG."""
import struct, zlib, math

def create_png(size, bg_color, pin_color):
    """Create a minimal valid PNG with a map pin icon."""
    img = []
    for y in range(size):
        row = []
        for x in range(size):
            cx, cy = size / 2, size * 0.45
            r = size * 0.38

            # Normalize coords
            nx = (x - cx) / r
            ny = (y - cy) / r

            # Pin body = circle top half
            in_circle = (nx**2 + ny**2) <= 1.0
            in_top = ny <= 0.3

            # Pin tail (triangle pointing down)
            # Triangle: base at y=cy+r*0.3, tip at y=cy+r*1.5
            tail_top_y = cy + r * 0.3
            tail_tip_y = cy + r * 1.5
            if y >= tail_top_y and y <= tail_tip_y:
                progress = (y - tail_top_y) / (tail_tip_y - tail_top_y)
                half_w = r * 0.35 * (1 - progress)
                in_tail = abs(x - cx) <= half_w
            else:
                in_tail = False

            # Inner dot
            in_dot = ((nx * 0.4)**2 + ((ny - 0.1) * 0.4)**2) <= 0.15

            if (in_circle and in_top) or in_tail:
                if in_dot:
                    # lighter dot
                    r2 = min(255, pin_color[0] + 60)
                    g2 = min(255, pin_color[1] + 60)
                    b2 = min(255, pin_color[2] + 60)
                    row.extend([r2, g2, b2, 255])
                else:
                    row.extend([*pin_color, 255])
            else:
                row.extend([0, 0, 0, 0])
        img.append(row)
    return img

def png_bytes(width, height, img):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    raw_rows = []
    for row in img:
        raw_rows.append(b'\x00' + bytes(row))
    compressed = zlib.compress(b''.join(raw_rows), 9)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

# Indigo pin color (matching #6366f1)
PIN = (99, 102, 241)

for size in [16, 48, 128]:
    img = create_png(size, (0, 0, 0), PIN)
    data = png_bytes(size, size, img)
    with open(f'icon{size}.png', 'wb') as f:
        f.write(data)
    print(f'icon{size}.png written ({len(data)} bytes)')
