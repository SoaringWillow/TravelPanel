# TravelPanel Clipper — Browser Extension

Save any travel post to TravelPanel with one click. AI extracts spots and travel wisdom automatically.

## Features

- **One-click clipping** — saves the current page URL to TravelPanel's share flow
- **Platform detection** — recognises YouTube, Instagram, 小红书, Douyin, Bilibili, WeChat, Twitter
- **Right-click menu** — "Save page to TravelPanel" on any page or link
- **Board picker** — opens TravelPanel's native share page so you can pick a board
- **Manifest V3** — works in Chrome, Edge, Brave, and (via Safari Web Extension converter) Safari

## Installation (developer / sideload)

### Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder
5. The extension icon appears in your toolbar

### Safari (macOS)

Use Apple's `xcrun safari-web-extension-converter` tool:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location ./safari-extension-xcode \
  --app-name "TravelPanel Clipper"
```

Then open the Xcode project and run it to install in Safari.

## Setup

1. Click the extension icon
2. Click **Configure →** (or the ⚙ settings button)
3. Enter your TravelPanel app URL (e.g. `https://your-app.vercel.app`)
4. Click **Save**

## Generating icons

The `icons/` folder contains placeholder PNGs generated from `generate-icons.js`. Replace them with professional artwork before submitting to any store:

```bash
node generate-icons.js
```

The source SVG is at `icons/icon.svg`.

## Architecture

The extension is intentionally thin — it delegates all extraction and storage to TravelPanel itself:

1. User clicks **Save to TravelPanel**
2. Extension opens `{appUrl}/share?url={encoded}&title={encoded}` in a new tab
3. TravelPanel's share page extracts spots + substance via Claude AI
4. User picks a board; clip is saved to IndexedDB (and Supabase if configured)

No API keys or permissions beyond `activeTab` and `storage` are required.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Manifest V3) |
| `popup.html/css/js` | Toolbar popup UI |
| `options.html/css/js` | Settings page (configure app URL) |
| `background.js` | Service worker — creates context menu |
| `generate-icons.js` | Node script to regenerate placeholder PNG icons |
| `icons/` | Icon files (16 / 32 / 48 / 128 px PNGs + SVG source) |
