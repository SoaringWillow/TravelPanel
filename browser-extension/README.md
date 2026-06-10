# TravelPanel — Browser Extension

A Chrome/Chromium extension that lets you save any travel-related webpage to your TravelPanel boards with one click.

## Quick Start

### 1. Set your app URL

After installing the extension, open **Settings** (⚙ in the popup) and enter your TravelPanel URL:
- Production: `https://your-app.vercel.app`
- Local dev: `http://localhost:3000`

### 2. Load in Chrome (Developer Mode)

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select this `browser-extension/` folder

### Usage

| Method | How |
|---|---|
| **Toolbar button** | Click ✈ while on any webpage → Save to TravelPanel |
| **Right-click page** | Right-click → Save page to TravelPanel |
| **Right-click link** | Right-click a link → Save link to TravelPanel |

The extension opens TravelPanel's share screen in a new tab, where you pick which board to save to. TravelPanel then automatically extracts locations, tips, and travel wisdom from the page.

## Rebuild Icons

Icons are pre-generated in `icons/`. To regenerate (requires Python 3, no extra packages):

```bash
python3 create-icons.py
```

## Safari Extension

To package as a Safari Web Extension:

1. Open Xcode → File → New → Project → Safari Extension App
2. Copy these files into the generated extension target
3. Build and run on macOS/iOS

## File Structure

```
browser-extension/
├── manifest.json       Chrome Manifest V3
├── popup.html          Toolbar popup UI
├── popup.js            Popup logic + platform detection
├── background.js       Service worker — context menus
├── options.html        Settings page
├── options.js          Settings logic
├── create-icons.py     PNG icon generator (stdlib only)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```
