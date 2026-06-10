# TravelPanel Clipper — Browser Extension

One-click clipping from any travel page directly into your TravelPanel boards.

## What it does

- Detects the current tab's URL and title
- Identifies the platform (Instagram, YouTube, 小红书, TikTok, etc.)
- Opens TravelPanel's share flow in a focused popup window to clip the URL
- Works with Chrome, Edge, Arc, and any Chromium-based browser

## Install (developer mode)

1. **Generate icons** (first time only — requires Python 3):
   ```bash
   cd browser-extension/icons
   python3 generate-icons.py
   ```

2. Open `chrome://extensions` in your browser

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** → select the `browser-extension/` folder

5. The TravelPanel pin icon appears in your toolbar

## Configure

Click the gear icon in the popup (or right-click the extension → *Options*) and set your **TravelPanel App URL** — the Vercel deployment URL for your app, e.g. `https://your-app.vercel.app`.

## Keyboard shortcut

| Platform | Shortcut          |
|----------|-------------------|
| Mac      | ⌘ Shift T        |
| Windows  | Alt Shift T       |

Customise at `chrome://extensions/shortcuts`.

## How it works

The extension opens `<your-app>/share?url=<current-url>&title=<page-title>` in a small popup window, reusing the existing iOS-share-sheet flow in the web app. No data is sent by the extension itself — all extraction happens server-side via the `/api/import` endpoint.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome Manifest V3 config |
| `popup.html/js` | Extension popup UI + logic |
| `options.html/js` | Settings page (app URL) |
| `icons/` | Extension icons (16/32/48/128 px) |
| `icons/generate-icons.py` | Regenerate icons (pure Python, no deps) |

## Publishing to Chrome Web Store

1. Run `python3 icons/generate-icons.py` to ensure all icons are present
2. Zip the `browser-extension/` folder contents (not the folder itself)
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Required: 1–5 screenshots (1280×800 or 640×400) and a 128×128 icon

## Safari support

Safari requires a separate native extension wrapper built with Xcode. Once the Chrome extension is stable, use Xcode's **File → New → Project → Safari Web Extension** → import the Chrome extension. The `manifest.json` is compatible with Safari 16+.
