# TravelPanel Clipper — Browser Extension

Save travel inspiration from any website into TravelPanel with one click.

## Install in Chrome / Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

## First-time setup

1. Click the TravelPanel icon in your toolbar
2. Click ⚙ Settings
3. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
4. Click **Save**

## How it works

1. Navigate to any travel page (Instagram, YouTube, travel blogs, etc.)
2. Click the TravelPanel ✈️ icon in the toolbar
3. Click **Save to TravelPanel**
4. The TravelPanel save sheet opens in a new tab — pick a board and confirm

The save sheet uses the same extraction pipeline as the iOS Share Sheet: Claude AI extracts locations, activities, tags, and substance (tips, warnings, wisdom) from the page content.

## Browser support

- **Chrome / Chromium** — Manifest V3 (fully supported)
- **Edge** — Manifest V3 (fully supported)
- **Firefox** — Not yet (requires Manifest V2 variant)
- **Safari** — Requires native macOS extension wrapper (Phase C)
