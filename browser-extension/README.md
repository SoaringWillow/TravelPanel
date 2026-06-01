# TravelPanel Browser Extension

Clip any travel webpage directly into TravelPanel with one click (or ⌘⇧S / Alt⇧S).

## Features

- One-click clipping from any webpage
- Detects travel platforms (Instagram, YouTube, Xiaohongshu, TikTok, Pinterest, TripAdvisor, Google Maps, Airbnb, Booking.com, Viator)
- Optional note/tag attached to the clip
- Keyboard shortcut: **⌘⇧S** (Mac) / **Alt⇧S** (Windows/Linux)
- Configurable TravelPanel URL (supports localhost for dev or any Vercel deployment)
- Opens TravelPanel's `/share` page for AI-powered extraction (locations + substance)

## Installation (Chrome / Brave / Edge / Arc)

```bash
# 1. Generate icons (one time)
node generate-icons.js

# 2. Open chrome://extensions in your browser
# 3. Enable "Developer mode" (top-right toggle)
# 4. Click "Load unpacked"
# 5. Select this directory (browser-extension/)
```

## Installation (Safari)

Use Apple's `safari-web-extension-converter` CLI (requires macOS + Xcode):

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper
# Then open the generated Xcode project and run on device/simulator
```

## Configuration

Click the extension icon → **Settings** to set your TravelPanel URL:

| Environment | URL |
|---|---|
| Local dev   | `http://localhost:3000` |
| Vercel prod | `https://your-app.vercel.app` |
| Custom domain | `https://app.yourdomain.com` |

## How It Works

1. User clicks extension icon (or presses ⌘⇧S)
2. Extension reads current tab URL + title
3. Opens `[YOUR_APP]/share?url=<encoded>&title=<encoded>&note=<optional>`
4. TravelPanel's share page runs AI extraction (Claude) to extract:
   - **Spots**: geographic locations with coordinates
   - **Substance**: tips, warnings, opinions, wisdom from the post

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome Extension Manifest V3 |
| `popup.html/js` | Extension popup UI |
| `background.js` | Service worker (keyboard shortcut handler) |
| `options.html/js` | Settings page |
| `generate-icons.js` | Node.js script to create PNG icons |
| `icons/` | Generated PNG icons (16×16, 48×48, 128×128) |
