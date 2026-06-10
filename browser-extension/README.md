# TravelPanel Clipper — Browser Extension

Clip any travel page to your TravelPanel boards in one click, directly from Chrome or Firefox.

## Features

- **One-click Clip to Inbox** — saves the current page to your TravelPanel Inbox and lets AI extract locations, tips, and wisdom in the background
- **Choose board** — opens the TravelPanel share page so you can route the clip to a specific board
- **Platform detection** — recognises YouTube, Instagram, Xiaohongshu, TikTok, X/Twitter, and more
- **Configurable URL** — point the extension at any TravelPanel deployment (Vercel, localhost)
- **Dynamic icon** — drawn by a service worker using OffscreenCanvas; no PNG asset needed

## Install (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder
5. The TravelPanel icon appears in your toolbar (pin it for easy access)

## Install (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `browser-extension/manifest.json`

> **Note**: Firefox's temporary add-on is removed on restart. For a permanent install, submit to addons.mozilla.org.

## Safari (macOS)

Use Xcode's `safari-web-extension-converter` to wrap this extension for Safari:

```bash
xcrun safari-web-extension-converter browser-extension/
```

## Configuration

Click the ⚙ gear icon in the popup (or visit the extension's Options page) to change the TravelPanel URL. Defaults to `https://travelpanel.vercel.app`. Change to `http://localhost:3000` for local development.

## How it works

```
User clicks extension icon
  ↓
Popup reads current tab URL + title
  ↓
"Clip to Inbox" button pressed
  ↓
Extension opens /share?url=…&autoSave=true&source=extension
  ↓
Share page auto-saves skeleton to IndexedDB (Inbox)
  ↓
Background AI enrichment: extracts locations, substance, tips
  ↓
Share page shows ✓ and closes the tab
```

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Chrome MV3) |
| `popup.html/css/js` | Toolbar popup UI |
| `options.html/css/js` | Settings page |
| `background.js` | Service worker; draws toolbar icon via OffscreenCanvas |
