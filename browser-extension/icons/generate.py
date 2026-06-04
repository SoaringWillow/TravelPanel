#!/usr/bin/env python3
"""Generate TravelPanel browser extension icons (PNG format)."""
import struct
import zlib
import math
import os

def in_rounded_rect(x, y, w, h, r):
    dx = max(r - x, 0, x - (w - 1 - r))
    dy = max(r - y, 0, y - (h - 1 - r))
    return dx * dx + dy * dy <= r * r

def draw_pin(x, y, size):
    """Draw a simplified map pin / location marker shape."""
    cx, cy = size / 2.0, size / 2.0
    scale = size / 48.0

    # Pin head: circle in upper portion
    head_r = 13 * scale
    head_cx, head_cy = cx, cy - 4 * scale
    dist_head = math.sqrt((x - head_cx) ** 2 + (y - head_cy) ** 2)

    # Pin tail: triangle below the circle
    tail_tip_y = cy + 16 * scale
    in_tail = False
    if y >= head_cy and y <= tail_tip_y:
        progress = (y - head_cy) / (tail_tip_y - head_cy)
        tail_half_w = (1 - progress) * head_r * 0.9
        in_tail = abs(x - cx) <= tail_half_w

    return dist_head <= head_r or in_tail

def draw_dot(x, y, size):
    """Draw a small dot inside the pin head."""
    cx, cy = size / 2.0, size / 2.0
    scale = size / 48.0
    dot_cx, dot_cy = cx, cy - 4 * scale
    dot_r = 5 * scale
    return math.sqrt((x - dot_cx) ** 2 + (y - dot_cy) ** 2) <= dot_r

def make_png(size):
    bg_r, bg_g, bg_b = 99, 102, 241   # #6366F1 indigo
    pin_r, pin_g, pin_b = 255, 255, 255  # white
    dot_r, dot_g, dot_b = 99, 102, 241  # indigo (hole in pin)

    corner_radius = size * 0.22

    rows = []
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            in_bg = in_rounded_rect(x, y, size, size, corner_radius)
            if not in_bg:
                row += b'\x00\x00\x00\x00'
                continue

            if size >= 32 and draw_pin(x, y, size):
                if size >= 48 and draw_dot(x, y, size):
                    row += bytes([dot_r, dot_g, dot_b, 255])
                else:
                    row += bytes([pin_r, pin_g, pin_b, 255])
            else:
                row += bytes([bg_r, bg_g, bg_b, 255])
        rows.append(row)

    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(name, data):
        c = name + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )

if __name__ == '__main__':
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for size in [16, 32, 48, 128]:
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(make_png(size))
        print(f'Created {path}')
