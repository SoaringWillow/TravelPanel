# TravelPanel Clipper — Browser Extension

One-click Chrome/Edge extension to save any travel page to TravelPanel. Sends the URL straight to
the TravelPanel share flow, where Claude extracts locations and wisdom automatically.

## Features

- **Toolbar popup** — shows the page title, auto-detected platform badge, and a "Save" button
- **Right-click context menu** — "Clip this page" and "Clip this link" on any element
- **Badge warning** — toolbar icon shows a red `!` until you configure your TravelPanel URL
- **Platform detection** — WeChat, 小红书 Xiaohongshu, Douyin, Bilibili, or generic Web

## Install (Developer / Sideload)

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked** and select the `browser-extension/` folder
4. The TravelPanel icon appears in the toolbar

> For Edge: navigate to `edge://extensions` and follow the same steps.

## First-time setup

1. Click the TravelPanel toolbar icon
2. Click the gear icon ⚙️ (or click **Open Settings**)
3. Enter your TravelPanel URL, e.g. `https://your-app.vercel.app` or `http://localhost:3000`
4. Click **Save Settings**

## Usage

**From the popup:**
1. Navigate to any travel page (blog post, Xiaohongshu reel, YouTube travel video, etc.)
2. Click the TravelPanel toolbar icon
3. Click **Save to TravelPanel**
4. The TravelPanel share page opens in a new tab — choose a board and save

**From the context menu:**
- Right-click anywhere on a page → **Clip this page to TravelPanel**
- Right-click any link → **Clip this link to TravelPanel**

## Packing for distribution

```bash
# From the browser-extension/ directory
zip -r travelpanel-clipper.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

Upload `travelpanel-clipper.zip` to the Chrome Web Store or distribute as a sideloaded `.crx`.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 extension config |
| `popup.html/js` | Toolbar popup UI |
| `options.html/js` | Settings page (configure TravelPanel URL) |
| `background.js` | Service worker — context menus + badge state |
| `icons/` | 16 / 32 / 48 / 128 px PNG icons |
