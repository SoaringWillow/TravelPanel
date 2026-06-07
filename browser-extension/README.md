# TravelPanel Clipper — Browser Extension

Save any travel post to TravelPanel with one click. Works with Instagram, YouTube, TikTok, 小红书, 抖音, Bilibili, Weibo, Pinterest, travel blogs, and any URL.

## Features

- **One-click clip**: Click the toolbar icon on any travel post to save it
- **Preview save**: Opens TravelPanel with a full extraction preview (Claude extracts spots + wisdom before confirming)
- **Quick save**: Saves immediately to your Inbox for background enrichment — no waiting
- **Context menu**: Right-click any link or page → "Save to TravelPanel" (saves without navigating away)
- **Platform detection**: Recognizes 13 travel/social platforms and shows a badge in the popup

## Installation

### Chrome / Arc / Brave (Developer Mode)
1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. The TravelPanel icon appears in your toolbar (pin it for easy access)

### Firefox (Temporary)
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Navigate to `browser-extension/` and select `manifest.json`

### Firefox (Permanent, via AMO)
Package with `web-ext build` and submit to [addons.mozilla.org](https://addons.mozilla.org).

### Safari (macOS)
```bash
xcrun safari-web-extension-converter browser-extension/ --project-location ./safari-ext
# Open generated Xcode project → Product → Archive → Distribute
```

## First-Time Setup

1. Click the TravelPanel icon in your toolbar
2. If it shows "Set your TravelPanel URL", click **Open Settings**
3. Paste your deployed app URL (e.g., `https://your-app.vercel.app`)
4. Click **Save** — you're ready to clip

## How It Works

| Button | What happens |
|---|---|
| **Save to TravelPanel** | Opens `/?import=<url>` — Claude extracts the post, you review locations + wisdom, then confirm save |
| **Quick Save** | Opens `/share?url=<url>&title=<title>` — saves instantly to Inbox, background enrichment runs |
| **Right-click → Save to TravelPanel** | Same as "Save to TravelPanel", without leaving the current tab |

## Packaging for Production (PNG Icons)

Chrome Web Store requires PNG icons. Convert the SVG:

```bash
# Requires ImageMagick: brew install imagemagick
cd browser-extension/icons
convert -background none icon.svg -resize 16x16   icon16.png
convert -background none icon.svg -resize 32x32   icon32.png
convert -background none icon.svg -resize 48x48   icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

Then update `manifest.json`:

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

## Permissions Explained

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title for clipping |
| `storage` | Persist your TravelPanel app URL setting |
| `contextMenus` | Add "Save to TravelPanel" to the right-click menu |
