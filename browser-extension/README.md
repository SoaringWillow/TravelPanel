# TravelPanel Browser Extension

Save travel inspiration from any website to your TravelPanel boards with one click.

## Features

- One-click saving from any web page
- Platform detection (Instagram, YouTube, Xiaohongshu, TikTok, etc.)
- Opens TravelPanel's Save dialog with URL + title pre-filled
- Configurable TravelPanel app URL (works with both production and local dev)

## Installation (Chrome / Edge / Brave)

1. Open **chrome://extensions** (or **edge://extensions**)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Click the TravelPanel icon → **Settings** → enter your TravelPanel app URL
6. Click **Save**

## Installation (Firefox)

1. Open **about:debugging#/runtime/this-firefox**
2. Click **Load Temporary Add-on**
3. Select `browser-extension/manifest.json`
4. Click the TravelPanel icon → **Settings** → enter your TravelPanel app URL

> **Note:** Firefox temporary add-ons are removed when Firefox restarts. For permanent installation, publish to [addons.mozilla.org](https://addons.mozilla.org).

## Configuration

After installing, click the gear icon (⚙️) or go to the extension's **Options** page:

| Setting | Description |
|---|---|
| TravelPanel App URL | Your deployed app URL, e.g. `https://your-app.vercel.app` or `http://localhost:3000` |

## How it works

1. Navigate to any travel page (Instagram post, YouTube video, travel blog, etc.)
2. Click the TravelPanel icon in the browser toolbar
3. See the page title and detected platform
4. Click **Save to TravelPanel**
5. The TravelPanel save dialog opens in a new tab — pick a board and save

The extension uses the same `/share?url=...&title=...` endpoint as the iOS Share Extension, so the clip goes through the same AI enrichment pipeline.

## Regenerating icons

The `icons/` directory contains generated PNGs from `icon.svg`. To regenerate:

```bash
# Using Inkscape
inkscape icon.svg --export-png=icon16.png --export-width=16
inkscape icon.svg --export-png=icon48.png --export-width=48
inkscape icon.svg --export-png=icon128.png --export-width=128
```

Or use any SVG-to-PNG converter.
