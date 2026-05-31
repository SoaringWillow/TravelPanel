"""Generate solid-color PNG icons for the TravelPanel browser extension.

Usage: python3 generate.py

Produces icon16.png, icon48.png, icon128.png in the same directory.
Edit the R, G, B values below to change the color (#4F46E5 = indigo).
"""

import struct
import zlib
import os

R, G, B = 79, 70, 229  # #4F46E5 — indigo


def make_png(width: int, height: int, r: int, g: int, b: int) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = (b"\x00" + bytes([r, g, b] * width)) * height
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for size in (16, 48, 128):
        path = os.path.join(out_dir, f"icon{size}.png")
        with open(path, "wb") as f:
            f.write(make_png(size, size, R, G, B))
        print(f"Created {path}")
