# TravelPanel Browser Extension

Clip travel inspiration from any web page directly into TravelPanel.

## Features

- **One-click clip** — Save any page to your TravelPanel inbox via the toolbar popup
- **Right-click context menu** — Clip any link or the current page without opening the popup
- **Platform detection** — Automatically identifies YouTube, Instagram, TikTok, Xiaohongshu, etc.
- **Configurable app URL** — Works with local dev, staging, or your deployed Vercel URL
- **Keyboard shortcut** — Set a custom shortcut in `chrome://extensions/shortcuts`

## Install (Development / Sideload)

### Step 1 — Generate icons (one-time, Node.js required)

```bash
cd browser-extension
node generate-icons.js
```

### Step 2 — Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder

### Step 3 — Configure your app URL

1. Click the TravelPanel icon in your toolbar
2. Click the ⚙️ gear icon
3. Enter your TravelPanel URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
4. Click **Save Settings**

## Install (Safari — Mac)

Safari supports WebExtensions via Xcode conversion:

```bash
# Requires Xcode + Safari 14+
xcrun safari-web-extension-converter browser-extension/ \
  --project-location . \
  --app-name TravelPanelClipper \
  --bundle-identifier com.travelpanel.clipper
```

Then open the generated Xcode project, build, and enable the extension in Safari → Settings → Extensions.

## Usage

| Action | How |
|--------|-----|
| Clip current page | Click the toolbar icon → **Clip to TravelPanel** |
| Clip any link | Right-click any link → **Clip link to TravelPanel** |
| Open the app | Click toolbar icon → **Open App** |
| Quick clip (keyboard) | Set shortcut in `chrome://extensions/shortcuts` → look for "TravelPanel Clipper" |

## How it works

Clicking **Clip to TravelPanel** opens the app's `/share?url=...&title=...` page in a new tab. The app's existing share flow handles:

1. Board selection (Inbox or a specific board)
2. AI enrichment via Claude — extracts spots, tips, and hidden wisdom from the page
3. Saving to IndexedDB (local-first)

No credentials are stored in the extension — it's a thin launcher that delegates all logic to your TravelPanel web app.

## File structure

```
browser-extension/
  manifest.json        Chrome Manifest V3
  popup.html           Toolbar popup UI
  popup.css            Popup styles
  popup.js             Popup logic (tab detection, settings, clip action)
  background.js        Service worker (context menus, keyboard shortcut)
  generate-icons.js    One-time icon generator (Node.js, no deps)
  icons/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
```
