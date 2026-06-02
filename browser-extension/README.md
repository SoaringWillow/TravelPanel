# TravelPanel Clipper — Browser Extension

Save travel inspiration from any website into TravelPanel with one click.
AI extracts spots AND wisdom (tips, warnings, opinions) from the page.

## Features

- **Clip any page** — YouTube travel vlogs, Instagram posts, Xiaohongshu, blogs, anything
- **Platform detection** — recognises Xiaohongshu, Douyin/TikTok, Bilibili, WeChat, YouTube, Instagram
- **Quick Save** — calls TravelPanel AI inline; shows extracted spots + wisdom count in the popup
- **Choose Board** — opens the full TravelPanel save flow with board selection
- **Context menu** — right-click any link or page → "Save to TravelPanel"
- **Auto-sync** — clips saved via Quick Save appear in your Inbox the next time TravelPanel loads

## Installation (Chrome / Edge / Brave)

1. Clone or download this repository
2. Generate the icons (requires Python 3):
   ```bash
   python3 browser-extension/icons/generate-icons.py
   ```
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** → select the `browser-extension/` folder
6. Click the extension icon → **Settings** → enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)

## Installation (Safari — macOS)

Convert the Manifest V3 extension to a Safari Web Extension using Xcode:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location ~/Desktop \
  --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.

## Configuration

Open the extension options (gear icon in the popup, or right-click the toolbar icon → Options):

| Setting | Description |
|---|---|
| **TravelPanel URL** | Your deployed app URL, e.g. `https://travelpanel.vercel.app` |

## How the sync works

1. **Quick Save** → the extension calls `/api/import` directly and stores the enriched clip in `chrome.storage.local`
2. When you next open TravelPanel, a content script detects the app and bridges the pending clips via `postMessage`
3. The web app's `ExtensionBridge` component receives the clips and saves them to IndexedDB

This means Quick Save is instant (no tab switching) and the clip shows up in your Inbox on the next app visit.

## File structure

```
browser-extension/
├── manifest.json        — Manifest V3 extension config
├── popup.html/css/js    — Extension popup UI
├── background.js        — Service worker (context menu)
├── content-script.js    — Bridges pending clips to TravelPanel pages
├── options.html/js      — Settings page
└── icons/
    ├── icon16.png
    ├── icon48.png
    ├── icon128.png
    └── generate-icons.py
```
