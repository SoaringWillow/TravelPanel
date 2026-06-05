# TravelPanel Clipper — Browser Extension

A Chrome/Edge/Brave browser extension (Manifest V3) that clips any travel URL into your TravelPanel boards with one click.

## Features

- **One-click clip**: Click the toolbar icon to save the current page to TravelPanel
- **Context menu**: Right-click any link or page → "Save to TravelPanel"
- **Platform detection**: Recognises Instagram, YouTube, 小红书, TikTok, Bilibili, Pinterest
- **Safari compatible**: Convert to Safari Web Extension with `xcrun safari-web-extension-converter`

## Installation (Chrome / Edge / Brave)

### 1. Generate icons

```bash
cd extension
node generate-icons.js
```

This creates `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`.

### 2. Load as unpacked extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 3. Configure your app URL

1. Click the TravelPanel extension icon in the toolbar
2. If not yet configured, click **Configure TravelPanel URL →**
3. Enter your Vercel deployment URL (e.g. `https://your-app.vercel.app`)
4. Click **Save Settings**

## Usage

**Clip current page:**
- Click the **T** extension icon → click **Save to TravelPanel**
- A new tab opens at `/share?url=...` where you can pick a board

**Clip a link:**
- Right-click any link → **Save link to TravelPanel**

## Safari (macOS/iOS)

Convert the extension using Apple's tool (requires Xcode 12+):

```bash
xcrun safari-web-extension-converter extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper"
```

Then open the generated Xcode project and build/run for macOS or iOS.

## File Structure

```
extension/
├── manifest.json          # Chrome MV3 manifest
├── popup.html             # Toolbar popup UI
├── popup.css              # Popup styles
├── popup.js               # Popup logic (platform detection, save flow)
├── background.js          # Service worker (context menu handler)
├── options.html           # Settings page
├── options.js             # Settings logic
├── generate-icons.js      # PNG icon generator (Node.js, no deps)
└── icons/                 # Generated PNG icons (run generate-icons.js)
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## How it works

The extension opens your TravelPanel app at `/share?url=<page-url>&title=<page-title>`. The app's existing share page handles everything from there: it saves the item to IndexedDB and triggers AI extraction (Claude) in the background to pull out locations and substance (tips, warnings, opinions).

No API keys or backend changes needed — the extension is purely a bridge to your app's existing share flow.
