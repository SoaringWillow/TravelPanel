#!/usr/bin/env python3
"""Generate TravelPanel Clipper extension icons (pure Python, no dependencies)."""
import struct, zlib, math, os

def write_png(path, size, pixels_rgba):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA

    raw = bytearray()
    for row in pixels_rgba:
        raw.append(0)  # filter = None
        for r, g, b, a in row:
            raw.extend([r, g, b, a])

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + chunk(b'IEND', b''))

    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print(f'  created {path}')


def lerp(a, b, t):
    return a + (b - a) * t


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, v))


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def make_icon(size):
    """Draw a white map-pin on a teal rounded-square background."""
    pixels = []

    # Background gradient: teal-600 → teal-700
    BG_TOP = (13, 148, 136)
    BG_BOT = (15, 118, 110)

    SHADOW = (0, 70, 65)   # subtle inner-shadow at bottom
    WHITE = (255, 255, 255)

    cx = size / 2.0
    cy = size / 2.0

    # Rounded-square corner radius (fraction of half-size)
    corner_frac = 0.22
    aa = 1.5 / size  # anti-alias width in normalised units

    for py in range(size):
        row = []
        for px in range(size):
            # Normalise to [-1, 1]
            nx = (px - cx + 0.5) / cx
            ny = (py - cy + 0.5) / cy

            # ── Rounded-square signed-distance ──────────────────────────────
            r = corner_frac
            qx = abs(nx) - (1.0 - r)
            qy = abs(ny) - (1.0 - r)
            dist_sq = math.sqrt(max(qx, 0) ** 2 + max(qy, 0) ** 2)
            sq_dist = dist_sq + min(max(qx, qy), 0) - r

            # Outside the rounded square → transparent
            if sq_dist > aa:
                row.append((0, 0, 0, 0))
                continue

            bg_alpha = clamp(int(255 * smoothstep(aa, -aa, sq_dist)))

            # Background gradient
            t = (py / size)
            bg_r = clamp(int(lerp(BG_TOP[0], BG_BOT[0], t)))
            bg_g = clamp(int(lerp(BG_TOP[1], BG_BOT[1], t)))
            bg_b = clamp(int(lerp(BG_TOP[2], BG_BOT[2], t)))

            # ── Map-pin geometry ─────────────────────────────────────────────
            # Pin sits centred, slightly above mid
            pin_cx = 0.0
            pin_cy = -0.07   # head centre y

            head_r = 0.30    # pin head radius (normalised)
            inner_r = head_r * 0.40   # hole radius

            # Tail: teardrop below head
            tail_top = pin_cy + head_r * 0.6   # where tail starts
            tail_bot = pin_cy + head_r * 1.90  # tip of tail
            tail_base_half = head_r * 0.46     # half-width at top of tail

            # Head circle SDF
            dxh = nx - pin_cx
            dyh = ny - pin_cy
            head_dist = math.sqrt(dxh * dxh + dyh * dyh) - head_r

            # Inner hole SDF
            inner_dist = math.sqrt(dxh * dxh + dyh * dyh) - inner_r

            # Tail SDF (triangle / rounded teardrop)
            in_tail = False
            if ny >= tail_top and ny <= tail_bot:
                t_tail = (ny - tail_top) / (tail_bot - tail_top)
                half_w = tail_base_half * (1 - t_tail)
                dx_tail = abs(nx - pin_cx)
                if dx_tail < half_w:
                    in_tail = True

            in_pin = (head_dist < aa) or in_tail
            in_hole = inner_dist < -aa

            # Anti-alias the head boundary
            pin_a = smoothstep(aa, -aa, head_dist) if (abs(head_dist) < aa) else (1.0 if head_dist < 0 else 0.0)
            hole_mask = smoothstep(-aa, aa, inner_dist) if (abs(inner_dist) < aa) else (1.0 if inner_dist > 0 else 0.0)

            if in_pin and not in_hole:
                final_alpha = clamp(int(pin_a * hole_mask * bg_alpha))
                row.append((WHITE[0], WHITE[1], WHITE[2], final_alpha))
            else:
                row.append((bg_r, bg_g, bg_b, bg_alpha))

        pixels.append(row)
    return pixels


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print('Generating TravelPanel Clipper icons…')
    for size in (16, 32, 48, 128):
        pixels = make_icon(size)
        write_png(os.path.join(script_dir, f'icon-{size}.png'), size, pixels)
    print('Done.')
