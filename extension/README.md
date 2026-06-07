# TravelPanel Clipper — Browser Extension

Chrome (and Chromium-based) extension that saves any travel page to your TravelPanel boards in one click.

## Features

- **One-click clip** — toolbar button opens the TravelPanel share page with the current URL pre-filled
- **Right-click context menu** — "Save to TravelPanel" appears on any page or link
- **Smart tab reuse** — navigates an existing TravelPanel tab instead of opening a new one every time
- **Platform detection** — recognises Instagram, YouTube, Xiaohongshu, TikTok, and more
- **Configurable URL** — point the extension at your own Vercel deployment via the options page

## Install (unpacked / dev mode)

1. **Generate icons** (one-time):
   ```bash
   cd extension
   npm install canvas   # only needed for icon generation
   node generate-icons.js
   ```
   This creates `icons/icon{16,32,48,128}.png`.

2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. The TravelPanel pin icon appears in your toolbar

## Configure your app URL

If you're running TravelPanel at a custom URL, open the extension options:
- Right-click the toolbar icon → **Options**, or
- Chrome → Extensions → TravelPanel Clipper → **Details** → **Extension options**

Paste your Vercel deployment URL (e.g. `https://your-app.vercel.app`) and save.

## File structure

```
extension/
  manifest.json       Chrome Manifest V3
  popup.html/js       Toolbar popup UI
  background.js       Service worker — installs context menu
  options.html/js     Settings page (configure app URL)
  icons/
    icon.svg          Source SVG
    generate-icons.js Script to produce PNG icons
    icon16.png        (generated)
    icon32.png        (generated)
    icon48.png        (generated)
    icon128.png       (generated)
```

## Publish to Chrome Web Store

1. Generate icons (above)
2. Zip the `extension/` folder (exclude `node_modules`, `generate-icons.js`)
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
