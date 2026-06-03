"""Generate TravelPanel Clipper extension icons using only Python stdlib."""
import struct, zlib, math, os

def png(pixels, size):
    """Encode RGBA pixels list into a minimal PNG bytestring."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    raw = b''
    for row in range(size):
        raw += b'\x00'  # filter byte
        for col in range(size):
            r, g, b, a = pixels[row * size + col]
            raw += bytes([r, g, b, a])

    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(raw, 9)) +
        chunk(b'IEND', b'')
    )

def draw_icon(size):
    pixels = []
    cx = size / 2
    # Pin geometry
    pin_r = size * 0.24
    pin_cy = size * 0.38        # center of circle
    tail_y = size * 0.80        # tip of pin
    inner_r = pin_r * 0.40      # inner dot

    INDIGO = (79, 70, 229)
    WHITE  = (255, 255, 255)
    TRANS  = (0, 0, 0, 0)

    def in_rounded_rect(x, y, corner=0.13):
        r = size * corner
        mx, my = size / 2, size / 2
        dx, dy = abs(x - mx), abs(y - my)
        hw, hh = size / 2, size / 2
        if dx > hw or dy > hh:
            return False
        if dx <= hw - r or dy <= hh - r:
            return True
        return math.hypot(dx - (hw - r), dy - (hh - r)) <= r

    def in_pin(x, y):
        # Circle part
        d = math.hypot(x - cx, y - pin_cy)
        if d <= pin_r:
            return True
        # Teardrop tail: triangle + smooth curve (approximate with bezier check)
        if y > pin_cy and y <= tail_y:
            # Linear taper from circle bottom to point
            t = (y - pin_cy) / (tail_y - pin_cy)
            half_w = pin_r * (1 - t) * 0.60
            if abs(x - cx) <= half_w:
                return True
        return False

    def in_inner_dot(x, y):
        return math.hypot(x - cx, y - pin_cy) <= inner_r

    for row in range(size):
        for col in range(size):
            x, y = col + 0.5, row + 0.5
            if not in_rounded_rect(x, y):
                pixels.append(TRANS)
                continue
            # Foreground drawing
            if in_inner_dot(x, y):
                pixels.append(INDIGO + (255,))
            elif in_pin(x, y):
                pixels.append(WHITE + (255,))
            else:
                pixels.append(INDIGO + (255,))

    return png(pixels, size)

out_dir = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(out_dir, exist_ok=True)

for size in [16, 48, 128]:
    data = draw_icon(size)
    path = os.path.join(out_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Written {path} ({len(data)} bytes)')
