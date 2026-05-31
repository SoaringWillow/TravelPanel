# TravelPanel Clipper — Browser Extension

Save travel inspiration from any website to TravelPanel with one click.

## Features

- **One-click clip** — click the toolbar icon to save the current page
- **Right-click menu** — right-click any link or page → "Save to TravelPanel"
- **Platform detection** — auto-labels Instagram, YouTube, Xiaohongshu, TikTok, etc.
- **Instant** — opens TravelPanel's share page in a new tab with URL pre-filled
- **AI extraction** — TravelPanel's Claude AI extracts locations, tips, and wisdom automatically

## Installation (Chrome / Edge / Brave / Arc)

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder
5. The TravelPanel Clipper icon appears in your toolbar (pin it for easy access)

## First-time Setup

1. Click the extension icon → the Settings page opens automatically
2. Enter your TravelPanel app URL (e.g. `https://your-app.vercel.app`)
3. Click **Save**

## How to Use

**Toolbar button:**
1. Browse to any travel inspiration page
2. Click the TravelPanel Clipper icon
3. Click **Save to TravelPanel**
4. The share page opens — pick a board and confirm

**Right-click menu:**
- Right-click a **link** → "Save link to TravelPanel"
- Right-click the **page** → "Save page to TravelPanel"

## Generating Proper PNG Icons

The placeholder icons are single-pixel PNGs (scaled by Chrome). For sharp icons:

```bash
cd browser-extension
npm install sharp
node icons/generate-icons.js
```

This converts `icons/icon.svg` → `icon16.png`, `icon48.png`, `icon128.png`.

## Safari Extension (macOS)

Convert to a Safari Web Extension using Xcode's built-in converter:

```bash
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name "TravelPanel Clipper" \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, select the extension target, and build/run.

## File Structure

```
browser-extension/
├── manifest.json     Chrome MV3 manifest
├── popup.html        Toolbar popup UI
├── popup.js          Popup logic
├── popup.css         Popup styles
├── background.js     Service worker (context menus + dynamic icon)
├── options.html      Settings page
├── options.js        Settings logic
└── icons/
    ├── icon.svg           Master SVG icon
    ├── generate-icons.js  PNG generation script (requires sharp)
    ├── icon16.png         16×16 toolbar icon
    ├── icon48.png         48×48 extension list icon
    └── icon128.png        128×128 Chrome Web Store icon
```

## Permissions

| Permission     | Why                                            |
|---------------|------------------------------------------------|
| `activeTab`   | Read current tab's URL and title               |
| `storage`     | Persist the TravelPanel app URL setting        |
| `contextMenus`| Right-click "Save to TravelPanel" menu items   |
