# TravelPanel Clipper — Browser Extension

A Chrome/Safari extension that saves travel posts, blogs, and videos to your TravelPanel trip boards with one click. AI automatically extracts locations, tips, and wisdom from any page.

## Features

- **One-click save** — click the toolbar icon to send the current page to TravelPanel
- **Platform detection** — recognises YouTube, Instagram, Xiaohongshu, TikTok, Bilibili, WeChat
- **Keyboard shortcut** — `Cmd+Shift+S` (Mac) or `Ctrl+Shift+S` (Windows/Linux)
- **Context menu** — right-click any page or link → "Save to TravelPanel"
- **Configurable URL** — works with any TravelPanel deployment (local dev or production)

## Installation

### Chrome (Developer Mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The TravelPanel pin icon appears in the toolbar

### Safari

Safari extensions require packaging through Xcode:

1. Open Terminal → `xcrun safari-web-extension-converter browser-extension/`
2. Follow the Xcode prompts to create an App Extension target
3. Build and run to enable in Safari → Preferences → Extensions

## Configuration

Click the ⚙️ icon in the popup (or right-click the toolbar icon → Options) to:

- **App URL** — change from the default `https://travelpanel.vercel.app` to your own deployment (e.g. `http://localhost:3000` for local dev)

## Generating Icons (first-time setup)

The repo includes pre-generated icons. To regenerate them from the SVG source:

```bash
cd browser-extension/icons
npm install sharp
node generate-icons.js
```

## How it Works

1. Click the extension icon (or use the keyboard shortcut)
2. The popup shows the current page title, domain, and detected platform
3. Click **Save to TravelPanel** — the extension opens `/share?url=...&title=...` in a new tab
4. TravelPanel's AI extraction pipeline processes the URL in the background
5. Within seconds, locations, tips, warnings, and wisdom are saved to your board

## File Structure

```
browser-extension/
  manifest.json          Chrome MV3 manifest
  background.js          Service worker: keyboard shortcut + context menus
  popup/
    popup.html           Extension popup UI
    popup.js             Popup logic: tab reading, platform detection, save flow
    popup.css            Styles
  options/
    options.html         Settings page
    options.js           Saves app URL to chrome.storage.sync
  icons/
    icon.svg             Source SVG
    icon16.png           16×16 toolbar icon
    icon32.png           32×32
    icon48.png           48×48 (extensions page)
    icon128.png          128×128 (Chrome Web Store)
    generate-icons.js    Regenerate PNGs from SVG
```
