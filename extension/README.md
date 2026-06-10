# TravelPanel Clipper — Browser Extension

Clip travel posts from any website (YouTube, Instagram, TikTok, Xiaohongshu, and more) into your TravelPanel boards with one click. The app AI-extracts location pins, activities, and travel wisdom from the page automatically.

## Features

- **One-click clip** — popup shows current page details + a single "Clip to TravelPanel" button
- **Platform detection** — recognises YouTube, Instagram, TikTok, Twitter/X, Xiaohongshu, Douyin, Bilibili, WeChat, Pinterest, TripAdvisor, Airbnb, Booking.com, Google Maps
- **Keyboard shortcut** — `⌘ Shift S` (Mac) / `Ctrl Shift S` (Win/Linux) clips the page without opening the popup
- **Context menu** — right-click any link or page → "Clip link/page to TravelPanel"
- **Smart tab focus** — if TravelPanel is already open in a tab, the extension focuses it instead of opening a new one
- **Configurable URL** — works with any deployment (local dev, staging, production)

## Installation (Chrome / Edge / Brave)

1. Clone this repo and navigate to the `extension/` directory.
2. Open **chrome://extensions** → enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** → select the `extension/` folder.
4. Click the puzzle-piece icon in the toolbar → pin **TravelPanel Clipper**.
5. Click the extension icon → **Settings** → enter your TravelPanel URL (e.g. `https://your-app.vercel.app`).

## Installation (Safari)

Safari requires wrapping the extension with Xcode. Use Xcodeʼs **"Convert Web Extension"** tool:

```
File → New → Target → Safari Web Extension (from existing)
```

Point it at the `extension/` folder. Build and run; Safari will prompt you to enable it in **Preferences → Extensions**.

## Generating PNG Icons

The manifest references icon PNGs for the browser toolbar. Generate them from the source SVG:

```bash
# requires sharp CLI: npm install -g sharp-cli
cd extension
sharp --input icons/icon.svg --output icons/icon-16.png  --resize 16
sharp --input icons/icon.svg --output icons/icon-48.png  --resize 48
sharp --input icons/icon.svg --output icons/icon-128.png --resize 128
```

Then add to `manifest.json`:

```json
"action": {
  "default_popup": "popup.html",
  "default_title": "Clip to TravelPanel",
  "default_icon": {
    "16":  "icons/icon-16.png",
    "48":  "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
},
"icons": {
  "16":  "icons/icon-16.png",
  "48":  "icons/icon-48.png",
  "128": "icons/icon-128.png"
}
```

## How It Works

When you click "Clip to TravelPanel", the extension:

1. Detects the current tabʼs URL and title.
2. Opens (or focuses) your TravelPanel app at `<appUrl>?import=<encoded-url>`.
3. TravelPanel's import sheet auto-opens, calls `/api/import`, and Claude extracts:
   - GPS-tagged location pins
   - Activities
   - Tags (food, nature, culture…)
   - **Substance layer** — tips, warnings, opinions, wisdom from the post

The clip appears in your Inbox ready to move to a board and include in a trip plan.

## Development

The extension uses Manifest V3 with no build step — plain HTML/CSS/JS. Edit files and reload the extension in `chrome://extensions` to see changes.

```
extension/
├── manifest.json     Manifest V3 config
├── popup.html        Extension popup UI
├── popup.css         Popup styles
├── popup.js          Popup logic + platform detection
├── background.js     Service worker (keyboard shortcut + context menu)
├── options.html      Settings page
├── options.css       Settings styles
├── options.js        Settings logic
└── icons/
    └── icon.svg      Source icon (generate PNGs from this)
```
