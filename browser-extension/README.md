# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any page directly into TravelPanel with one click.

## What It Does

Click the 🧭 icon on any travel page → opens TravelPanel's share page with the URL
pre-filled → Claude extracts locations, tips, and wisdom automatically.

Detects and badges: **Instagram · YouTube · TikTok · Xiaohongshu · Bilibili · WeChat · TripAdvisor · Google Maps** and any web page.

## Installation (Chrome / Chromium / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder
5. The 🧭 icon appears in your toolbar — pin it for easy access

## First-Time Setup

After installing, click the ⚙ gear icon in the extension popup (or right-click
the toolbar icon → "Options") and set your **TravelPanel App URL**:

```
https://your-app.vercel.app
```

Save. That's it.

## Safari (iOS & macOS)

Safari extensions require Xcode packaging. The Web Extension APIs used here
(`chrome.*` / `browser.*`) are compatible — run the following to scaffold:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable in Safari → Preferences → Extensions.

## Regenerate Icons

The bundled icons are solid indigo squares. To regenerate them:

```bash
cd browser-extension/icons
python3 generate.py
```

To use a custom icon, replace `icon16.png`, `icon48.png`, and `icon128.png`
with your own 16×16, 48×48, and 128×128 PNGs.

## Files

```
browser-extension/
  manifest.json       — Chrome Manifest V3
  popup.html          — Extension popup UI
  popup.js            — Popup logic (platform detection, tab capture)
  options.html        — Settings page
  options.js          — Settings persistence (chrome.storage.sync)
  icons/
    icon16.png        — Toolbar icon (16×16)
    icon48.png        — Extensions page icon (48×48)
    icon128.png       — Chrome Web Store icon (128×128)
    generate.py       — Recreate icons from scratch (pure stdlib)
```
