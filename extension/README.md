# TravelPanel Clipper — Browser Extension

Save travel inspiration from any web page to TravelPanel in one click.

## Features

- **One-click save** — click the toolbar icon to save the current page
- **Context menu** — right-click any page or link → "Save to TravelPanel"
- **Platform detection** — automatically labels Instagram, YouTube, 小红书, TikTok, Douyin, Bilibili, WeChat clips
- **Configurable URL** — works with localhost (dev) or your deployed Vercel URL

## Install in Chrome (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

The "T" icon will appear in your toolbar. Pin it for quick access.

## Install in Safari (macOS/iOS)

Use Apple's converter tool (requires Xcode):

```bash
xcrun safari-web-extension-converter /path/to/TravelPanel/extension \
  --project-location ~/Desktop \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project, run it, and enable the extension in Safari → Settings → Extensions.

## Configuration

1. Click the gear icon in the popup
2. Set your TravelPanel URL (defaults to `http://localhost:3000`)
3. For production: use your Vercel deployment URL, e.g. `https://travel-panel.vercel.app`

## How it works

Clicking "Save to TravelPanel" opens the `/share` page with the current URL and title pre-filled. TravelPanel then:

1. Saves the clip to your Inbox
2. Runs AI extraction in the background (locations, tips, warnings)
3. Shows the enriched clip in your board view

## Development

The extension has no build step — it's vanilla JS/HTML/CSS (Chrome MV3).

Files:
- `manifest.json` — extension config
- `background.js` — service worker (draws toolbar icon, registers context menus)
- `popup.html/css/js` — toolbar popup UI
- `icons/icon.svg` — source icon (toolbar icon is drawn via Canvas API)
