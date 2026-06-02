# TravelPanel Clipper — Browser Extension

Save travel inspiration from any webpage to TravelPanel with one click.

## Features

- One-click save from any browser tab
- Detects travel platforms (Instagram, YouTube, TikTok, Xiaohongshu, etc.) and shows a platform chip
- Opens the TravelPanel share page with the URL pre-filled — the AI extracts locations and wisdom automatically
- Configurable app URL (works with self-hosted or local dev instances)

## Installation (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The ✈ icon appears in your toolbar

> **Pin it**: Click the puzzle-piece icon in Chrome → pin TravelPanel Clipper so it's always visible.

## Installation (Safari)

Safari requires converting the extension using Xcode's extension converter tool. See [Apple's guide](https://developer.apple.com/documentation/safariservices/converting_a_web_extension_for_safari).

```bash
xcrun safari-web-extension-converter browser-extension/ --project-location . --app-name TravelPanelClipper
```

Then open the generated Xcode project, build for your device, and enable the extension in Safari → Settings → Extensions.

## Configuration

Click ⚙ in the popup (or right-click the toolbar icon → Options) to set your TravelPanel app URL.

| Environment | URL |
|---|---|
| Hosted (default) | `https://travel-panel.vercel.app` |
| Local dev | `http://localhost:3000` |
| Custom Vercel | `https://your-project.vercel.app` |

## Generating proper icons

The bundled icons are solid indigo squares used as placeholders. To generate high-quality icons from the SVG source:

```bash
npm install sharp
node browser-extension/icons/generate-icons.js
```

## How it works

1. Click the extension icon on any travel page
2. The popup shows the page title, URL, and detected platform
3. Click **Save to TravelPanel** — the TravelPanel `/share` page opens in a new tab
4. Choose a board; the AI extracts locations + travel wisdom in the background

The clip flow is identical to the iOS Share Sheet — same extraction engine, same board picker.
