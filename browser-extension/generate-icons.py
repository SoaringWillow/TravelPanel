"""
Regenerate TravelPanel Clipper extension PNG icons.
Usage: python3 generate-icons.py
Requires only Python standard library.
"""
import struct, zlib, math, os

def write_png(path, size):
    w = h = size
    cx, cy = w / 2.0, h * 0.42
    outer_r = w * 0.46
    pin_head_r = outer_r * 0.36

    pixels = []
    for y in range(h):
        row = []
        for x in range(w):
            nx, ny = x + 0.5, y + 0.5
            bg_dist = math.sqrt((nx - w/2)**2 + (ny - h/2)**2)
            if bg_dist > outer_r:
                row += [0, 0, 0, 0]
                continue

            t = min(1.0, bg_dist / outer_r)
            bg_r = int(99  + (59  - 99 ) * t)
            bg_g = int(102 + (130 - 102) * t)
            bg_b = int(241 + (246 - 241) * t)

            pin_dist = math.sqrt((nx - cx)**2 + (ny - cy)**2)
            in_head = pin_dist <= pin_head_r

            in_tail = False
            tail_top = cy + pin_head_r * 0.72
            tail_bot = h * 0.87
            if tail_top <= ny <= tail_bot:
                prog = (ny - tail_top) / max(1, tail_bot - tail_top)
                in_tail = abs(nx - cx) <= pin_head_r * 0.62 * (1.0 - prog)

            in_hole = pin_dist <= pin_head_r * 0.36

            if (in_head and not in_hole) or in_tail:
                row += [255, 255, 255, 255]
            else:
                row += [bg_r, bg_g, bg_b, 255]
        pixels.append(row)

    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)

    raw = b''.join(b'\x00' + bytes(row) for row in pixels)
    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 6))
        + chunk(b'IEND', b'')
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print(f'  {path}')

if __name__ == '__main__':
    base = os.path.join(os.path.dirname(__file__), 'icons')
    print('Generating icons...')
    for size in [16, 32, 48, 128]:
        write_png(f'{base}/icon{size}.png', size)
    print('Done.')
