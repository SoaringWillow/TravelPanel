# TravelPanel Clipper — Browser Extension

Chrome (Manifest V3) extension that lets you clip any travel page into TravelPanel with one click. AI extracts spots and tips automatically.

## Install (developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `browser-extension/` folder
4. The TravelPanel ✈️ icon appears in your toolbar

### First-time setup

Click the ⚙️ settings icon in the popup and paste your TravelPanel URL:
- Production: `https://your-app.vercel.app`
- Local dev: `http://localhost:3000`

## Usage

1. Navigate to any travel page (Instagram, YouTube, Xiaohongshu, etc.)
2. Click the ✈️ icon
3. Hit **Clip to TravelPanel**
4. The TravelPanel share page opens — choose a board and save

The AI extraction runs automatically in the background: spots, coordinates, tips, warnings, and wisdom are all captured.

## Safari

Convert to a Safari Web Extension with Xcode:
```bash
xcrun safari-web-extension-converter browser-extension/ --project-location . --app-name TravelPanelClipper
```
Then open the generated Xcode project and run on macOS/iOS.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome Manifest V3 declaration |
| `popup.html/js` | Toolbar popup UI and clip logic |
| `options.html/js` | Settings page (TravelPanel URL) |
| `icons/` | PNG icons (generated from `icon.svg`) |

## Regenerating icons

If you update `icons/icon.svg`, regenerate PNGs:
```bash
cd icons && bash generate-icons.sh
# requires rsvg-convert, inkscape, or imagemagick
```
Or run the Python snippet at the bottom of `generate-icons.sh`.
