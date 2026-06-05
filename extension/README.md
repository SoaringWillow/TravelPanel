# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any webpage into TravelPanel with a single click.

## Features

- **One-click clipping** — click the toolbar icon on any page to open TravelPanel's share flow
- **Right-click menu** — right-click any page or link → "Clip to TravelPanel"
- **Platform detection** — recognizes WeChat, 小红书, 抖音, Bilibili, Instagram, YouTube
- **Configurable URL** — point the extension at your own TravelPanel deployment

## Install (Chrome / Edge / Arc)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Click the TravelPanel pin icon in the toolbar
6. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app`) and click **Connect**

## Install (Safari — macOS)

Safari requires wrapping the extension in a native app via Xcode:

1. Install Xcode (from the Mac App Store)
2. Run: `xcrun safari-web-extension-converter /path/to/extension`
3. Open the generated Xcode project → Product → Run
4. In Safari → Preferences → Extensions, enable "TravelPanel Clipper"

## How it works

When you click **Clip to TravelPanel**, the extension opens a new tab at:

```
<your-travelpanel-url>/share?url=<encoded-page-url>&title=<encoded-title>
```

TravelPanel's `/share` page then:
1. Calls Claude (via `/api/import`) to extract locations and wisdom from the URL
2. Lets you choose which board to save to
3. Saves the clip with full substance extraction (tips, warnings, opinions)

## Regenerate icons

```bash
node extension/generate-icons.js
```

## File structure

```
extension/
  manifest.json       Chrome Manifest V3
  popup.html/css/js   Toolbar popup UI
  background.js       Service worker — handles right-click context menu
  generate-icons.js   Script to regenerate PNG icons (no dependencies)
  icons/
    icon16.png
    icon48.png
    icon128.png
```
