# TravelPanel Clipper — Browser Extension

Chrome/Safari extension that clips the current page URL into TravelPanel with one click.

## Features

- Detects the current page's title, thumbnail, and platform (Instagram, YouTube, Xiaohongshu, Douyin, Bilibili, WeChat, etc.)
- Opens the TravelPanel share flow with URL pre-filled — no copy-pasting
- Configurable app URL (local dev or deployed Vercel instance)
- Dark UI matching the TravelPanel aesthetic

## Install (Chrome / Arc / Brave)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `browser-extension/` directory
5. Click the extension icon → **Settings** → set your TravelPanel URL

## Configure App URL

After installing, click the extension icon → the gear icon → enter your deployed URL:

| Environment    | URL                                    |
|---------------|----------------------------------------|
| Local dev     | `http://localhost:3000`                |
| Vercel (prod) | `https://your-app.vercel.app`          |

## How It Works

1. Click the extension icon on any travel page
2. The extension reads the page title, URL, and Open Graph thumbnail
3. Click **Save to TravelPanel** → the TravelPanel `/share` page opens with everything pre-filled
4. Pick a board and confirm — Claude extracts substance and locations in the background

## Icons

The bundled icons are solid-color placeholders (`#4f7ef5`). To use a custom icon:

```bash
# Requires imagemagick
convert icon.svg -resize 16x16 icons/icon16.png
convert icon.svg -resize 32x32 icons/icon32.png
convert icon.svg -resize 48x48 icons/icon48.png
convert icon.svg -resize 128x128 icons/icon128.png
```

## Safari (macOS / iOS)

Safari requires converting the Chrome extension via Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

## Files

| File            | Purpose                                   |
|----------------|-------------------------------------------|
| `manifest.json` | Extension manifest (Manifest V3)          |
| `popup.html/css/js` | Extension popup UI                   |
| `background.js` | Service worker (opens options on install) |
| `options.html/js` | Settings page (app URL config)          |
| `icons/`        | Extension icons (PNG, 16/32/48/128px)    |
