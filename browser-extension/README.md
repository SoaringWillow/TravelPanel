# TravelPanel Clipper — Browser Extension

Clip any travel inspiration page to your TravelPanel boards in one click.

## Features

- **Popup clip** — click the toolbar icon to clip the current page with a board picker
- **Context menu** — right-click any page or link → "Clip to TravelPanel"
- **Platform detection** — automatically recognises Instagram, YouTube, TikTok, Xiaohongshu, Weibo, Douyin, and Bilibili
- **Programmatic icon** — no PNG files needed; drawn at runtime with OffscreenCanvas
- **Safari compatible** — same codebase, packaged via Xcode's Web Extensions target

## Installation (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Click the extensions puzzle-piece icon → pin TravelPanel Clipper
6. Click the icon → **Configure now** → enter your TravelPanel URL (e.g. `https://travelpanel.vercel.app`)

## Installation (Safari)

Safari requires the extension to be wrapped in a native app. Use Xcode's **File → New → Project → Safari Web Extension** template and copy this folder's contents into the `Resources/` folder it generates.

See [Apple's docs](https://developer.apple.com/documentation/safariservices/converting_a_web_extension_for_safari) for the full conversion guide.

## How the clip flow works

1. The extension reads the current tab URL + title
2. On click, it opens `<your-travelpanel-url>/share?url=<encoded-url>&title=<encoded-title>`
3. TravelPanel's Share page saves the item and runs Claude AI enrichment in the background
4. The enriched clip (locations + wisdom) appears in your chosen board

## Structure

```
manifest.json     — Chrome Manifest V3
background.js     — Service worker: icon rendering + context menu
popup.html/css/js — Toolbar popup UI
options.html/js   — Settings page (configure TravelPanel URL)
```

## Updating

When TravelPanel is updated, re-load the extension from `chrome://extensions` → click the reload icon next to TravelPanel Clipper. No rebuild step needed — this is a plain JS extension.
