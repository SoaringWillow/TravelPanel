"""
Generate TravelPanel app icons using Pillow.
Icon design: indigo-to-violet gradient circle with white globe/map-pin mark.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def draw_gradient_circle(draw, cx, cy, r, color_top, color_bottom):
    """Draw a filled circle with a vertical gradient."""
    for y in range(cy - r, cy + r + 1):
        dy = y - cy
        if abs(dy) > r:
            continue
        dx = int(math.sqrt(r * r - dy * dy))
        t = (dy + r) / (2 * r)
        color = lerp_color(color_top, color_bottom, t)
        draw.line([(cx - dx, y), (cx + dx, y)], fill=color + (255,))

def create_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient background: indigo-600 (#4f46e5) → violet-600 (#7c3aed)
    top_color    = (79, 70, 229)
    bottom_color = (124, 58, 237)

    padding = max(1, int(size * 0.04))
    cx = size // 2
    cy = size // 2
    r  = cx - padding

    # Draw gradient circle
    draw_gradient_circle(draw, cx, cy, r, top_color, bottom_color)

    # Draw globe: white circle outline + latitude/longitude lines
    white = (255, 255, 255, 230)
    globe_r = int(r * 0.55)
    lw = max(1, int(size * 0.025))

    # Outer circle
    draw.ellipse(
        [cx - globe_r, cy - globe_r, cx + globe_r, cy + globe_r],
        outline=white, width=lw
    )

    # Vertical center line (meridian)
    draw.arc(
        [cx - globe_r, cy - globe_r, cx + globe_r, cy + globe_r],
        start=-90, end=90, fill=white, width=lw
    )
    draw.arc(
        [cx - globe_r, cy - globe_r, cx + globe_r, cy + globe_r],
        start=90, end=270, fill=white, width=lw
    )

    # Horizontal center line (equator)
    draw.line([(cx - globe_r, cy), (cx + globe_r, cy)], fill=white, width=lw)

    # Upper and lower latitude lines
    lat_offset = int(globe_r * 0.5)
    lat_half_w = int(math.sqrt(max(0, globe_r ** 2 - lat_offset ** 2)))
    for off in [lat_offset, -lat_offset]:
        draw.line(
            [(cx - lat_half_w, cy + off), (cx + lat_half_w, cy + off)],
            fill=white, width=lw
        )

    # Draw a small location pin dot at top of globe
    pin_r = max(2, int(size * 0.045))
    pin_cx = cx
    pin_cy = cy - globe_r
    draw.ellipse(
        [pin_cx - pin_r, pin_cy - pin_r, pin_cx + pin_r, pin_cy + pin_r],
        fill=(255, 255, 255, 255)
    )

    return img


def create_splash(width, height):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # Background gradient: indigo-700 → violet-800
    top_color    = (67, 56, 202)
    bottom_color = (91, 33, 182)
    for y in range(height):
        t = y / height
        color = lerp_color(top_color, bottom_color, t)
        draw.line([(0, y), (width, y)], fill=color + (255,))

    # Centered icon
    icon_size = min(width, height) // 4
    icon = create_icon(icon_size)
    icon_x = (width - icon_size) // 2
    icon_y = (height - icon_size) // 2 - int(icon_size * 0.15)
    img.paste(icon, (icon_x, icon_y), icon)

    return img.convert("RGB")


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # ── PWA icons ──────────────────────────────────────────────────────────────
    public_dir = os.path.join(base, "public")
    os.makedirs(public_dir, exist_ok=True)

    for size in [192, 512]:
        icon = create_icon(size)
        icon.save(os.path.join(public_dir, f"icon-{size}.png"))
        print(f"  ✓ public/icon-{size}.png")

    # ── Browser extension icons ───────────────────────────────────────────────
    ext_dir = os.path.join(base, "browser-extension", "icons")
    os.makedirs(ext_dir, exist_ok=True)

    for size in [16, 48, 128]:
        icon = create_icon(size)
        icon.save(os.path.join(ext_dir, f"icon{size}.png"))
        print(f"  ✓ browser-extension/icons/icon{size}.png")

    # ── iOS AppIcon sizes ─────────────────────────────────────────────────────
    ios_dir = os.path.join(base, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
    os.makedirs(ios_dir, exist_ok=True)

    ios_sizes = [
        ("AppIcon-20@2x.png",  40),
        ("AppIcon-20@3x.png",  60),
        ("AppIcon-29@2x.png",  58),
        ("AppIcon-29@3x.png",  87),
        ("AppIcon-40@2x.png",  80),
        ("AppIcon-40@3x.png", 120),
        ("AppIcon-60@2x.png", 120),
        ("AppIcon-60@3x.png", 180),
        ("AppIcon-76.png",     76),
        ("AppIcon-76@2x.png", 152),
        ("AppIcon-83.5@2x.png", 167),
        ("AppIcon-512@2x.png", 1024),
    ]

    contents = {
        "images": [],
        "info": {"author": "xcode", "version": 1}
    }

    for filename, size in ios_sizes:
        icon = create_icon(size)
        # iOS icons must be RGB (no alpha)
        icon_rgb = Image.new("RGB", (size, size), (255, 255, 255))
        icon_rgb.paste(icon, mask=icon.split()[3] if icon.mode == "RGBA" else None)
        icon_rgb.save(os.path.join(ios_dir, filename))
        print(f"  ✓ ios AppIcon/{filename}")

        # Derive idiom/scale from filename
        fname = filename.replace(".png", "").replace("AppIcon-", "")
        scale = "1x"
        if "@2x" in fname: scale = "2x"
        if "@3x" in fname: scale = "3x"
        base_size = fname.replace("@2x","").replace("@3x","")

        contents["images"].append({
            "filename": filename,
            "idiom": "universal",
            "platform": "ios",
            "size": f"{size}x{size}" if size == 1024 else f"{base_size}x{base_size}",
            "scale": scale,
        })

    # Fix 1024x1024 entry
    for img_entry in contents["images"]:
        if img_entry["filename"] == "AppIcon-512@2x.png":
            img_entry["size"] = "1024x1024"
            img_entry.pop("scale", None)

    import json
    with open(os.path.join(ios_dir, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
    print("  ✓ ios AppIcon/Contents.json")

    # ── Splash screen ─────────────────────────────────────────────────────────
    splash = create_splash(1170, 2532)
    splash.save(os.path.join(ios_dir, "splash.png"))
    print("  ✓ ios AppIcon/splash.png (iPhone 14 Pro resolution)")

    print("\nAll icons generated!")


if __name__ == "__main__":
    main()
