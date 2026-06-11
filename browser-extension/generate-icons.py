#!/usr/bin/env python3
"""Generate TravelPanel Clipper extension icons as PNG files."""
import struct
import zlib
import math
import os

def crc32(data):
    return zlib.crc32(data) & 0xFFFFFFFF

def make_chunk(chunk_type, data):
    c = chunk_type.encode('ascii') + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', crc32(c))

def make_png(width, height, pixels_rgb):
    """Create a PNG from a flat list of (R,G,B) tuples."""
    signature = b'\x89PNG\r\n\x1a\n'

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk('IHDR', ihdr_data)

    # Build raw scanlines: filter byte (0) + RGB data
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type: None
        for x in range(width):
            r, g, b = pixels_rgb[y * width + x]
            raw.extend([r, g, b])

    compressed = zlib.compress(bytes(raw), 9)
    idat = make_chunk('IDAT', compressed)
    iend = make_chunk('IEND', b'')

    return signature + ihdr + idat + iend

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def generate_icon(size):
    """Generate a round indigo icon with a white airplane silhouette."""
    pixels = []

    cx, cy = size / 2.0, size / 2.0
    r = size / 2.0 - 0.5

    bg1 = (99, 102, 241)   # indigo-500
    bg2 = (124, 58, 237)   # violet-600
    fg  = (255, 255, 255)

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)

            if dist > r:
                # Outside circle → transparent white (for PNG)
                pixels.append((255, 255, 255))
                continue

            # Gradient background
            t = (dx / size + 0.5) * 0.6 + (dy / size + 0.5) * 0.4
            bg = lerp_color(bg1, bg2, max(0.0, min(1.0, t)))

            # Draw airplane / paper plane shape in the center
            # Normalize coords to [-1, 1]
            nx = dx / (size * 0.38)
            ny = dy / (size * 0.38)

            in_plane = False

            # Paper plane: right-pointing triangle body
            # Main body: triangle pointing right
            # Right vertex at (0.8, 0), left vertices at (-0.5, ±0.6)
            # Point-in-triangle check for main wing
            def sign(px, py, ax, ay, bx, by):
                return (px - bx) * (ay - by) - (ax - bx) * (py - by)

            # Main body triangle (pointing right)
            d1 = sign(nx, ny,  0.7,  0.0, -0.4,  0.55)
            d2 = sign(nx, ny, -0.4,  0.55, -0.4, -0.1)
            d3 = sign(nx, ny, -0.4, -0.1,  0.7,  0.0)
            has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
            has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
            if not (has_neg and has_pos):
                in_plane = True

            # Lower tail triangle
            d1 = sign(nx, ny, -0.0, -0.0, -0.4, -0.1)
            d2 = sign(nx, ny, -0.4, -0.1, -0.2, -0.6)
            d3 = sign(nx, ny, -0.2, -0.6, -0.0, -0.0)
            has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
            has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
            if not (has_neg and has_pos):
                in_plane = True

            # Center fold line (thin horizontal band)
            if abs(ny) < 0.045 and -0.4 < nx < 0.7:
                in_plane = True

            pixels.append(fg if in_plane else bg)

    return pixels

def save_icon(size, path):
    pixels = generate_icon(size)
    png_data = make_png(size, size, pixels)
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'  Generated {path} ({len(png_data)} bytes)')

if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    for size in [16, 32, 48, 128]:
        save_icon(size, f'icons/icon{size}.png')
    print('Done.')
