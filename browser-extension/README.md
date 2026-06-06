# TravelPanel Clipper — Browser Extension

A Chrome/Safari extension that clips any travel URL into your TravelPanel boards with one click.

## Features

- **One-click clipping** — click the toolbar icon to open TravelPanel with the current page URL pre-loaded
- **Right-click clipping** — right-click any link → "Clip link to TravelPanel" without navigating to it
- **In-popup preview** — the extension calls `/api/import` to show extracted locations + tips count before opening
- **Platform detection** — recognises Xiaohongshu, WeChat, Douyin/TikTok, Bilibili, Instagram, YouTube
- **Configurable app URL** — works with localhost for dev, any Vercel deployment for prod

## Installation (Chrome / Brave / Edge)

1. Open **chrome://extensions** (or `brave://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The TravelPanel pin icon appears in your toolbar

### First-time setup

Click the ⚙ gear icon in the extension popup and set your **TravelPanel App URL**:
- Production: `https://your-app.vercel.app`
- Local dev: `http://localhost:3000`

## Installation (Safari — macOS)

Safari requires converting the Chrome extension to a Safari Web Extension using Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable the extension in
**Safari → Settings → Extensions**.

## Generating icons (optional)

The extension ships without PNG icons (the browser shows a default puzzle-piece icon).
To generate proper icons from `icons/icon.svg`:

```bash
cd browser-extension
npm install sharp
node generate-icons.js
```

Then update `manifest.json` to reference the generated files:

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## How clipping works

1. User clicks the extension icon on any travel page
2. Popup shows the current URL with a detected platform badge
3. Click **Clip to TravelPanel** — the extension:
   - Calls `/api/import` to extract locations + substance in the background
   - Opens TravelPanel in a new tab with `?import=<url>` pre-filled
   - The TravelPanel import sheet picks up the URL and runs the full enrichment flow
4. User assigns the clip to a board

## Development

The extension is plain JS (no bundler required). Edit `popup.js`, `background.js`,
or `options.js` and reload the extension in chrome://extensions to see changes.

### File structure

```
browser-extension/
  manifest.json       Chrome MV3 manifest
  popup.html          Extension popup UI
  popup.js            Popup logic (platform detection, clip action)
  options.html        Settings page
  options.js          Options logic
  background.js       Service worker (context menu + fallback click handler)
  icons/
    icon.svg          Source icon (map pin on indigo background)
  generate-icons.js   Script to produce PNG icons from SVG
  README.md           This file
```
