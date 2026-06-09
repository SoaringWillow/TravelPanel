#!/usr/bin/env python3
"""Generate PNG icons for TravelPanel browser extension.

Run from the repo root:
    python3 browser-extension/generate-icons.py
"""
import zlib, struct, os, math

def lerp(a, b, t):
    return max(0, min(255, int(a + (b - a) * t)))

def is_in_pin(x, y, size):
    """Map pin silhouette (circle head + pointed tail)."""
    cx = size / 2.0
    # Circle head: centered at 38% from top
    head_cy = size * 0.38
    head_r  = size * 0.23
    if (x - cx) ** 2 + (y - head_cy) ** 2 <= head_r ** 2:
        return True
    # Teardrop tail below the circle
    tail_top = head_cy + head_r * 0.4
    tail_tip = size * 0.84
    if tail_top <= y <= tail_tip:
        t = (y - tail_top) / (tail_tip - tail_top)
        half_w = head_r * 0.75 * (1.0 - t)
        if cx - half_w <= x <= cx + half_w:
            return True
    return False

def make_icon_png(size):
    cx, cy = size / 2.0, size / 2.0
    cr = size * 0.18   # rounded corner radius
    rows = []

    for y in range(size):
        t = y / max(size - 1, 1)
        # Sky-blue vertical gradient
        bg = (lerp(14, 3, t), lerp(165, 140, t), lerp(233, 210, t))
        row = b'\x00'   # PNG filter type 0 (None)

        for x in range(size):
            # Rounded-rectangle mask (transparent corners)
            dcx = max(0.0, max(cr - x, x - (size - 1 - cr)))
            dcy = max(0.0, max(cr - y, y - (size - 1 - cr)))
            if dcx * dcx + dcy * dcy > cr * cr:
                row += b'\x00\x00\x00\x00'   # transparent
                continue

            # White map-pin symbol for >=32 px icons
            if size >= 32 and is_in_pin(x, y, size):
                # Soft anti-alias edge
                d_head_cy = size * 0.38
                d_head_r  = size * 0.23
                dist_head = math.sqrt((x - cx) ** 2 + (y - d_head_cy) ** 2)
                edge = 1.5   # feather width in px
                alpha = 255
                if dist_head > d_head_r - edge:
                    alpha = int(255 * max(0, (d_head_r - dist_head) / edge + 1))
                row += bytes([255, 255, 255, min(255, alpha)])
                continue

            row += bytes([bg[0], bg[1], bg[2], 255])

        rows.append(row)

    raw = b''.join(rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 32, 48, 128]:
        data = make_icon_png(size)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  {path}  ({len(data):,} bytes)')

    print('Done!')
