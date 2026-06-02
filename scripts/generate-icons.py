#!/usr/bin/env python3
"""
Generate TravelPanel app icons: indigo background with white airplane emoji.
Uses only Python stdlib (struct, zlib) — no Pillow required.
"""

import struct
import zlib
import os
import math

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')

# ─── Minimal PNG writer ─────────────────────────────────────────────────────

def make_png(width: int, height: int, pixels: list[tuple[int,int,int]]) -> bytes:
    """Create a minimal RGBA PNG from a flat list of (r,g,b) tuples."""
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    ihdr = chunk(b'IHDR', ihdr_data)

    raw_rows = []
    for y in range(height):
        row = b'\x00'  # filter type None
        for x in range(width):
            r, g, b = pixels[y * width + x]
            row += struct.pack('BBB', r, g, b)
        raw_rows.append(row)

    compressed = zlib.compress(b''.join(raw_rows), 9)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend


# ─── Icon drawing ─────────────────────────────────────────────────────────────

INDIGO = (79, 70, 229)    # #4F46E5
WHITE  = (255, 255, 255)
LIGHT  = (199, 210, 254)  # #C7D2FE — wing accent


def draw_icon(size: int) -> list[tuple[int,int,int]]:
    """Draw a TravelPanel icon at the given square size."""
    pixels = [INDIGO] * (size * size)
    cx, cy = size / 2, size / 2
    r = size / 2

    def dist(x, y, px, py):
        return math.sqrt((x - px) ** 2 + (y - py) ** 2)

    def set_px(x, y, color):
        if 0 <= x < size and 0 <= y < size:
            pixels[y * size + x] = color

    def fill_circle(px, py, radius, color):
        for dy in range(-int(radius)-1, int(radius)+2):
            for dx in range(-int(radius)-1, int(radius)+2):
                if dx*dx + dy*dy <= radius*radius:
                    set_px(int(px)+dx, int(py)+dy, color)

    def fill_rect(x0, y0, x1, y1, color):
        for yy in range(int(y0), int(y1)):
            for xx in range(int(x0), int(x1)):
                set_px(xx, yy, color)

    def fill_triangle(pts, color):
        """Fill a triangle given 3 (x,y) points."""
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        min_y, max_y = int(min(ys)), int(max(ys))
        for yy in range(min_y, max_y + 1):
            # Scanline fill
            intersections = []
            for i in range(3):
                x1, y1 = pts[i]
                x2, y2 = pts[(i+1) % 3]
                if y1 == y2:
                    continue
                if min(y1, y2) <= yy < max(y1, y2):
                    t = (yy - y1) / (y2 - y1)
                    intersections.append(x1 + t * (x2 - x1))
            if len(intersections) == 2:
                xa, xb = sorted(intersections)
                for xx in range(int(xa), int(xb)+1):
                    set_px(xx, yy, color)

    # Rounded corners (mask out corners to get rounded look)
    corner_r = size * 0.22  # iOS-style rounding
    for y in range(size):
        for x in range(size):
            # Check if in corner region
            in_corner = False
            if x < corner_r and y < corner_r:
                in_corner = dist(x, y, corner_r, corner_r) > corner_r
            elif x > size - corner_r and y < corner_r:
                in_corner = dist(x, y, size - corner_r, corner_r) > corner_r
            elif x < corner_r and y > size - corner_r:
                in_corner = dist(x, y, corner_r, size - corner_r) > corner_r
            elif x > size - corner_r and y > size - corner_r:
                in_corner = dist(x, y, size - corner_r, size - corner_r) > corner_r
            if in_corner:
                pixels[y * size + x] = (249, 250, 251)  # bg color

    # Draw a stylised paper airplane ✈ in white
    # Scale the plane to ~55% of icon size
    s = size * 0.55
    ox = cx - s * 0.45  # offset so plane is centered
    oy = cy - s * 0.3

    # Main body: triangle pointing right
    fill_triangle([
        (ox + s * 0.0, oy + s * 0.35),   # left
        (ox + s * 0.9, oy + s * 0.05),   # tip (top)
        (ox + s * 0.9, oy + s * 0.65),   # tip (bottom)
    ], WHITE)

    # Upper wing fold line: slightly darker triangle
    fill_triangle([
        (ox + s * 0.0, oy + s * 0.35),
        (ox + s * 0.55, oy + s * 0.20),
        (ox + s * 0.55, oy + s * 0.38),
    ], LIGHT)

    # Tail / lower wing
    fill_triangle([
        (ox + s * 0.0, oy + s * 0.35),
        (ox + s * 0.55, oy + s * 0.38),
        (ox + s * 0.3, oy + s * 0.72),
    ], LIGHT)

    return pixels


SIZES = [16, 32, 48, 128, 192, 512]

os.makedirs(PUBLIC_DIR, exist_ok=True)

for size in SIZES:
    pixels = draw_icon(size)
    png = make_png(size, size, pixels)
    fname = f'icon-{size}.png'
    with open(os.path.join(PUBLIC_DIR, fname), 'wb') as f:
        f.write(png)
    print(f'Generated {fname} ({len(png)} bytes)')

print('Done.')
