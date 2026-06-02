#!/usr/bin/env python3
"""Generate TravelPanel Clipper icons (teal airplane on dark background)."""
import struct, zlib, os

def png(width, height, pixels):
    """Create a valid PNG from a list of (r,g,b) tuples, row by row."""
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter: None
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += bytes([r, g, b])

    def chunk(name, data):
        crc = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw, 9)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', idat)
            + chunk(b'IEND', b''))

def make_icon(size):
    """Draw a simple teal rounded-square with a white airplane glyph."""
    bg  = (15, 23, 42)     # slate-900
    fg  = (13, 148, 136)   # teal-600
    wh  = (255, 255, 255)  # white

    pixels = []
    for y in range(size):
        for x in range(size):
            # Background color = slate
            pixels.append(bg)

    # Draw a filled teal rounded square (simple: just flood fill center 80%)
    pad = max(1, size // 8)
    for y in range(size):
        for x in range(size):
            if pad <= x < size - pad and pad <= y < size - pad:
                pixels[y * size + x] = fg

    # Draw white airplane symbol as a simple cross/arrow
    cx, cy = size // 2, size // 2
    arm = max(1, size // 5)
    thickness = max(1, size // 10)

    # Body: horizontal bar
    for dy in range(-thickness, thickness + 1):
        for dx in range(-arm * 2, arm * 2 + 1):
            px, py = cx + dx, cy + dy
            if 0 <= px < size and 0 <= py < size:
                pixels[py * size + px] = wh

    # Vertical tail
    for dy in range(0, arm + 1):
        for dx in range(-thickness, thickness + 1):
            px, py = cx + dx, cy + dy
            if 0 <= px < size and 0 <= py < size:
                pixels[py * size + px] = wh

    return png(size, size, pixels)


out_dir = os.path.dirname(os.path.abspath(__file__))
for size in [16, 48, 128]:
    data = make_icon(size)
    path = os.path.join(out_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'  ✓ icon{size}.png ({len(data)} bytes)')

print('Icons generated successfully.')
