# TravelPanel Clipper — Browser Extension

A Chrome/Firefox extension that clips any travel page into TravelPanel with one click.

## Installation (Chrome / Edge / Brave)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The ✈️ pin icon appears in your toolbar

## Installation (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `browser-extension/manifest.json`

## Setup

Click the gear ⚙️ icon in the popup (or right-click the extension icon → Options) and enter your TravelPanel URL:

| Environment | URL |
|-------------|-----|
| Local dev   | `http://localhost:3000` |
| Vercel      | `https://your-app.vercel.app` |

## How to use

1. **One-click clip**: Navigate to any travel page (Instagram, YouTube, Xiaohongshu, blog…), click the extension icon, click **Clip to TravelPanel**
2. **Context menu**: Right-click any page → **Clip to TravelPanel**
3. **Link clip**: Right-click any link → **Clip this link to TravelPanel**

TravelPanel opens the `/share` page with the URL pre-filled. AI extracts locations, tips, warnings, and travel wisdom automatically.

## Supported Platforms

- Instagram
- YouTube
- 小红书 (Xiaohongshu / xhslink)
- Douyin / TikTok
- Bilibili
- X / Twitter
- TripAdvisor, Airbnb
- Any travel blog or website

## Regenerating Icons

The `icons/` folder contains pre-generated PNG icons. To regenerate:

```bash
npm install pngjs
node generate-icons.js
```

Or replace them with your own 16×16, 48×48, and 128×128 PNG files.

## Building for Production

For a production-signed extension, consider:
- [Chrome Web Store](https://chrome.google.com/webstore/devconsole)
- [Firefox Add-on Hub](https://addons.mozilla.org/developers/)

The extension uses Manifest V3 and requires no additional build step — it's plain HTML/CSS/JS.
