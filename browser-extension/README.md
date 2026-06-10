# TravelPanel Browser Extension

A Chrome/Edge/Brave extension (Safari-compatible via Xcode converter) that clips any travel inspiration page into your TravelPanel boards with one click.

## Features

- **One-click clip** — click the toolbar icon to save the current page to TravelPanel
- **Right-click menu** — "Clip this page" and "Clip link" context menu items on any page
- **Keyboard shortcut** — `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- **Platform detection** — automatically tags Instagram, YouTube, Xiaohongshu, TikTok, and more
- **Optional note** — add a personal note before clipping
- **Settings** — configure your TravelPanel deployment URL once, then never again

## Installation (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repository

That's it. The TravelPanel pin icon appears in your toolbar.

## First-time setup

1. Click the extension icon → click the **⚙ Settings** gear
2. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
3. Click **Save**

For local development, use `http://localhost:3000`.

## Converting for Safari

Apple's Xcode includes a converter:

```bash
xcrun safari-web-extension-converter /path/to/browser-extension \
  --project-location ./safari-extension \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

## Regenerating icons

```bash
npm install canvas
node generate-icons.js
```

## File structure

```
browser-extension/
  manifest.json     — Manifest V3 (Chrome/Edge/Brave/Opera)
  popup.html        — Extension popup UI
  popup.js          — Popup logic (tab detection, clipping, settings)
  background.js     — Service worker (context menu)
  options.html      — Full settings page (chrome://extensions → Details → Extension options)
  generate-icons.js — Script to regenerate PNG icons
  icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
```
