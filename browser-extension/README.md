# TravelPanel Clipper — Browser Extension

One-click Chrome/Safari extension that sends any travel URL to TravelPanel.

## Features

- **Toolbar button** — opens a popup showing the current page's platform, title, and URL; one click clips it to TravelPanel
- **Context menu** — right-click any link or page → "Clip link to TravelPanel"
- **Platform detection** — auto-labels Instagram, YouTube, TikTok, 小红书, Pinterest, TripAdvisor, Google Maps, Airbnb, Booking.com
- **Configurable URL** — works with your local dev server or deployed Vercel app

## Installation (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

The 📍 icon appears in the toolbar.

## First-time setup

1. Click the extension icon → **Settings** (bottom-right) → or right-click the toolbar icon → **Options**
2. Enter your TravelPanel URL, e.g.:
   - Local dev: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
3. Click **Save Settings**

## How clipping works

The extension opens `<travelPanelUrl>/share?url=<encoded-url>&title=<encoded-title>` in a new tab — the same Share page used by the iOS Share Extension. TravelPanel immediately starts AI extraction in the background.

## Safari installation

Safari Web Extensions require an Xcode wrapper:

```bash
# One-time conversion (macOS + Xcode required)
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project and run it to install on your Mac. Enable the extension in Safari → Settings → Extensions.

## Regenerating icons

The included icons are solid indigo squares. For production (Chrome Web Store), replace them with proper artwork:

```bash
# Requires: npm install sharp
node icons/generate-icons.js
```

This converts `icons/icon.svg` to `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`.

## File map

```
browser-extension/
  manifest.json     — Manifest V3 config
  popup.html        — Toolbar popup UI
  popup.js          — Popup logic (tab query, platform detection, clip action)
  background.js     — Service worker (context menu registration + handler)
  options.html      — Settings page
  options.js        — Settings logic (chrome.storage.sync)
  icons/
    icon.svg        — Source vector icon (map pin on indigo)
    generate-icons.js — Script to export PNGs from SVG (requires sharp)
    icon16.png      — Generated icon files
    icon32.png
    icon48.png
    icon128.png
```
