"""Generates PNG icons for the TravelPanel browser extension."""
import struct, zlib, math, sys, os

# Orange: #f97316 / White: #ffffff / Dark orange: #c2410c
ORANGE = (249, 115, 22)
ORANGE_DARK = (194, 65, 12)
WHITE  = (255, 255, 255)


def make_png(pixels, w, h):
    def chunk(name, data):
        crc = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)

    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])

    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))  # RGBA
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_icon(size):
    """Renders a map-pin icon: round head + teardrop tail."""
    pixels = [[(0, 0, 0, 0)] * size for _ in range(size)]

    cx   = size / 2
    # Pin head center sits slightly above middle
    head_r = size * 0.32
    head_cy = size * 0.38

    # Tail tip is near bottom
    tail_tip_y = size * 0.88

    for y in range(size):
        for x in range(size):
            px, py = x + 0.5, y + 0.5

            dx = px - cx
            dy = py - head_cy
            dist_head = math.hypot(dx, dy)

            # ── Head circle ──────────────────────────────────────
            if dist_head <= head_r:
                # Anti-alias at edge
                alpha = min(1.0, (head_r - dist_head + 0.8))
                alpha = max(0.0, min(1.0, alpha))
                a = int(alpha * 255)
                pixels[y][x] = (*ORANGE, a)

            # ── Teardrop tail ─────────────────────────────────────
            # The tail is a quadratic bezier-ish cone below the head
            elif py > head_cy:
                progress = (py - head_cy) / (tail_tip_y - head_cy)
                if progress > 1:
                    progress = 1
                half_w = head_r * (1.0 - progress) * 0.85
                if abs(dx) <= half_w:
                    # Inner region — fully orange
                    alpha = min(1.0, (half_w - abs(dx) + 0.8))
                    alpha = max(0.0, min(1.0, alpha))
                    a = int(alpha * 255)
                    pixels[y][x] = (*ORANGE, a)

    # ── White center dot on head ──────────────────────────────────
    dot_r = head_r * 0.38
    for y in range(size):
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            dx = px - cx
            dy = py - head_cy
            dist = math.hypot(dx, dy)
            if dist <= dot_r:
                alpha = min(1.0, (dot_r - dist + 0.8))
                alpha = max(0.0, min(1.0, alpha))
                a = int(alpha * 255)
                pixels[y][x] = (*WHITE, a)

    return pixels


out_dir = os.path.dirname(os.path.abspath(__file__))

for size in [16, 48, 128]:
    pixels = make_icon(size)
    data = make_png(pixels, size, size)
    path = os.path.join(out_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Generated {path} ({len(data)} bytes)')

print('Done.')
