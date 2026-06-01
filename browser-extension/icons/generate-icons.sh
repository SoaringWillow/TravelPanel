#!/bin/bash
# Generate PNG icons from icon.svg using Inkscape, rsvg-convert, or ImageMagick
# Run this once from the browser-extension/icons/ directory

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SVG="$SCRIPT_DIR/icon.svg"

for SIZE in 16 32 48 128; do
  OUT="$SCRIPT_DIR/icon${SIZE}.png"
  if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w $SIZE -h $SIZE "$SVG" -o "$OUT"
  elif command -v inkscape &> /dev/null; then
    inkscape --export-type=png --export-filename="$OUT" -w $SIZE -h $SIZE "$SVG"
  elif command -v convert &> /dev/null; then
    convert -background none -resize ${SIZE}x${SIZE} "$SVG" "$OUT"
  else
    echo "No SVG converter found. Install rsvg-convert (librsvg), inkscape, or imagemagick."
    exit 1
  fi
  echo "Generated icon${SIZE}.png"
done
echo "Done."
