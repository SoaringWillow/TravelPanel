# TravelPanel Clipper — Browser Extension

One-click travel inspiration clipper for Chrome and Chromium-based browsers.

## Features

- **Popup clipper** — Click the TravelPanel icon to clip the current page
- **Context menu** — Right-click any page or link → "Clip to TravelPanel"
- **Platform detection** — Shows the source platform (Instagram, YouTube, 小红书, etc.)
- **Board routing** — Opens TravelPanel's save flow where you can choose a board

## Installation (Developer Mode)

1. Clone / download the TravelPanel repo
2. Open **chrome://extensions**
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** and select the `browser-extension/` folder
5. The map-pin icon appears in your toolbar

## First-time setup

Click the gear icon (⚙️) in the popup and enter your TravelPanel URL, e.g.  
`https://your-app.vercel.app`

## How it works

1. Visit any travel blog, Instagram, YouTube, or social post
2. Click the TravelPanel icon
3. Hit **Clip this page**
4. TravelPanel opens in a new tab and extracts:
   - 📍 Locations with GPS coordinates
   - 💡 Tips, warnings, opinions, wisdom (the "substance layer")
   - 🏷 Activity tags

## Permissions used

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `tabs` | Open TravelPanel in a new tab |
| `storage` | Save your configured TravelPanel URL |
| `contextMenus` | Add the right-click "Clip to TravelPanel" option |

## For production use

To publish to the Chrome Web Store, create a production build with PNG icons:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

Reference them in `manifest.json`:
```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
"action": {
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png"
  },
  "default_popup": "popup.html"
}
```

The extension draws its icon dynamically via canvas in `background.js` — this works in developer mode and sidesteps the need for PNG assets during development.
