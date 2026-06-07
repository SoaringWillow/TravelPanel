#!/usr/bin/env bash
# Regenerate iOS app icon and splash screen from SVG sources.
# Requires: pip install cairosvg

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

python3 - <<'PYEOF'
import sys
import os

try:
    import cairosvg
except ImportError:
    print("cairosvg not found. Run: pip install cairosvg")
    sys.exit(1)

repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# App icon — 1024x1024 (Xcode 14+ single-size approach)
cairosvg.svg2png(
    url=os.path.join(repo, "ios/App/icon-source.svg"),
    write_to=os.path.join(repo, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
    output_width=1024,
    output_height=1024,
)
print("✓ AppIcon-512@2x.png (1024x1024)")

# Splash screens — 2732x2732 (Capacitor convention)
splash_dir = os.path.join(repo, "ios/App/App/Assets.xcassets/Splash.imageset")
for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
    cairosvg.svg2png(
        url=os.path.join(repo, "ios/App/splash-source.svg"),
        write_to=os.path.join(splash_dir, name),
        output_width=2732,
        output_height=2732,
    )
    print(f"✓ {name} (2732x2732)")

print("\nAll iOS assets regenerated.")
PYEOF
