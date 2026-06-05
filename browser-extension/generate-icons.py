#!/usr/bin/env python3
"""Generate TravelPanel extension icons as PNG files."""

import os
import struct
import zlib

def make_png(size, color=(124, 111, 224)):
    """Generate a solid-color PNG with rounded look using pure Python (no Pillow needed)."""
    width = height = size
    r, g, b = color

    def png_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    # Build RGBA pixel data with rounded corners
    rows = []
    cx = cy = size / 2
    radius = size * 0.42  # inner circle radius
    corner_radius = size * 0.22  # rounded corner radius for rect

    for y in range(height):
        row = []
        for x in range(width):
            # Simple rounded rectangle mask
            rx = size - corner_radius
            ry = size - corner_radius

            dx = max(corner_radius - x - 1, 0, x - rx + 1)
            dy = max(corner_radius - y - 1, 0, y - ry + 1)
            inside = (dx * dx + dy * dy) <= (corner_radius * corner_radius)

            if inside:
                # gradient from center
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                factor = max(0, 1 - dist / (size * 0.6))
                pr = min(255, int(r + (255 - r) * factor * 0.3))
                pg = min(255, int(g + (255 - g) * factor * 0.15))
                pb = min(255, int(b + (255 - b) * factor * 0.4))
                row += [pr, pg, pb, 255]
            else:
                row += [0, 0, 0, 0]
        rows.append(bytes([0] + row))

    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    # RGBA color type is 6
    ihdr_data = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])
    ihdr = png_chunk(b'IHDR', ihdr_data)
    idat = png_chunk(b'IDAT', compressed)
    iend = png_chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


def main():
    out_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    sizes = [16, 32, 48, 128]
    # TravelPanel purple: #7c6fe0 → rgb(124, 111, 224)
    color = (124, 111, 224)

    for size in sizes:
        png_data = make_png(size, color)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'  ✓ icons/icon{size}.png ({len(png_data)} bytes)')

    print('Icons generated successfully.')


if __name__ == '__main__':
    main()
