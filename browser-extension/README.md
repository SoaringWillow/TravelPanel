# TravelPanel Clipper — Browser Extension

Clip travel inspiration from any website to TravelPanel with one click.  
Claude AI automatically extracts locations, tips, warnings, and wisdom from the page.

## Features

- **One-click clipping** — click the toolbar icon to send any page to TravelPanel
- **Right-click menu** — clip the current page or any link via context menu
- **Platform detection** — recognises YouTube, Instagram, 小红书, Douyin, Bilibili, TikTok, TripAdvisor, Airbnb, and more
- **Keyboard shortcut** — `⌘ Shift S` (Mac) / `Ctrl Shift S` (Windows/Linux)
- **Configurable URL** — works with self-hosted Vercel deployments

## Installation — Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder from this repo
5. Pin the extension to your toolbar

## Installation — Safari (macOS / iOS)

Safari requires the extension to be wrapped in an Xcode project.

```bash
# Requires Xcode 14+ and Command Line Tools
xcrun safari-web-extension-converter browser-extension/ \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper \
  --swift

# Open the generated Xcode project, then:
# Product → Run (installs to your Mac)
# Enable in Safari → Settings → Extensions → TravelPanel Clipper
```

For iOS distribution, archive and distribute via TestFlight or the App Store.

## Configuration

Click the **⚙** gear icon in the popup to open Settings.

| Setting | Default | Description |
|---------|---------|-------------|
| TravelPanel URL | `https://travelpanel.app` | Your app deployment URL |

If you're running locally: set to `http://localhost:3000`.  
If you have a custom Vercel domain: set to your domain URL.

## How it works

1. Click the extension icon (or press `⌘ Shift S`)
2. The popup shows the current page title and detected platform
3. Click **✈ Clip this page**
4. TravelPanel opens in a new tab at `/share?url=…&title=…`
5. Claude AI extracts locations and wisdom; you choose which board to save to

## Regenerating icons

```bash
python3 browser-extension/generate-icons.py
```

To use custom icons, replace the files in `browser-extension/icons/` with your own 16×16, 32×32, 48×48, and 128×128 PNG files.

## File structure

```
browser-extension/
├── manifest.json      Manifest V3 (Chrome + Safari MV3)
├── popup.html         Toolbar popup UI
├── popup.js           Popup logic
├── background.js      Service worker + context menu
├── options.html       Settings page
├── options.js         Settings logic
├── generate-icons.py  Python script to regenerate PNG icons
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```
