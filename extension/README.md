# TravelPanel Clipper — Browser Extension

A Chrome/Edge extension that saves travel posts from any website into your TravelPanel boards with one click.

## What it does

- **Toolbar button**: Click the TravelPanel icon to clip the current page
- **Right-click menu**: Right-click any page or link → "Save to TravelPanel"
- **Platform detection**: Automatically recognises Instagram, YouTube, TikTok, Xiaohongshu, Douyin, Bilibili, WeChat, and more
- **Configurable**: Set your TravelPanel URL (local dev or deployed Vercel URL) via the Settings page

## Install in Chrome / Edge (Developer Mode)

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

The TravelPanel icon will appear in your toolbar.

## Configuration

Click the ⚙️ gear icon in the popup, or right-click the extension icon → **Options**.

Set **TravelPanel URL** to:
- `http://localhost:3000` for local development (default)
- Your Vercel deployment URL for production (e.g. `https://your-app.vercel.app`)

## Safari (macOS)

Use Apple's `safari-web-extension-converter` to convert this extension:

```bash
xcrun safari-web-extension-converter ./extension --project-location ./ios/App --app-name TravelPanel
```

Then build the generated Xcode project and enable the extension in Safari → Preferences → Extensions.

## How clipping works

1. Extension sends the page URL + title to `POST /share` on your TravelPanel instance
2. TravelPanel's share page shows your boards for selection
3. Claude extracts locations, tips, and wisdom from the URL in the background
4. The clip appears in your chosen board with full substance data

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome Extension Manifest V3 |
| `popup.html/js` | Toolbar popup UI |
| `background.js` | Service worker + context menu + canvas icon |
| `options.html/js` | Settings page (TravelPanel URL) |
