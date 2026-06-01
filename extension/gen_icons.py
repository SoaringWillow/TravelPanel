#!/usr/bin/env python3
"""Generates TravelPanel extension PNG icons using stdlib only."""
import struct, zlib, math, os

def write_png(filename, width, height, pixels):
    """pixels: list of (r,g,b,a) tuples, row-major."""
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter type None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes([r, g, b, a])

    compressed = zlib.compress(raw, 9)
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)[:13]))
        # IHDR: width(4) height(4) bitdepth(1) colortype(2=RGB) compression(0) filter(0) interlace(0)
        f.write(chunk(b'IHDR', struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))

def write_png2(filename, width, height, pixels):
    """Correct IHDR."""
    def make_chunk(tag, data):
        c = tag + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    rows = []
    for y in range(height):
        row = b'\x00'
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            row += bytes([r, g, b, a])
        rows.append(row)

    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = make_chunk(b'IDAT', compressed)
    iend = make_chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(signature + ihdr + idat + iend)


def draw_icon(size):
    pixels = [(0, 0, 0, 0)] * (size * size)

    cx = size / 2
    bg_color = (79, 70, 229, 255)   # indigo-600 #4f46e5
    fg_color = (255, 255, 255, 255) # white

    corner_r = size * 0.14

    def set_px(x, y, color, alpha_mul=1.0):
        if 0 <= x < size and 0 <= y < size:
            r, g, b, a = color
            a = int(a * alpha_mul)
            pixels[y * size + x] = (r, g, b, a)

    def blend(x, y, color, alpha):
        xi, yi = int(x), int(y)
        if 0 <= xi < size and 0 <= yi < size:
            r, g, b, _ = color
            cr, cg, cb, ca = pixels[yi * size + xi]
            t = alpha / 255.0
            pixels[yi * size + xi] = (
                int(cr * (1 - t) + r * t),
                int(cg * (1 - t) + g * t),
                int(cb * (1 - t) + b * t),
                min(255, ca + int(255 * t)),
            )

    # Draw rounded rect background with anti-aliasing
    for y in range(size):
        for x in range(size):
            fx, fy = x + 0.5, y + 0.5
            # Distance to nearest corner
            dx = max(corner_r - fx, 0, fx - (size - corner_r))
            dy = max(corner_r - fy, 0, fy - (size - corner_r))
            dist = math.sqrt(dx*dx + dy*dy)
            # AA: within corner_r
            if dist <= corner_r:
                edge_dist = corner_r - dist
                alpha = min(1.0, edge_dist + 0.5)
                alpha = max(0.0, min(1.0, alpha))
                r, g, b, a = bg_color
                pixels[y * size + x] = (r, g, b, int(a * alpha))

    # Draw pin icon using thick lines
    pin_cx = size / 2.0
    pin_head_y = size * 0.36
    pin_head_r = size * 0.20
    pin_tip_y  = size * 0.78
    lw = max(1.0, size * 0.07)

    def draw_circle_aa(cx2, cy2, radius, color, line_w):
        r_outer = radius + line_w / 2
        r_inner = radius - line_w / 2
        ix0 = max(0, int(cx2 - r_outer - 1))
        ix1 = min(size - 1, int(cx2 + r_outer + 1))
        iy0 = max(0, int(cy2 - r_outer - 1))
        iy1 = min(size - 1, int(cy2 + r_outer + 1))
        for py in range(iy0, iy1 + 1):
            for px in range(ix0, ix1 + 1):
                d = math.sqrt((px + 0.5 - cx2)**2 + (py + 0.5 - cy2)**2)
                if r_inner - 0.5 <= d <= r_outer + 0.5:
                    alpha = min(1.0, min(d - r_inner + 0.5, r_outer - d + 0.5))
                    alpha = max(0.0, alpha)
                    cr, cg, cb, ca = pixels[py * size + px]
                    fr, fg, fb, _ = color
                    t = alpha
                    pixels[py * size + px] = (
                        int(cr * (1 - t) + fr * t),
                        int(cg * (1 - t) + fg * t),
                        int(cb * (1 - t) + fb * t),
                        min(255, ca + int(255 * t)),
                    )

    def draw_line_aa(x0, y0, x1, y1, color, line_w):
        dx, dy = x1 - x0, y1 - y0
        length = math.sqrt(dx*dx + dy*dy)
        if length < 0.001:
            return
        nx, ny = -dy / length, dx / length  # perpendicular
        half = line_w / 2

        x_min = max(0, int(min(x0, x1) - half - 1))
        x_max = min(size - 1, int(max(x0, x1) + half + 1))
        y_min = max(0, int(min(y0, y1) - half - 1))
        y_max = min(size - 1, int(max(y0, y1) + half + 1))

        for py in range(y_min, y_max + 1):
            for px in range(x_min, x_max + 1):
                fx, fy = px + 0.5, py + 0.5
                # Project onto line
                t = ((fx - x0) * dx + (fy - y0) * dy) / (length * length)
                t = max(0.0, min(1.0, t))
                proj_x = x0 + t * dx
                proj_y = y0 + t * dy
                dist = math.sqrt((fx - proj_x)**2 + (fy - proj_y)**2)
                if dist <= half + 0.5:
                    alpha = min(1.0, half + 0.5 - dist)
                    alpha = max(0.0, alpha)
                    cr, cg, cb, ca = pixels[py * size + px]
                    fr, fg, fb, _ = color
                    t2 = alpha
                    pixels[py * size + px] = (
                        int(cr * (1 - t2) + fr * t2),
                        int(cg * (1 - t2) + fg * t2),
                        int(cb * (1 - t2) + fb * t2),
                        min(255, ca + int(255 * t2)),
                    )

    # Pin head circle
    draw_circle_aa(pin_cx, pin_head_y, pin_head_r, fg_color, lw)

    # Left side of teardrop
    draw_line_aa(
        pin_cx - pin_head_r * 0.65, pin_head_y + pin_head_r * 0.65,
        pin_cx, pin_tip_y,
        fg_color, lw
    )
    # Right side
    draw_line_aa(
        pin_cx + pin_head_r * 0.65, pin_head_y + pin_head_r * 0.65,
        pin_cx, pin_tip_y,
        fg_color, lw
    )

    return pixels


os.makedirs('icons', exist_ok=True)
for size in [16, 32, 48, 128]:
    px = draw_icon(size)
    write_png2(f'icons/icon{size}.png', size, size, px)
    print(f'✓ icons/icon{size}.png ({size}x{size})')

print('Done.')
