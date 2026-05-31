"""
Generate TravelPanel Clipper extension icons.
Produces solid-indigo (#4F46E5) PNG files at 16, 48, and 128 px with
a white plane glyph drawn via basic pixel manipulation — no Pillow needed.
"""
import struct
import zlib
import os
import math

# ── Indigo brand colour ──────────────────────────────────────────────────────
BRAND_R, BRAND_G, BRAND_B = 0x4F, 0x46, 0xE5
WHITE = (255, 255, 255)
INDIGO = (BRAND_R, BRAND_G, BRAND_B)

# ── Minimal PNG writer ───────────────────────────────────────────────────────

def _chunk(tag: bytes, data: bytes) -> bytes:
    payload = tag + data
    return (
        struct.pack(">I", len(data))
        + payload
        + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
    )

def encode_png(pixels, size):
    """pixels: list of (r,g,b) tuples, row-major."""
    raw = b""
    for y in range(size):
        raw += b"\x00"  # filter: None
        for x in range(size):
            r, g, b = pixels[y * size + x]
            raw += bytes([r, g, b])
    compressed = zlib.compress(raw, 9)
    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr_data)
        + _chunk(b"IDAT", compressed)
        + _chunk(b"IEND", b"")
    )

# ── Draw a simple plane glyph ────────────────────────────────────────────────

def draw_circle(pixels, size, cx, cy, r, color):
    for y in range(size):
        for x in range(size):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                pixels[y * size + x] = color

def draw_plane(pixels, size):
    """
    Draw a simplified plane silhouette centred in [size x size].
    The design: a white rounded diamond body + two wing triangles.
    """
    cx, cy = size / 2, size / 2
    scale = size / 128.0

    def set_px(x, y, color):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < size and 0 <= yi < size:
            pixels[yi * size + xi] = color

    # Body: a rotated ellipse (approximate with filled pixels)
    bw = size * 0.12  # half-width of body
    bh = size * 0.38  # half-height of body
    angle = math.radians(-40)
    cos_a, sin_a = math.cos(angle), math.sin(angle)

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            # rotate back
            rx =  dx * cos_a + dy * sin_a
            ry = -dx * sin_a + dy * cos_a
            if (rx / bw) ** 2 + (ry / bh) ** 2 <= 1.0:
                pixels[y * size + x] = WHITE

    # Left wing
    lw = size * 0.36
    lh = size * 0.10
    wx = cx - size * 0.04
    wy = cy + size * 0.04
    for y in range(size):
        for x in range(size):
            dx = x - wx
            dy = y - wy
            rx =  dx * cos_a + dy * sin_a
            ry = -dx * sin_a + dy * cos_a
            if (rx / lw) ** 2 + (ry / lh) ** 2 <= 1.0:
                pixels[y * size + x] = WHITE

    # Right wing (smaller)
    rw = size * 0.20
    rh = size * 0.07
    wx2 = cx + size * 0.10
    wy2 = cy - size * 0.10
    for y in range(size):
        for x in range(size):
            dx = x - wx2
            dy = y - wy2
            rx =  dx * cos_a + dy * sin_a
            ry = -dx * sin_a + dy * cos_a
            if (rx / rw) ** 2 + (ry / rh) ** 2 <= 1.0:
                pixels[y * size + x] = WHITE

# ── Rounded rectangle background ─────────────────────────────────────────────

def draw_rounded_rect(pixels, size, r, color):
    """Fill pixel grid with color inside a rounded rectangle."""
    for y in range(size):
        for x in range(size):
            # distance to nearest corner circle centre
            cx = max(r, min(size - r - 1, x))
            cy = max(r, min(size - r - 1, y))
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2 or (r <= x <= size - r - 1 or r <= y <= size - r - 1):
                pixels[y * size + x] = color

def fill_rounded_bg(pixels, size, corner_r):
    for y in range(size):
        for x in range(size):
            ix = x - 0
            iy = y - 0
            # four corner circles
            in_tl = (ix <= corner_r     and iy <= corner_r     and (ix - corner_r)     ** 2 + (iy - corner_r)     ** 2 > corner_r ** 2)
            in_tr = (ix >= size-corner_r and iy <= corner_r     and (ix-(size-corner_r))** 2 + (iy - corner_r)     ** 2 > corner_r ** 2)
            in_bl = (ix <= corner_r     and iy >= size-corner_r and (ix - corner_r)     ** 2 + (iy-(size-corner_r))** 2 > corner_r ** 2)
            in_br = (ix >= size-corner_r and iy >= size-corner_r and (ix-(size-corner_r))** 2 + (iy-(size-corner_r))** 2 > corner_r ** 2)
            if in_tl or in_tr or in_bl or in_br:
                pixels[y * size + x] = (0, 0, 0, 0)  # transparent (mark as outside)
            else:
                pixels[y * size + x] = INDIGO

# ── Main ──────────────────────────────────────────────────────────────────────

os.makedirs(os.path.dirname(os.path.abspath(__file__)) or ".", exist_ok=True)
script_dir = os.path.dirname(os.path.abspath(__file__))

for size in (16, 48, 128):
    pixels = [INDIGO] * (size * size)

    # Rounded background radius ~22% of size
    corner_r = max(2, int(size * 0.22))
    fill_rounded_bg(pixels, size, corner_r)

    # Only draw plane glyph at 48px and 128px (too small at 16px)
    if size >= 48:
        draw_plane(pixels, size)
    else:
        # 16px: just a white dot centre
        cx, cy = size // 2, size // 2
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                xi, yi = cx + dx, cy + dy
                if 0 <= xi < size and 0 <= yi < size:
                    pixels[yi * size + xi] = WHITE

    # Strip transparent pixels (replace with transparent PNG using RGBA? No — keep solid.)
    # For corners that were marked transparent, restore to a slightly lighter indigo
    # to simulate a rounded-rect on any background.
    # Actually: override corners back to a near-white so they blend on light backgrounds.
    for i, p in enumerate(pixels):
        if p == (0, 0, 0, 0):
            pixels[i] = (249, 250, 251)  # #f9fafb — matches extension popup bg

    png_bytes = encode_png(pixels, size)
    out_path = os.path.join(script_dir, f"icon{size}.png")
    with open(out_path, "wb") as f:
        f.write(png_bytes)
    print(f"  wrote {out_path}  ({len(png_bytes)} bytes)")

print("Done.")
