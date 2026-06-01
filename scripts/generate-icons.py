"""
Generate TravelPanel app icons: indigo background + white map-pin.
Pure Python, no dependencies beyond stdlib.
"""

import struct
import zlib
import math
import os

# ─── Config ──────────────────────────────────────────────────────────────────

INDIGO   = (99, 102, 241)   # #6366f1
WHITE    = (255, 255, 255)
SIZES    = [1024, 512, 256, 192, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20]

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')

# ─── PNG helpers ─────────────────────────────────────────────────────────────

def chunk(tag: bytes, data: bytes) -> bytes:
    c = struct.pack('>I', len(data)) + tag + data
    return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

def make_png(pixels, size):
    """pixels: list of (r,g,b) tuples, row-major, size×size."""
    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            r, g, b = pixels[y * size + x]
            raw += bytes([r, g, b])
    compressed = zlib.compress(raw, 9)
    ihdr_data  = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )

# ─── Map-pin renderer ─────────────────────────────────────────────────────────

def draw_icon(size):
    """
    Draw: indigo background, white map-pin shape.
    Pin: circle at top, teardrop pointing down, centred.
    """
    pixels = [INDIGO] * (size * size)

    # Padding: 18% on each side
    pad = size * 0.18
    # Pin bounds
    pin_w  = size - 2 * pad
    pin_cx = size / 2
    # Circle top of pin: radius = pin_w * 0.32
    r_circle = pin_w * 0.32
    cy_circle = pad + r_circle            # centre of circle
    # Bottom tip of pin
    tip_y = size * 0.83

    # For each pixel, check if inside pin shape
    for y in range(size):
        for x in range(size):
            cx = x + 0.5
            cy_px = y + 0.5

            # Distance to circle centre
            dx = cx - pin_cx
            dy = cy_px - cy_circle
            dist = math.sqrt(dx * dx + dy * dy)

            if dist <= r_circle:
                # Inside the circle
                pixels[y * size + x] = WHITE
                continue

            # Check if inside the teardrop body (below circle centre, to tip)
            if cy_px >= cy_circle and cy_px <= tip_y:
                # Linear shrink: full width at cy_circle, zero at tip_y
                t = (cy_px - cy_circle) / (tip_y - cy_circle)
                half_w = r_circle * (1 - t)
                if abs(cx - pin_cx) <= half_w:
                    pixels[y * size + x] = WHITE

            # Inner dot: small circle at circle centre, ~40% size
            r_dot = r_circle * 0.38
            if dist <= r_dot:
                pixels[y * size + x] = INDIGO

    return pixels

# ─── Main ─────────────────────────────────────────────────────────────────────

os.makedirs(OUT_DIR, exist_ok=True)

for size in SIZES:
    pixels = draw_icon(size)
    data = make_png(pixels, size)
    name = f'icon-{size}.png'
    path = os.path.join(OUT_DIR, name)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'  ✓ {name} ({size}×{size})')

print(f'\nWrote {len(SIZES)} icons to {OUT_DIR}')
