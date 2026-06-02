# TravelPanel Clipper — Browser Extension

Save travel inspiration from any webpage to TravelPanel with one click.

## Features

- **One-click clip**: Click the toolbar icon on any travel page → choose a board → save
- **Platform detection**: Automatically recognizes YouTube, Instagram, TikTok/Douyin, 小红书, Bilibili, WeChat, Pinterest, and generic web pages
- **Board selector**: Save directly to any board or to your Inbox
- **Right-click clipping**: Right-click any link → "Save to TravelPanel" without visiting the page
- **AI extraction**: Every saved clip is sent through Claude for location and insight extraction

## Installation (Developer Mode)

### Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repository

### Safari (requires Xcode)

Convert using Apple's tool:
```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build it, and enable the extension in Safari → Settings → Extensions.

## Configuration

1. After installing, click the **gear icon** in the popup (or right-click the extension icon → Options)
2. Set your **TravelPanel URL**:
   - Development: `http://localhost:3000`
   - Production: your Vercel deployment URL
3. Click **Test Connection** to verify

## Regenerating Icons

Icons are generated from `icons/generate.py` using Python's stdlib (no dependencies):

```bash
cd browser-extension/icons
python3 generate.py
```

## Architecture

The extension is a pure Manifest V3 extension with no build step needed:

```
browser-extension/
├── manifest.json      — Extension config (MV3)
├── popup.html/css/js  — Toolbar popup UI
├── options.html/css/js — Settings page
├── background.js      — Service worker (context menu)
└── icons/             — PNG icons (16, 32, 48, 128px)
```

**Save flow**: The extension opens the TravelPanel `/share` page with the current URL as a query param — the same page the iOS Share Extension uses. This means all save logic (board assignment, enrichment, retry queue) is shared and tested across both surfaces.

## Why not a direct API call?

TravelPanel's data lives in IndexedDB on the TravelPanel origin. The extension can't access a different origin's IndexedDB directly. Routing saves through the `/share` page is the cleanest cross-origin approach and keeps the save logic in one place.

For a future enhancement, TravelPanel could expose a `/api/boards` endpoint so the extension can pre-populate the board selector from the user's actual boards.
