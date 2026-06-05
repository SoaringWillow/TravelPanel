#!/usr/bin/env python3
"""
Generate TravelPanel Clipper extension icons.
Produces solid-color PNG files — no external dependencies needed.

Usage: python3 create_icons.py
"""
import struct
import zlib
import os
import math

def make_png(width, height, pixels):
    """
    pixels: list of (r, g, b, a) tuples, row-major order
    """
    def chunk(tag, data):
        payload = tag + data
        crc = zlib.crc32(payload) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR: width, height, bit_depth=8, color_type=6 (RGBA), compress=0, filter=0, interlace=0
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    # IDAT: raw scanlines
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte = None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes([r, g, b, a])

    idat = chunk(b'IDAT', zlib.compress(raw, 9))

    # IEND
    iend = chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


def render_icon(size):
    """
    Draws a rounded-square icon with a sky-blue (#0EA5E9) background
    and a white airplane/pin shape inside.
    """
    R, G, B = 14, 165, 233   # #0EA5E9 sky-500
    pixels = []

    # Corner radius as fraction of size
    corner_r = size * 0.22

    for y in range(size):
        for x in range(size):
            cx, cy = x + 0.5, y + 0.5

            # Rounded square mask via SDF
            dx = max(abs(cx - size / 2) - (size / 2 - corner_r), 0)
            dy = max(abs(cy - size / 2) - (size / 2 - corner_r), 0)
            dist = math.sqrt(dx * dx + dy * dy) - corner_r

            # Anti-alias the edge (1px feather)
            alpha = max(0.0, min(1.0, 0.5 - dist))
            bg_alpha = int(alpha * 255)

            if bg_alpha == 0:
                pixels.append((0, 0, 0, 0))
                continue

            # Draw a simple location-pin-style dot in the center
            # White circle (the map pin head)
            pin_r = size * 0.20
            pin_cx, pin_cy = size / 2, size * 0.42
            pdx = cx - pin_cx
            pdy = cy - pin_cy
            pin_dist = math.sqrt(pdx * pdx + pdy * pdy)
            in_pin = pin_dist < pin_r

            # Pin tail: a small triangle below the circle
            tail_tip_y = size * 0.72
            in_tail = (
                cy > pin_cy + pin_r * 0.6
                and cy < tail_tip_y
                and abs(cx - size / 2) < (tail_tip_y - cy) * 0.45
            )

            if in_pin or in_tail:
                fr = int(255 * (1 - 0.15))  # slightly off-white for depth
                fg = int(255 * (1 - 0.05))
                fb = 255
                pixels.append((fr, fg, fb, bg_alpha))
            else:
                pixels.append((R, G, B, bg_alpha))

    return make_png(size, size, pixels)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 32, 48, 128]:
        data = render_icon(size)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  ✓ icon{size}.png  ({len(data):,} bytes)')

    print('Icons generated successfully.')


if __name__ == '__main__':
    main()
