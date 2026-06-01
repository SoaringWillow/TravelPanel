# TravelPanel Browser Extension

Clip travel inspiration from any web page into your TravelPanel boards. Works in Chrome and any Chromium-based browser (Edge, Brave, Arc). Safari support via the Xcode Web Extension converter.

## Features

- **One-click clip** — Click the toolbar icon to save the current page
- **Right-click menu** — Right-click any page or link → "Save to TravelPanel"
- **Platform detection** — Detects Instagram, YouTube, 小红书, TikTok, Bilibili, Douyin, Weibo and shows a badge
- **Smart tab reuse** — If TravelPanel is already open, it navigates that tab instead of opening a new one
- **Configurable URL** — Point the extension at your own deployment, a custom domain, or `localhost:3000` for development

## Install (Chrome / Chromium)

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** → select the `browser-extension/` folder

The TravelPanel icon appears in your toolbar. Pin it for quick access.

## Configure

Click the gear icon (⚙) in the popup, or go to the extension's options page, to set your TravelPanel deployment URL.

Default: `https://travel-panel.vercel.app`

For local dev: `http://localhost:3000`

## How clipping works

1. Click the extension icon (or right-click → "Save to TravelPanel")
2. The extension opens your TravelPanel `/share` page with the URL pre-filled
3. TravelPanel's AI (Claude) extracts locations, tips, warnings, and travel wisdom
4. Pick a board and the clip is saved with full substance extraction

This mirrors the iOS Share Sheet flow exactly — same `/share` page, same AI extraction.

## Regenerate icons

Icons are generated from a pure-Node.js script (no npm deps):

```bash
node scripts/generate-icons.js
```

## Safari

Use Xcode's **Convert Web Extension** tool:

1. Open Xcode → File → New → Project → Safari Extension
2. Select "Convert Existing Extension" and point it at this folder
3. Build and run

## File structure

```
browser-extension/
  manifest.json      — MV3 manifest (Chrome/Edge/Brave/Arc)
  popup.html         — Toolbar popup UI
  popup.css          — Popup styles (dark, TravelPanel design)
  popup.js           — Popup logic (tab query, platform detection, save)
  background.js      — Service worker (context menu, tab management)
  options.html       — Settings page (configure app URL)
  options.js         — Settings logic (chrome.storage.sync)
  icons/
    icon16.png       — Toolbar icon
    icon48.png       — Extension management page icon
    icon128.png      — Chrome Web Store icon
  scripts/
    generate-icons.js — PNG icon generator (pure Node.js)
```
