# TravelPanel Clipper — Browser Extension

A Chrome/Edge/Brave extension that clips travel inspiration from any webpage directly into your TravelPanel boards. Claude AI extracts spots, tips, warnings, and wisdom automatically.

## Install (Chrome / Edge / Brave)

1. Open your browser and go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The TravelPanel Clipper icon (✈️ map pin) appears in your toolbar

## First-time setup

1. Click the extension icon → click **Get Started**
2. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000` for local dev)
3. Click **Save Settings**

## How to clip a page

**Popup:** Click the extension icon on any page → click **Clip to TravelPanel** → pick your board.

**Right-click:** Right-click anywhere on a page → **Clip page to TravelPanel ✈️**.

**Right-click a link:** Right-click any link → **Clip link to TravelPanel ✈️**.

After clipping, TravelPanel opens your board selector. Claude AI enriches the clip in the background — GPS coordinates, tips, warnings, and substance wisdom from the post.

## Safari (macOS / iOS)

Convert this extension to a Safari Web Extension using Xcode:

```bash
# Requires Xcode 12+ and macOS 11+
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Chrome MV3) |
| `popup.html/js` | Toolbar popup UI |
| `options.html/js` | Settings page (configure TravelPanel URL) |
| `background.js` | Service worker — installs right-click context menus |
| `icons/` | 16/32/48/128px PNG icons |

## Regenerate icons

If you want to regenerate the icons (e.g. to change the color):

```bash
cd browser-extension
python3 ../scripts/generate-icons.py  # or run the inline script in the repo
```
