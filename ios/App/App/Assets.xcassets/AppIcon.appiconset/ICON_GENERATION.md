# Generating AppIcon-512@2x.png from the SVG spec

The master icon is at `public/icon-spec.svg`.

To generate the 1024×1024 PNG required by Xcode/App Store Connect:

```bash
# Using Inkscape (free, macOS/Linux):
inkscape public/icon-spec.svg --export-png=ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png --export-width=1024 --export-height=1024

# Using ImageMagick (if you have librsvg):
convert -background none -size 1024x1024 public/icon-spec.svg ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

# Or use any web tool: figma.com, photopea.com, svgtopng.com
# → open icon-spec.svg → export as PNG 1024×1024
```

## Splash screen PNGs

The launch screen spec is at `public/splash-spec.svg`.
Capacitor expects 2732×2732 PNGs in `Splash.imageset/`:

```bash
inkscape public/splash-spec.svg --export-png=ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png --export-width=2732 --export-height=2732
cp ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png
cp ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png
```

## Icon design

- Background: linear gradient #6366f1 → #3730a3 (indigo)
- Foreground: white map pin teardrop with indigo inner circle
- Subtle grid lines (8% opacity) to evoke a map
- Dot constellation at bottom to suggest saved travel spots
