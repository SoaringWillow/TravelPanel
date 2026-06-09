# TravelPanel Clipper — Browser Extension

A Chrome/Edge/Brave browser extension that lets you save travel inspiration from any webpage directly to TravelPanel.

## Features

- **One-click save** — click the toolbar icon on any page to clip it to TravelPanel
- **Right-click menu** — "Save to TravelPanel ✈️" appears in the context menu on any page or link
- **Platform detection** — automatically detects Instagram, YouTube, Xiaohongshu, Douyin, Bilibili, WeChat
- **Board picker** — opens the TravelPanel share page so you can choose which board to save to
- **AI extraction** — TravelPanel's Claude-powered extractor pulls out locations, tips, warnings, and local wisdom

## Installation (Chrome / Edge / Brave)

1. Clone or download this repository
2. Open your browser and go to `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `browser-extension/` folder
5. The TravelPanel icon appears in your toolbar — click it and enter your TravelPanel URL

## First-time Setup

1. Click the extension icon
2. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app`)
3. Click **Connect** — that's it

You can change the URL later via the ⚙️ settings icon or right-click the toolbar icon → **Options**.

## Generating Proper Icons

The placeholder icons (1×1 px) are included so the extension loads. Generate proper 128×128px icons:

```bash
# Option 1: Node.js + sharp
cd browser-extension/icons
npm install sharp
node generate-icons.js

# Option 2: Use any SVG→PNG tool with icon.svg
# The icon SVG is written to icons/icon.svg when generate-icons.js runs without sharp
```

## Development

```
browser-extension/
├── manifest.json        MV3 manifest — permissions, background, popup
├── popup.html/css/js    Toolbar popup UI
├── background.js        Service worker — context menu
├── options.html/css/js  Settings page
└── icons/               PNG icons (16, 32, 48, 128px)
```

## How It Works

1. Extension gets the current tab URL + title via the Chrome Tabs API
2. User clicks **Save to TravelPanel** (or uses the context menu)
3. Extension opens `<your-app>/share?url=<url>&title=<title>` in a new tab
4. The TravelPanel share page calls Claude to extract locations, tips, and wisdom
5. User picks a board → clip is saved to their TravelPanel library

## Safari (macOS)

Safari Web Extensions use the same MV3 format. To package for Safari:

```bash
xcrun safari-web-extension-converter browser-extension/ --project-location . --app-name TravelPanelClipper
```

Then open the generated Xcode project, build, and enable the extension in Safari → Preferences → Extensions.
